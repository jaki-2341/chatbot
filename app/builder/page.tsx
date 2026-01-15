'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Builder from '@/app/components/builder';
import EmbedModal from '@/app/components/embed-modal';
import TemplateSelectionPanel from '@/app/components/template-selection-panel';
import { Bot } from '@/app/types/bot';
import { BotTemplate } from '@/app/templates/bot-templates';
import { useBots } from '@/app/hooks/use-bots';
import { useAuth } from '@/app/contexts/auth-context';
import Login from '@/app/components/login';

export default function NewBuilderPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login } = useAuth();
  const { createBot, updateBot, getBot } = useBots();
  const [editingBot, setEditingBot] = useState<Bot | undefined>(undefined);
  const [embedModalBot, setEmbedModalBot] = useState<Bot | null>(null);
  const [showTemplatePanel, setShowTemplatePanel] = useState(true);

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
      
      // Close panel and navigate to builder with bot ID
      setShowTemplatePanel(false);
      setEditingBot(savedBot);
      // Navigate to the builder route with bot ID
      router.push(`/builder/${savedBot.id}`);
    } catch (error) {
      console.error('Error creating new bot:', error);
      alert('Failed to create new chatbot. Please try again.');
    }
  };

  const handleBack = () => {
    router.push('/');
  };

  const handleSave = async (bot: Bot): Promise<Bot | null> => {
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
          }
        } catch (uploadError) {
          console.error('Error uploading files:', uploadError);
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

  const handleLoginSuccess = (userData?: any) => {
    login(userData);
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
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {showTemplatePanel ? (
          <TemplateSelectionPanel
            isOpen={showTemplatePanel}
            onClose={() => router.push('/')}
            onSelectTemplate={handleTemplateSelect}
          />
        ) : editingBot ? (
          <Builder bot={editingBot} onBack={handleBack} onSave={handleSave} />
        ) : null}
      </main>
      {embedModalBot && (
        <EmbedModal bot={embedModalBot} onClose={() => setEmbedModalBot(null)} />
      )}
    </div>
  );
}
