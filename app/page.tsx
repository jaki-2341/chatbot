'use client';

import { useState } from 'react';
import Header from './components/header';
import Dashboard from './components/dashboard';
import Builder from './components/builder';
import EmbedModal from './components/embed-modal';
import { Bot } from './types/bot';
import { useBots } from './hooks/use-bots';

type View = 'dashboard' | 'builder';

export default function Home() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [editingBot, setEditingBot] = useState<Bot | undefined>();
  const [embedModalBot, setEmbedModalBot] = useState<Bot | null>(null);
  const { createBot, updateBot, getBot } = useBots();

  const handleNavigateToBuilder = async (bot?: Bot) => {
    if (bot) {
      // Editing existing bot
      setEditingBot(bot);
      setCurrentView('builder');
    } else {
      // Creating new bot - auto-create it immediately
      try {
        const newBot: Bot = {
          id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: 'New Chatbot',
          agentName: 'Agent',
          welcomeMessage: 'Hello! How can I help you?',
          primaryColor: '#3B82F6',
          position: 'bottom-right',
          knowledgeBase: '',
          status: 'Inactive',
          widgetIcon: 'message-circle',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Create bot in database
        const savedBot = await createBot(newBot);
        
        // Navigate to builder with the newly created bot
        setEditingBot(savedBot);
        setCurrentView('builder');
      } catch (error) {
        console.error('Error creating new bot:', error);
        alert('Failed to create new chatbot. Please try again.');
      }
    }
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setEditingBot(undefined);
  };

  const handleSaveBot = async (bot: Bot): Promise<Bot | null> => {
    try {
      const existingBot = getBot(bot.id);
      let savedBot: Bot;

      if (existingBot) {
        savedBot = await updateBot(bot.id, bot);
      } else {
        savedBot = await createBot(bot);
      }

      // Upload any pending files (File objects that haven't been uploaded yet)
      const pendingFiles = (bot.files || []).filter((f): f is File => f instanceof File);
      if (pendingFiles.length > 0 && savedBot.id) {
        try {
          const formData = new FormData();
          pendingFiles.forEach((file) => {
            formData.append('files', file);
          });

          const uploadResponse = await fetch(`/api/bots/${savedBot.id}/files`, {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            const error = await uploadResponse.json();
            console.error('File upload error:', error);
            // Don't fail the save, just log the error
          }
        } catch (uploadError) {
          console.error('Error uploading files:', uploadError);
          // Don't fail the save, just log the error
        }
      }

      // Update the editing bot state with the saved version
      setEditingBot(savedBot);
      return savedBot;
    } catch (error) {
      alert('Failed to save bot. Please try again.');
      console.error('Save error:', error);
      return null;
    }
  };

  const handleShowEmbed = (bot: Bot) => {
    setEmbedModalBot(bot);
  };

  return (
    <div className="bg-slate-50 text-slate-800 h-screen flex flex-col overflow-hidden">
      {currentView === 'dashboard' && <Header />}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {currentView === 'dashboard' ? (
          <Dashboard
            onNavigateToBuilder={handleNavigateToBuilder}
            onShowEmbed={handleShowEmbed}
          />
        ) : (
          <Builder bot={editingBot} onBack={handleBackToDashboard} onSave={handleSaveBot} />
        )}
    </main>
      {embedModalBot && (
        <EmbedModal bot={embedModalBot} onClose={() => setEmbedModalBot(null)} />
      )}
    </div>
  );
}
