'use client';

import { Bot } from '@/app/types/bot';
import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { ArrowLeft, Save, AlertTriangle, X, Code } from 'lucide-react';
import CustomizationSidebar from './customization-sidebar';
import LivePreview from './live-preview';
import EmbedModal from './embed-modal';

interface BuilderProps {
  bot?: Bot;
  onBack: () => void;
  onSave: (bot: Bot) => Promise<Bot | null>;
}

// Helper function to compare two bots and detect changes
function hasBotChanges(currentBot: Bot, savedBot: Bot | null): boolean {
  if (!savedBot) return true; // New bot always has changes

  // Compare all relevant fields
  const fieldsToCompare: (keyof Bot)[] = [
    'name',
    'agentName',
    'welcomeMessage',
    'primaryColor',
    'position',
    'role',
    'inputPlaceholder',
    'widgetIcon',
    'knowledgeBase',
    'status',
    'avatarImage',
    'previewUrl',
    'collectInfoEnabled',
    'leadReceiverEmail',
    'collectEmail',
    'collectName',
    'collectPhone',
    'showAvatarOnButton',
    'ctaEnabled',
    'ctaText',
  ];

  for (const field of fieldsToCompare) {
    const currentValue = currentBot[field];
    const savedValue = savedBot[field];
    // Normalize empty strings to undefined for optional fields
    const normalizedCurrent = (currentValue === '' ? undefined : currentValue);
    const normalizedSaved = (savedValue === '' ? undefined : savedValue);
    if (normalizedCurrent !== normalizedSaved) {
      return true;
    }
  }

  // Compare files (only string filenames, ignore File objects)
  const currentFileNames = (currentBot.files || [])
    .filter((f): f is string => typeof f === 'string')
    .sort();
  const savedFileNames = (savedBot.files || [])
    .filter((f): f is string => typeof f === 'string')
    .sort();

  if (currentFileNames.length !== savedFileNames.length) {
    return true;
  }

  for (let i = 0; i < currentFileNames.length; i++) {
    if (currentFileNames[i] !== savedFileNames[i]) {
      return true;
    }
  }

  // Compare suggestedQuestions arrays
  const currentQuestions = (currentBot.suggestedQuestions || []).sort();
  const savedQuestions = (savedBot.suggestedQuestions || []).sort();
  if (currentQuestions.length !== savedQuestions.length) {
    return true;
  }
  for (let i = 0; i < currentQuestions.length; i++) {
    if (currentQuestions[i] !== savedQuestions[i]) {
      return true;
    }
  }

  return false;
}

export default function Builder({ bot: initialBot, onBack, onSave }: BuilderProps) {
  const [bot, setBot] = useState<Bot>(() => {
    if (initialBot) {
      return { ...initialBot };
    }
    // Default new bot
    return {
      id: Math.random().toString(36).substr(2, 9),
      name: 'My New Bot',
      agentName: 'Agent',
      welcomeMessage: 'Hello! How can I help you?',
      primaryColor: '#3B82F6',
      position: 'bottom-right',
      knowledgeBase: '',
      status: 'Inactive',
    };
  });

  const [savedBot, setSavedBot] = useState<Bot | null>(initialBot || null);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showEmbedWarningModal, setShowEmbedWarningModal] = useState(false);

  // Update saved bot when initialBot changes (e.g., when navigating to a different bot)
  useEffect(() => {
    if (initialBot) {
      setSavedBot({ ...initialBot });
      setBot({ ...initialBot });
    } else {
      setSavedBot(null);
    }
  }, [initialBot]); // Update when initialBot changes

  const hasChanges = useMemo(() => hasBotChanges(bot, savedBot), [bot, savedBot]);

  // Handle page reload/close with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
        return ''; // For older browsers
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges]);

  const handleBotChange = (updates: Partial<Bot>) => {
    setBot((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = async () => {
    if (!hasChanges || isSaving) return;

    setIsSaving(true);
    try {
      const saved = await onSave(bot);
      if (saved) {
        setSavedBot({ ...saved });
        setShowUnsavedModal(false);
      }
    } catch (error) {
      console.error('Error saving bot:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackClick = () => {
    if (hasChanges) {
      setShowUnsavedModal(true);
    } else {
      onBack();
    }
  };

  const handleLeaveWithoutSaving = () => {
    setShowUnsavedModal(false);
    onBack();
  };

  const handleSaveAndLeave = async () => {
    setIsSaving(true);
    try {
      const saved = await onSave(bot);
      if (saved) {
        setSavedBot({ ...saved });
        setShowUnsavedModal(false);
        onBack();
      }
    } catch (error) {
      console.error('Error saving bot:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmbedClick = () => {
    if (hasChanges) {
      setShowEmbedWarningModal(true);
    } else {
      setShowEmbedModal(true);
    }
  };

  const handleSaveAndShowEmbed = async () => {
    setIsSaving(true);
    try {
      const saved = await onSave(bot);
      if (saved) {
        setSavedBot({ ...saved });
        setShowEmbedWarningModal(false);
        setShowEmbedModal(true);
      }
    } catch (error) {
      console.error('Error saving bot:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleShowEmbedWithoutSaving = () => {
    setShowEmbedWarningModal(false);
    setShowEmbedModal(true);
  };

  return (
    <>
      <main className="flex-1 flex flex-col h-full bg-white">
        {/* Builder Nav */}
        <div className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackClick}
              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          <div className="h-6 w-px bg-slate-200"></div>
          <h2 className="font-semibold text-slate-800">{bot.name || 'Untitled Bot'}</h2>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Draft</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleEmbedClick}
            className="px-4 py-1.5 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-all bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
          >
            <Code className="w-4 h-4" />
            Embed
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-all ${
              hasChanges && !isSaving
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Suspense fallback={<div className="w-[20%] border-r border-slate-200 flex flex-col bg-slate-50" />}>
          <CustomizationSidebar
            bot={bot}
            savedBot={savedBot}
            onBotChange={handleBotChange}
            onBack={onBack}
            onSave={() => {}}
          />
        </Suspense>
        <LivePreview bot={bot} onBotChange={handleBotChange} />
      </div>
    </main>

    {/* Unsaved Changes Modal */}
    {showUnsavedModal && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000]">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all scale-100 opacity-100">
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Unsaved Changes</h3>
            <p className="text-slate-600 mb-6">
              You have unsaved changes. Are you sure you want to leave without saving?
            </p>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={handleSaveAndLeave}
                disabled={isSaving}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes & Leave
                  </>
                )}
              </button>
              
              <button
                onClick={handleLeaveWithoutSaving}
                className="w-full px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
              >
                Discard Changes & Leave
              </button>
              
              <button
                onClick={() => setShowUnsavedModal(false)}
                className="w-full px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Embed Warning Modal */}
    {showEmbedWarningModal && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000]">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all scale-100 opacity-100">
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Unsaved Changes Detected</h3>
            <p className="text-slate-600 mb-6">
              You have unsaved changes. Your changes will be automatically saved after generating the embed code. Would you like to proceed?
            </p>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={handleSaveAndShowEmbed}
                disabled={isSaving}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes & Generate Embed Code
                  </>
                )}
              </button>
              
              <button
                onClick={handleShowEmbedWithoutSaving}
                className="w-full px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Generate Embed Code Without Saving
              </button>
              
              <button
                onClick={() => setShowEmbedWarningModal(false)}
                className="w-full px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Embed Modal */}
    {showEmbedModal && (
      <EmbedModal
        bot={savedBot || bot}
        onClose={() => setShowEmbedModal(false)}
      />
    )}
    </>
  );
}

