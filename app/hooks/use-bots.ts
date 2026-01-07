'use client';

import { useState, useEffect } from 'react';
import { Bot, INITIAL_BOTS } from '@/app/types/bot';

export function useBots() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch bots from MongoDB API
  useEffect(() => {
    const fetchBots = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/bots');
        
        if (!response.ok) {
          throw new Error('Failed to fetch bots');
        }
        
        const data = await response.json();
        setBots(data.bots || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching bots:', err);
        setError((err as Error).message);
        // Fallback to initial bots if API fails
        setBots(INITIAL_BOTS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBots();
  }, []);

  const createBot = async (bot: Bot) => {
    try {
      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bot),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create bot');
      }

      const data = await response.json();
      setBots((prev) => [...prev, data.bot]);
      return data.bot;
    } catch (err) {
      console.error('Error creating bot:', err);
      throw err;
    }
  };

  const updateBot = async (id: string, updates: Partial<Bot>) => {
    try {
      const response = await fetch(`/api/bots/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update bot');
      }

      const data = await response.json();
      setBots((prev) =>
        prev.map((bot) => (bot.id === id ? data.bot : bot))
      );
      return data.bot;
    } catch (err) {
      console.error('Error updating bot:', err);
      throw err;
    }
  };

  const deleteBot = async (id: string) => {
    try {
      const response = await fetch(`/api/bots/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete bot');
      }

      setBots((prev) => prev.filter((bot) => bot.id !== id));
    } catch (err) {
      console.error('Error deleting bot:', err);
      throw err;
    }
  };

  const getBot = (id: string) => {
    return bots.find((bot) => bot.id === id);
  };

  return {
    bots,
    isLoading,
    error,
    createBot,
    updateBot,
    deleteBot,
    getBot,
  };
}

