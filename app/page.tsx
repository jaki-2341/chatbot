'use client';

import { useState } from 'react';
import Header from './components/header';
import Dashboard from './components/dashboard';
import Builder from './components/builder';
import EmbedModal from './components/embed-modal';
import TemplateSelectionPanel from './components/template-selection-panel';
import Login from './components/login';
import { Bot } from './types/bot';
import { useBots } from './hooks/use-bots';
import { useAuth } from './contexts/auth-context';
import { BotTemplate } from './templates/bot-templates';

type View = 'dashboard' | 'builder';

export default function Home() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [editingBot, setEditingBot] = useState<Bot | undefined>();
  const [embedModalBot, setEmbedModalBot] = useState<Bot | null>(null);
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const { createBot, updateBot, getBot } = useBots();

  const handleNavigateToBuilder = async (bot?: Bot) => {
    if (bot) {
      // Editing existing bot
      setEditingBot(bot);
      setCurrentView('builder');
    } else {
      // Creating new bot - show template selection panel
      setShowTemplatePanel(true);
    }
  };

  const handleTemplateSelect = async (template: BotTemplate, clientName: string, assistantName: string) => {
    try {
      const newBot: Bot = {
        id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: clientName || template.config.name || 'New Chatbot',
        agentName: assistantName || template.config.agentName || 'Agent',
        welcomeMessage: template.config.welcomeMessage || 'Hello! How can I help you?',
        primaryColor: template.config.primaryColor || '#3B82F6',
        position: template.config.position || 'bottom-right',
        knowledgeBase: template.config.knowledgeBase || '',
        status: 'Inactive',
        widgetIcon: template.config.widgetIcon || 'message-circle',
        role: template.config.role,
        inputPlaceholder: template.config.inputPlaceholder,
        suggestedQuestions: template.config.suggestedQuestions,
        collectInfoEnabled: template.config.collectInfoEnabled,
        collectName: template.config.collectName,
        collectEmail: template.config.collectEmail,
        collectPhone: template.config.collectPhone,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create bot in database
      const savedBot = await createBot(newBot);
      
      // Close panel and navigate to builder
      setShowTemplatePanel(false);
      setEditingBot(savedBot);
      setCurrentView('builder');
    } catch (error) {
      console.error('Error creating new bot:', error);
      alert('Failed to create new chatbot. Please try again.');
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

  const handleLoginSuccess = () => {
    login();
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="bg-slate-50 text-slate-800 h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

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
      <TemplateSelectionPanel
        isOpen={showTemplatePanel}
        onClose={() => setShowTemplatePanel(false)}
        onSelectTemplate={handleTemplateSelect}
      />
    </div>
  );
}
