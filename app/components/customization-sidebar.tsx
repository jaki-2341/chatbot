'use client';

import { useState } from 'react';
import { Bot } from '@/app/types/bot';
import { ConfigSection } from './customization/config-section';
import { KnowledgeSection } from './customization/knowledge-section';
import { AppearanceSection } from './customization/appearance-section';

interface CustomizationSidebarProps {
  bot: Bot;
  savedBot: Bot | null;
  onBotChange: (updates: Partial<Bot>) => void;
  onBack: () => void;
  onSave: () => void;
}

type Tab = 'config' | 'knowledge' | 'style';

export default function CustomizationSidebar({
  bot,
  savedBot,
  onBotChange,
  onBack,
  onSave,
}: CustomizationSidebarProps) {
  const [activeTab, setActiveTab] = useState<Tab>('config');

  return (
    <div className="w-[20%] border-r border-slate-200 flex flex-col bg-slate-50 overflow-y-auto custom-scrollbar">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10">
        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'config'
              ? 'text-blue-600 border-blue-600 bg-blue-50/50'
              : 'text-slate-500 hover:text-slate-700 border-transparent'
          }`}
        >
          Configuration
        </button>
        <button
          onClick={() => setActiveTab('knowledge')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'knowledge'
              ? 'text-blue-600 border-blue-600 bg-blue-50/50'
              : 'text-slate-500 hover:text-slate-700 border-transparent'
          }`}
        >
          Knowledge Base
        </button>
        <button
          onClick={() => setActiveTab('style')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'style'
              ? 'text-blue-600 border-blue-600 bg-blue-50/50'
              : 'text-slate-500 hover:text-slate-700 border-transparent'
          }`}
        >
          Appearance
        </button>
      </div>

      {activeTab === 'config' && <ConfigSection bot={bot} onBotChange={onBotChange} />}
      {activeTab === 'knowledge' && <KnowledgeSection bot={bot} onBotChange={onBotChange} />}
      {activeTab === 'style' && <AppearanceSection bot={bot} savedBot={savedBot} onBotChange={onBotChange} />}
    </div>
  );
}
