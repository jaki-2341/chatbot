'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Builder from '@/app/components/builder';
import EmbedModal from '@/app/components/embed-modal';
import { Bot } from '@/app/types/bot';
import { useBots } from '@/app/hooks/use-bots';
import { useAuth } from '@/app/contexts/auth-context';
import Login from '@/app/components/login';

export default function BuilderPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading, login } = useAuth();
  const { getBot, updateBot, createBot } = useBots();
  const [bot, setBot] = useState<Bot | undefined>(undefined);
  const [isLoadingBot, setIsLoadingBot] = useState(true);
  const [embedModalBot, setEmbedModalBot] = useState<Bot | null>(null);

  const botId = params?.id as string;

  // Load bot data from database
  useEffect(() => {
    if (!isAuthenticated || !botId) return;

    const loadBot = async () => {
      try {
        setIsLoadingBot(true);
        const response = await fetch(`/api/bots/${botId}`);
        if (response.ok) {
          const data = await response.json();
          setBot(data.bot);
        } else {
          // Bot not found, redirect to dashboard
          router.push('/');
        }
      } catch (error) {
        console.error('Error loading bot:', error);
        router.push('/');
      } finally {
        setIsLoadingBot(false);
      }
    };

    loadBot();
  }, [botId, isAuthenticated, router]);

  const handleBack = () => {
    router.push('/');
  };

  const handleSave = async (botToSave: Bot): Promise<Bot | null> => {
    try {
      const existingBot = getBot(botToSave.id);
      let savedBot: Bot;

      if (existingBot) {
        savedBot = await updateBot(botToSave.id, botToSave);
      } else {
        savedBot = await createBot(botToSave);
      }

      // Upload any pending files (File objects that haven't been uploaded yet)
      const pendingFiles = (botToSave.files || []).filter((f): f is File => f instanceof File);
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

      // Update the bot state with the saved version
      setBot(savedBot);
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

  // Show loading while fetching bot
  if (isLoadingBot) {
    return (
      <div className="bg-slate-50 text-slate-800 h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-slate-600">Loading bot...</p>
        </div>
      </div>
    );
  }

  // Show builder if bot is loaded
  return (
    <div className="bg-slate-50 text-slate-800 h-screen flex flex-col overflow-hidden">
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <Builder bot={bot} onBack={handleBack} onSave={handleSave} />
      </main>
      {embedModalBot && (
        <EmbedModal bot={embedModalBot} onClose={() => setEmbedModalBot(null)} />
      )}
    </div>
  );
}
