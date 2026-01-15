'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bot } from '@/app/types/bot';
import { Plus, MessageSquare, Search, Filter } from 'lucide-react';
import BotCard from './bot-card';
import { useBots } from '@/app/hooks/use-bots';

interface DashboardProps {
  onShowEmbed: (bot: Bot) => void;
  onNewChatbot?: () => void;
}

export default function Dashboard({ onShowEmbed, onNewChatbot }: DashboardProps) {
  const router = useRouter();
  const { bots: botsFromHook, deleteBot, updateBot, isLoading } = useBots();
  const [bots, setBots] = useState<Bot[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Sync local bots state with hook's bots
  useEffect(() => {
    setBots(botsFromHook);
  }, [botsFromHook]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this chatbot?')) {
      try {
        await deleteBot(id);
        if (activeMenuId === `menu-${id}`) {
          setActiveMenuId(null);
        }
      } catch (error) {
        alert('Failed to delete bot. Please try again.');
        console.error('Delete error:', error);
      }
    }
  };

  const handleToggleStatus = async (id: string) => {
    const bot = bots.find(b => b.id === id);
    if (!bot) return;
    
    const newStatus = bot.status === 'Active' ? 'Inactive' : 'Active';
    const previousBots = [...bots];
    
    // Optimistic update - update UI immediately for instant feedback
    setBots((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
    );
    
    try {
      await updateBot(id, { status: newStatus });
    } catch (error) {
      console.error('Error updating bot status:', error);
      // Revert to previous state on error
      setBots(previousBots);
      alert('Failed to update bot status. Please try again.');
    }
  };

  const filteredBots = useMemo(() => {
    if (!searchQuery.trim()) return bots;
    const query = searchQuery.toLowerCase();
    return bots.filter(bot => 
      bot.name.toLowerCase().includes(query) ||
      bot.agentName.toLowerCase().includes(query) ||
      bot.id.toLowerCase().includes(query)
    );
  }, [bots, searchQuery]);

  // Calculate knowledge base size for each bot
  const getKnowledgeBaseSize = (bot: Bot) => {
    const fileCount = bot.files?.length || 0;
    const hasText = bot.knowledgeBase && bot.knowledgeBase.trim().length > 0;
    const total = fileCount + (hasText ? 1 : 0);
    return total === 0 ? '0 Sources' : `${total} ${total === 1 ? 'Source' : 'Sources'}`;
  };

  return (
    <main className="flex-1 overflow-y-auto pt-8 md:pt-12 px-0 md:px-1 pb-0 md:pb-1 w-full">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Chatbots</h1>
            <p className="text-slate-500 mt-1">Manage your AI assistants and monitor their performance.</p>
          </div>
          <button
            onClick={() => onNewChatbot ? onNewChatbot() : router.push('/builder')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            New Chatbot
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search chatbots..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            />
          </div>
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        {/* Chatbot Grid */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-slate-500 mt-4">Loading chatbots...</p>
          </div>
        ) : filteredBots.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900">
              {searchQuery ? 'No chatbots found' : 'No chatbots yet'}
            </h3>
            <p className="text-slate-500 mb-6">
              {searchQuery ? 'Try a different search term' : 'Create your first widget to get started.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => onNewChatbot ? onNewChatbot() : router.push('/builder')}
                className="text-blue-600 font-medium hover:underline"
              >
                Create one now
              </button>
            )}
          </div>
        ) : (
          <div id="bot-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
            {filteredBots.map((bot) => (
              <BotCard
                key={bot.id}
                bot={bot}
                onEdit={(bot) => router.push(`/builder/${bot.id}`)}
                onDelete={handleDelete}
                onShowEmbed={onShowEmbed}
                onToggleStatus={handleToggleStatus}
                activeMenuId={activeMenuId}
                onToggleMenu={setActiveMenuId}
                knowledgeBaseSize={getKnowledgeBaseSize(bot)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

