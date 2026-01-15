'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
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

// Map URL tab values to Tab type
const tabMap: Record<string, Tab> = {
  'config': 'config',
  'knowledge': 'knowledge',
  'knowledge-base': 'knowledge',
  'appearance': 'style',
  'style': 'style',
};

export default function CustomizationSidebar({
  bot,
  savedBot,
  onBotChange,
  onBack,
  onSave,
}: CustomizationSidebarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Get active tab from URL, default to 'config'
  const tabParam = searchParams.get('tab') || 'config';
  const activeTab: Tab = tabMap[tabParam] || 'config';

  // Update URL when tab changes
  const setActiveTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    // Map Tab type to URL-friendly value
    const urlTabValue = tab === 'knowledge' ? 'knowledge-base' : tab;
    params.set('tab', urlTabValue);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

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
