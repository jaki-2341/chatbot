'use client';

import { Bot } from '@/app/types/bot';
import { X, MessageSquare, MessageCircle, Send, Sparkles, RefreshCw, ArrowLeft, ArrowRight, RotateCw, Lock, ArrowRight as ArrowRightIcon, Globe, Info, Bot as BotIcon, HelpCircle, ChevronRight, Monitor, Smartphone } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from 'ai/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';

interface LivePreviewProps {
  bot: Bot;
  onBotChange?: (updates: Partial<Bot>) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
}

// Info Collection Form Component
function InfoCollectionForm({ 
  field, 
  onSubmit, 
  onSkip,
  botColor
}: { 
  field: string; 
  onSubmit: (field: string, value: string) => void; 
  onSkip: () => void;
  botColor: string;
}) {
  const [value, setValue] = useState('');

  const getPlaceholder = () => {
    if (field === 'name') return "e.g. John Doe";
    if (field === 'email') return "name@example.com";
    if (field === 'phone') return "+1 (555) 000-0000";
    return '';
  };

  const getInputType = () => {
    if (field === 'email') return 'email';
    if (field === 'phone') return 'tel';
    return 'text';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(field, value.trim());
      setValue('');
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        type={getInputType()}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={getPlaceholder()}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        autoFocus
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSkip}
          className="flex-1 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          Skip
        </button>
        <button
          type="submit"
          className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: botColor }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          Send
        </button>
      </div>
    </form>
  );
}

// Helper function to adjust color brightness for gradient
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export default function LivePreview({ bot, onBotChange }: LivePreviewProps) {
  const [isChatOpen, setIsChatOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamingWelcomeContent, setStreamingWelcomeContent] = useState<string>('');
  const [isStreamingWelcome, setIsStreamingWelcome] = useState(false);
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isFromSuggestedQuestion, setIsFromSuggestedQuestion] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const infoBubbleCreatedRef = useRef(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [hasRequestedInfo, setHasRequestedInfo] = useState(false);
  const [collectingField, setCollectingField] = useState<string | null>(null);
  const [collectedFields, setCollectedFields] = useState<Set<string>>(new Set());
  const [collectedInfo, setCollectedInfo] = useState<{name?: string, email?: string, phone?: string}>({});
  const [askingMessageId, setAskingMessageId] = useState<string | null>(null);
  const [showInfoCollectionBubble, setShowInfoCollectionBubble] = useState(false);

  // Check localStorage on mount to see if info was already requested for this bot
  useEffect(() => {
    if (typeof window !== 'undefined' && bot.id) {
      const storageKey = `chatbot_${bot.id}_info_requested`;
      const requested = localStorage.getItem(storageKey) === 'true';
      setHasRequestedInfo(requested);
    }
  }, [bot.id]);

  // Get welcome message - use as-is from bot configuration
  const getWelcomeMessage = useCallback(() => {
    return bot.welcomeMessage || 'Hello! How can I help you today?';
  }, [bot.welcomeMessage]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, reload, setMessages, append } = useChat({
    api: '/api/chat',
    body: {
      botId: bot.id,
      knowledgeBase: bot.knowledgeBase || '',
      agentName: bot.agentName,
      collectInfoEnabled: bot.collectInfoEnabled || false,
      collectName: bot.collectName || false,
      collectEmail: bot.collectEmail || false,
      collectPhone: bot.collectPhone || false,
      hasRequestedInfo: hasRequestedInfo,
    },
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: '',
      },
    ],
  });

  // Reset messages and streaming state when bot changes
  useEffect(() => {
    // Clear any existing streaming timeout
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
      streamingTimeoutRef.current = null;
    }
    
    // Reset messages to initial state when bot changes
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: '',
      },
    ]);
    
    // Reset streaming state
    setIsStreamingWelcome(false);
    setStreamingWelcomeContent('');
    setIsInputFocused(false);
    
    // Check localStorage for this bot's info request status
    if (typeof window !== 'undefined' && bot.id) {
      const storageKey = `chatbot_${bot.id}_info_requested`;
      const requested = localStorage.getItem(storageKey) === 'true';
      setHasRequestedInfo(requested);
    } else {
      setHasRequestedInfo(false);
    }
    
    // Reset collection state
    setCollectingField(null);
    setCollectedFields(new Set());
    setCollectedInfo({});
    setAskingMessageId(null);
    setShowInfoCollectionBubble(false);
    infoBubbleCreatedRef.current = false;
  }, [bot.id, setMessages]);

  // Stream welcome message effect - only when input is focused
  useEffect(() => {
    // Don't stream welcome message if it's from a suggested question click
    if (isFromSuggestedQuestion) {
      setIsStreamingWelcome(false);
      return;
    }
    
    // Only stream if input is focused and welcome message is the only message (or doesn't exist yet)
    const hasOnlyWelcome = messages.length === 0 || 
      (messages.length === 1 && messages[0].id === 'welcome' && (!messages[0].content || messages[0].content === ''));
    
    if (!hasOnlyWelcome || !isInputFocused) {
      setIsStreamingWelcome(false);
      return;
    }
    
    const welcomeMessage = getWelcomeMessage();
    
    // Don't stream if welcome message is empty
    if (!welcomeMessage || welcomeMessage.trim() === '') {
      setIsStreamingWelcome(false);
      return;
    }
    
    // Clear any existing streaming timeout
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
    }
    
    // Reset streaming state
    setIsStreamingWelcome(true);
    setStreamingWelcomeContent('');
    
    let charIndex = 0;
    const speed = 30; // milliseconds per character
    
    const streamWelcome = () => {
      if (charIndex < welcomeMessage.length) {
        setStreamingWelcomeContent(welcomeMessage.substring(0, charIndex + 1));
        charIndex++;
        streamingTimeoutRef.current = setTimeout(streamWelcome, speed);
      } else {
        setIsStreamingWelcome(false);
        // Update the message with full content once streaming is complete
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: welcomeMessage,
          },
        ]);
      }
    };
    
    // Start streaming after a small delay to ensure state is ready
    streamingTimeoutRef.current = setTimeout(streamWelcome, 150);
    
    // Cleanup on unmount or when welcome message changes
    return () => {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
        streamingTimeoutRef.current = null;
      }
    };
  }, [bot.welcomeMessage, bot.id, refreshTrigger, messages, getWelcomeMessage, setMessages, isInputFocused]); // Re-stream when welcome message, bot, refresh trigger, messages, or input focus changes

  // Show info collection bubble after AI responds to first user message
  useEffect(() => {
    if (
      bot.collectInfoEnabled &&
      !hasRequestedInfo &&
      messages.length > 0 &&
      messages[messages.length - 1].role === 'assistant' &&
      !isLoading &&
      !collectingField &&
      !showInfoCollectionBubble &&
      !infoBubbleCreatedRef.current
    ) {
      // Check if this is after the first user message (AI just responded)
      const userMessages = messages.filter(m => m.role === 'user' && !m.id?.startsWith('hidden-info-'));
      // Also check if info collection bubble already exists
      const hasInfoBubble = messages.some(m => m.id?.startsWith('info-collection-'));
      
      if (userMessages.length === 1 && !hasInfoBubble) {
        // Determine first field to collect
        let firstField: string | null = null;
        if (bot.collectName) {
          firstField = 'name';
        } else if (bot.collectEmail) {
          firstField = 'email';
        } else if (bot.collectPhone) {
          firstField = 'phone';
        }
        
        if (firstField) {
          // Mark as created to prevent infinite loop
          infoBubbleCreatedRef.current = true;
          setShowInfoCollectionBubble(true);
          setCollectingField(firstField);
          
          // Create a separate bubble for info collection with a nice static message
          let staticMessage = '';
          if (firstField === 'name') {
            staticMessage = 'To better assist you, could I please have your full name?';
          } else if (firstField === 'email') {
            staticMessage = 'To better assist you, could I please have your email address?';
          } else if (firstField === 'phone') {
            staticMessage = 'To better assist you, could I please have your phone number?';
          }
          
          const infoBubbleMessage = {
            id: `info-collection-${Date.now()}`,
            role: 'assistant' as const,
            content: staticMessage,
          };
          
          setMessages([...messages, infoBubbleMessage]);
          setAskingMessageId(infoBubbleMessage.id);
          
          // Save to localStorage
          if (typeof window !== 'undefined' && bot.id) {
            const storageKey = `chatbot_${bot.id}_info_requested`;
            localStorage.setItem(storageKey, 'true');
            setHasRequestedInfo(true);
          }
        }
      }
    }
  }, [messages, isLoading, bot.collectInfoEnabled, bot.collectName, bot.collectEmail, bot.collectPhone, bot.id, hasRequestedInfo, collectingField, showInfoCollectionBubble]);

  // Function to send all collected info to AI silently
  const sendCollectedInfoToAI = useCallback((infoToSend: {name?: string, email?: string, phone?: string}) => {
    // Build a message summarizing all collected information
    const infoParts: string[] = [];
    if (infoToSend.name) {
      infoParts.push(`Name: ${infoToSend.name}`);
    }
    if (infoToSend.email) {
      infoParts.push(`Email: ${infoToSend.email}`);
    }
    if (infoToSend.phone) {
      infoParts.push(`Phone: ${infoToSend.phone}`);
    }
    
    const summaryMessage = `I've provided my information:\n${infoParts.join('\n')}`;
    
    // Send to AI with special ID prefix to mark as hidden (won't show in UI)
    append({
      role: 'user',
      content: summaryMessage,
      id: `hidden-info-${Date.now()}` // Special ID prefix for filtering
    });
    
    // Send lead to backend for storage and email
    sendLeadToBackend(infoToSend);
    
    // Clear collected info and fields
    setCollectedInfo({});
    setCollectedFields(new Set());
  }, [append, bot.id]);

  // Send lead data to backend API
  const sendLeadToBackend = useCallback(async (leadData: {name?: string, email?: string, phone?: string}) => {
    try {
      // Only send if we have at least one piece of information
      if (!leadData.name && !leadData.email && !leadData.phone) {
        return;
      }

      await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          botId: bot.id,
          name: leadData.name,
          email: leadData.email,
          phone: leadData.phone,
        }),
      });
    } catch (error) {
      // Silently fail - don't show error to user
    }
  }, [bot.id]);

  const handleInfoSubmit = (field: string, value: string, skipped: boolean = false) => {
    // If not skipped, validate value
    if (!skipped && !value.trim()) return;
    
    // Store the collected information (only if not skipped) - don't show user message
    const newCollectedInfo = skipped ? collectedInfo : {
      ...collectedInfo,
      [field]: value
    };
    setCollectedInfo(newCollectedInfo);
    
    // Add collected field to set (even if skipped, mark as collected to move on)
    const newCollectedFields = new Set(collectedFields);
    newCollectedFields.add(field);
    setCollectedFields(newCollectedFields);
    
    // Build queue of remaining fields to collect (in order: name, email, phone)
    // Only include fields that are enabled and not yet collected
    const fieldsQueue: string[] = [];
    if (bot.collectName && !newCollectedFields.has('name')) {
      fieldsQueue.push('name');
    }
    if (bot.collectEmail && !newCollectedFields.has('email')) {
      fieldsQueue.push('email');
    }
    if (bot.collectPhone && !newCollectedFields.has('phone')) {
      fieldsQueue.push('phone');
    }
    
    // Get the next field to collect
    const nextField = fieldsQueue[0];
    
    // Update collecting field for next question or clear if done
    if (nextField) {
      // Update the info collection bubble message with thank you and next question
      const updatedMessages = messages.map(msg => {
        if (msg.id === askingMessageId) {
          // Build the new content: thank you + next question
          let newContent = '';
          if (field === 'name' && !skipped) {
            newContent = `Thank you, ${value}!`;
          } else {
            newContent = 'Thank you!';
          }
          
          // Add next question
          let nextFieldMessage = '';
          if (nextField === 'email') {
            nextFieldMessage = 'What is your email address?';
          } else if (nextField === 'phone') {
            nextFieldMessage = 'What is your phone number?';
          }
          if (nextFieldMessage) {
            newContent += ` ${nextFieldMessage}`;
          }
          
          return {
            ...msg,
            content: newContent
          };
        }
        return msg;
      });
      
      // Update messages in the same bubble (no user message added)
      setMessages(updatedMessages);
      
      // Keep the same message ID, just update the collecting field
      setCollectingField(nextField);
      // askingMessageId stays the same since it's the same bubble
    } else {
      // All fields collected/skipped - remove the bubble and let AI respond naturally
      setCollectingField(null);
      setAskingMessageId(null);
      setShowInfoCollectionBubble(false);
      
      // Remove the asking message bubble completely
      const finalMessages = messages.filter(msg => msg.id !== askingMessageId);
      setMessages(finalMessages);
      
      // Send info to AI silently (no visible message)
      // AI will respond naturally with a proper thank you based on the system prompt
      setTimeout(() => {
        sendCollectedInfoToAI(newCollectedInfo);
      }, 100);
    }
  };

  // Add skip handler
  const handleInfoSkip = () => {
    if (!collectingField) return;
    handleInfoSubmit(collectingField, '', true);
  };

  const customHandleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // If collecting info, don't submit normal message
    if (collectingField) {
      return;
    }
    
    handleSubmit(e);
  };

  const handleRefresh = () => {
    // Clear any existing streaming timeout
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
      streamingTimeoutRef.current = null;
    }
    
    // Reset streaming state
    setIsStreamingWelcome(false);
    setStreamingWelcomeContent('');
    
    // Reset to initial welcome message but keep conversation view open
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: '',
      },
    ]);
    
    // Keep input focused to stay in conversation view (don't reset isInputFocused)
    // Only reset the suggested question flag
    setIsFromSuggestedQuestion(false);
    
    // Clear input field
    const inputEl = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (inputEl) {
      inputEl.value = '';
    }
    
    // Trigger re-streaming by updating refresh trigger
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const [previewUrl, setPreviewUrl] = useState(bot.previewUrl || '');
  const [showIframe, setShowIframe] = useState(!!bot.previewUrl);

  // Sync previewUrl state when bot prop changes
  useEffect(() => {
    setPreviewUrl(bot.previewUrl || '');
    setShowIframe(!!bot.previewUrl);
  }, [bot.previewUrl]);

  const handleLoadPreviewUrl = () => {
    if (previewUrl.trim()) {
      let url = previewUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      setPreviewUrl(url);
      setShowIframe(true);
      // Force iframe reload by updating key
      setIframeKey(prev => prev + 1);
      // Update bot state with the preview URL
      onBotChange?.({ previewUrl: url });
    } else {
      setShowIframe(false);
      // Clear preview URL from bot state
      onBotChange?.({ previewUrl: '' });
    }
  };

  return (
    <div className="w-[80%] bg-slate-100 flex flex-col relative overflow-hidden">
      {/* View Mode Toggle */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white rounded-lg shadow-md border border-slate-200 p-1">
        <button
          onClick={() => setViewMode('desktop')}
          className={`p-2 rounded-md transition-all ${
            viewMode === 'desktop'
              ? 'bg-blue-50 text-blue-600'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
          title="Desktop View"
        >
          <Monitor className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode('mobile')}
          className={`p-2 rounded-md transition-all ${
            viewMode === 'mobile'
              ? 'bg-blue-50 text-blue-600'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
          title="Mobile View"
        >
          <Smartphone className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        {/* Website Mockup Background */}
        <div className={`bg-white rounded-xl shadow-xl border border-slate-200 flex flex-col overflow-hidden relative group/browser transition-all duration-300 ${
          viewMode === 'desktop' 
            ? 'w-full max-w-[95%] h-[95%]' 
            : 'w-[375px] h-[667px] max-h-[95%]'
        }`}>
          {/* Fake Browser Header */}
          {viewMode === 'desktop' && (
          <div className="bg-slate-100 border-b border-slate-200 h-10 flex items-center px-4 gap-3 shrink-0 z-20 relative">
            <div className="flex gap-1.5 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
            </div>
            {/* Navigation Controls */}
            <div className="flex gap-2 text-slate-400 shrink-0">
              <ArrowLeft className="w-4 h-4" />
              <ArrowRight className="w-4 h-4" />
              <RotateCw className="w-4 h-4 cursor-pointer hover:text-slate-600" onClick={handleLoadPreviewUrl} />
            </div>
            {/* Address Bar */}
            <div className="flex-1 relative group">
              <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                <Lock className="w-3 h-3 text-slate-400" />
              </div>
              <input
                type="url"
                value={previewUrl}
                onChange={(e) => {
                  setPreviewUrl(e.target.value);
                  // Update bot state immediately as user types (optional, or only on blur/enter)
                }}
                onBlur={() => {
                  // Update bot state when user leaves the input field
                  if (previewUrl.trim()) {
                    let url = previewUrl.trim();
                    if (!url.startsWith('http://') && !url.startsWith('https://')) {
                      url = 'https://' + url;
                    }
                    onBotChange?.({ previewUrl: url });
                  } else {
                    onBotChange?.({ previewUrl: '' });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLoadPreviewUrl();
                  }
                }}
                placeholder="Enter website URL to preview (e.g. example.com)"
                className="w-full h-7 pl-7 pr-8 bg-white border border-slate-200 rounded-md text-xs text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
              />
              <button
                onClick={handleLoadPreviewUrl}
                className="absolute inset-y-0 right-0 px-2 flex items-center border-l border-slate-100 hover:bg-slate-50 rounded-r text-slate-400 hover:text-blue-600 transition-colors"
                title="Load Website"
              >
                <ArrowRightIcon className="w-3 h-3" />
              </button>
            </div>
          </div>
          )}
          {/* Mobile Browser Header - Simplified */}
          {viewMode === 'mobile' && (
            <div className="bg-slate-100 border-b border-slate-200 h-8 flex items-center px-3 gap-2 shrink-0 z-20 relative">
              <div className="flex gap-1 shrink-0">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                <div className="w-2 h-2 rounded-full bg-green-400"></div>
              </div>
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                  <Lock className="w-2.5 h-2.5 text-slate-400" />
                </div>
                <input
                  type="url"
                  value={previewUrl}
                  onChange={(e) => {
                    setPreviewUrl(e.target.value);
                  }}
                  onBlur={() => {
                    if (previewUrl.trim()) {
                      let url = previewUrl.trim();
                      if (!url.startsWith('http://') && !url.startsWith('https://')) {
                        url = 'https://' + url;
                      }
                      onBotChange?.({ previewUrl: url });
                    } else {
                      onBotChange?.({ previewUrl: '' });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleLoadPreviewUrl();
                    }
                  }}
                  placeholder="Enter URL..."
                  className="w-full h-6 pl-6 pr-6 bg-white border border-slate-200 rounded text-[10px] text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                />
              </div>
              <RotateCw className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600 shrink-0" onClick={handleLoadPreviewUrl} />
            </div>
          )}

          {/* Content Container */}
          <div className="relative flex-1 bg-white w-full h-full overflow-hidden">
            {/* Fake Website Content (Skeleton) - shown when no URL */}
            {!showIframe && !previewUrl && (
              <div className="absolute inset-0 p-8 space-y-6 opacity-30 pointer-events-none select-none overflow-y-auto">
                <div className="h-8 w-1/3 bg-slate-200 rounded"></div>
                <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
                <div className="h-4 w-2/3 bg-slate-200 rounded"></div>
                <div className="grid grid-cols-3 gap-4 mt-8">
                  <div className="h-32 bg-slate-200 rounded"></div>
                  <div className="h-32 bg-slate-200 rounded"></div>
                  <div className="h-32 bg-slate-200 rounded"></div>
                </div>
                <div className="h-4 w-5/6 bg-slate-200 rounded mt-8"></div>
                <div className="h-4 w-4/6 bg-slate-200 rounded"></div>

                {/* Helper Text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                  <div className="text-center p-8 bg-white/95 backdrop-blur shadow-xl rounded-2xl border border-slate-200 max-w-md mx-6">
                    <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Globe className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Enter your website URL above</h3>
                    <p className="text-slate-600 mb-4">Type your URL in the address bar to see a live preview of the chatbot on your site.</p>
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500 bg-slate-50 py-2 px-3 rounded-lg">
                      <Info className="w-3 h-3" />
                      <span>Some sites (e.g. Google) block embedding</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Iframe for Live Preview */}
            {showIframe && previewUrl && (
              <iframe
                key={iframeKey}
                src={previewUrl}
                className="absolute inset-0 w-full h-full bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                title="Website Preview"
              />
            )}

            {/* THE WIDGET PREVIEW */}
            <div
              className={`absolute flex flex-col gap-4 z-20 ${
                bot.position === 'bottom-right'
                  ? viewMode === 'mobile' ? 'bottom-2 right-2 items-end' : 'bottom-6 right-6 items-end'
                  : viewMode === 'mobile' ? 'bottom-2 left-2 items-start' : 'bottom-6 left-6 items-start'
              }`}
            >
        {/* Chat Window */}
        <div
          className={`bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
            bot.position === 'bottom-right' ? 'origin-bottom-right' : 'origin-bottom-left'
          } ${
            isChatOpen
              ? 'opacity-100 transform scale-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 transform scale-95 translate-y-4 pointer-events-none'
          }`}
          style={{ 
            width: viewMode === 'mobile' ? '320px' : '350px',
            maxWidth: viewMode === 'mobile' ? 'calc(100% - 16px)' : '350px',
            height: viewMode === 'mobile' ? '450px' : '600px',
            maxHeight: viewMode === 'mobile' ? 'calc(100% - 80px)' : 'calc(100% - 100px)' // Ensure it doesn't overflow container height
          }}
        >
          {/* HOME VIEW - Welcome Screen (shown when no messages) */}
          {(!isInputFocused && (messages.length === 0 || 
            (messages.length === 1 && messages[0].id === 'welcome' && (!messages[0].content || messages[0].content === '')))) ? (
            <div className="flex flex-col h-full bg-gray-50">
                {/* Large Welcome Header with Gradient */}
          <div
                  className="p-8 pb-16 rounded-b-[2.5rem] relative overflow-hidden"
                  style={{ 
                    background: `linear-gradient(to bottom right, ${bot.primaryColor || '#3B82F6'}, ${bot.primaryColor ? adjustColor(bot.primaryColor, -20) : '#2563EB'})`
                  }}
                >
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
                  
                  <div className="relative z-10">
                    {/* First Line: Avatar and Hello! */}
                    <div className="flex items-center gap-4 mb-3">
                      {/* Big Avatar */}
                      <div className="shrink-0">
                        {bot.avatarImage ? (
                          <Image
                            src={bot.avatarImage}
                            alt={bot.agentName || bot.name || 'Bot'}
                            width={80}
                            height={80}
                            className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white/20"
                            unoptimized
                          />
                        ) : (
                          <div 
                            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold ring-4 ring-white/20"
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                          >
                            {bot.agentName?.charAt(0) || bot.name?.charAt(0) || 'A'}
                          </div>
                        )}
                      </div>
                      
                      {/* Hello! Text */}
                      <h2 className="text-white text-3xl font-bold">
                        Hello!
                      </h2>
                    </div>
                    
                    {/* Second Line: Description */}
                    <p className="text-white/80 text-lg">
                      {bot.welcomeDescription || (() => {
                        const roleText = bot.role || 'AI assistant';
                        return bot.agentName 
                          ? `I'm ${bot.agentName}, your ${roleText}. How can I help you today?`
                          : `I'm your ${roleText}. How can I help you today?`;
                      })()}
                    </p>
                  </div>
                  
                  {/* Close Button (Top Right) */}
                  <button
                    onClick={() => setIsChatOpen(false)}
                    className="absolute top-4 right-4 text-white/70 hover:text-white transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

              {/* Main Action Card */}
              <div className="px-6 -mt-10 relative z-20">
                <div 
                  className="bg-white rounded-xl shadow-lg p-5 border border-gray-100 hover:shadow-xl transition cursor-pointer group"
                  onClick={() => {
                    setIsFromSuggestedQuestion(false); // Reset flag for "Send us a message" click
                    setIsInputFocused(true);
                    // Focus will trigger conversation view
                    setTimeout(() => {
                      const inputEl = document.querySelector('input[type="text"]') as HTMLInputElement;
                      if (inputEl) {
                        inputEl.focus();
                      }
                    }, 100);
                  }}
                >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-gray-800 text-lg">Send us a message</h3>
                      <Send 
                        className="w-5 h-5 group-hover:translate-x-1 transition-transform" 
                        style={{ color: bot.primaryColor || '#3B82F6' }}
                      />
                    </div>
                    <p className="text-sm text-gray-500 mb-6">Our AI assistant replies instantly.</p>
                    
                    {/* Start Conversation Button */}
                    <div 
                      className="w-full rounded-lg py-2.5 px-4 font-semibold text-sm text-center transition-colors duration-300 flex items-center justify-center group-hover:transition-colors"
                      style={{
                        backgroundColor: `${bot.primaryColor || '#3B82F6'}15`,
                        color: bot.primaryColor || '#3B82F6'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = bot.primaryColor || '#3B82F6';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = `${bot.primaryColor || '#3B82F6'}15`;
                        e.currentTarget.style.color = bot.primaryColor || '#3B82F6';
                      }}
                    >
                      Start Conversation
                      <ArrowRight className="w-3 h-3 ml-2" />
                    </div>
                  </div>
                </div>

              {/* Suggested Topics Section */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Suggested Topics</h4>

                {/* Quick Links List */}
                <div className="space-y-2">
                  {((bot.suggestedQuestions && bot.suggestedQuestions.length > 0) 
                    ? bot.suggestedQuestions 
                    : ["Pricing & Plans", "Technical Support", "Book a Demo"]
                  ).map((question, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setIsFromSuggestedQuestion(true);
                        // Clear welcome message if it exists to prevent blank message display
                        const filteredMessages = messages.filter((msg) => msg.id !== 'welcome');
                        if (filteredMessages.length !== messages.length) {
                          setMessages(filteredMessages);
                        }
                        handleInputChange({ target: { value: question } } as any);
                        setIsInputFocused(true);
                        // Auto-submit to start conversation
                        setTimeout(() => {
                          const form = document.querySelector('form') as HTMLFormElement;
                          if (form) {
                            form.requestSubmit();
                          }
                          // Reset flag after submission
                          setTimeout(() => setIsFromSuggestedQuestion(false), 500);
                        }, 100);
                      }}
                      className="flex items-center justify-between p-3 bg-white rounded-lg hover:bg-blue-50 cursor-pointer border border-gray-100 hover:border-blue-200 transition shadow-sm group"
                    >
                      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">{question}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 text-center border-t border-gray-100 bg-white rounded-b-2xl mt-auto">
                <p className="text-xs text-gray-400">
                  Powered by <span className="font-bold" style={{ color: bot.primaryColor || '#3B82F6' }}>Proweaver</span>
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* CONVERSATION VIEW - Header (shown when user starts chatting) */}
              <div
                className="p-4 text-white flex justify-between items-center shrink-0"
            style={{ backgroundColor: bot.primaryColor || '#3B82F6' }}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                {bot.avatarImage ? (
                  <Image
                    src={bot.avatarImage}
                    alt={bot.agentName}
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                    {bot.agentName?.charAt(0) || bot.name?.charAt(0) || 'A'}
                  </div>
                )}
                {/* Status indicator */}
                <div
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                    (bot.status || 'Inactive') === 'Active' ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
              </div>
              <div>
                <h3 className="font-bold text-sm">{bot.agentName || bot.name || 'Agent'}</h3>
                {bot.role && <p className="text-xs opacity-90">{bot.role}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="text-white/80 hover:text-white transition-colors"
                title="Refresh chat"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

              {/* Messages Area */}
          <div className="flex-1 bg-gray-50 p-4 overflow-y-auto space-y-4 scrollbar-hide">
            {messages
              .filter((msg) => {
                // Hide empty welcome message when input is not focused (static welcome is shown instead)
                // Show it when input is focused (for streaming) or when it has content
                if (msg.id === 'welcome' && (!msg.content || msg.content === '')) {
                  return isInputFocused || isStreamingWelcome;
                }
                // Hide messages with hidden-info- prefix (silent information messages)
                if (msg.id && msg.id.startsWith('hidden-info-')) {
                  return false;
                }
                // Fallback: Hide user messages that are information summaries (sent silently)
                // These are messages like "I've provided my information: Name: X, Email: Y" that we don't want to show
                if (msg.role === 'user' && msg.content.includes("I've provided my information:")) {
                  return false;
                }
                return true;
              })
              .map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 chat-enter ${
                  msg.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                {msg.role === 'assistant' && (
                  bot.avatarImage ? (
                    <Image
                      src={bot.avatarImage}
                      alt={bot.agentName}
                      width={26}
                      height={26}
                      className="w-[26px] h-[26px] rounded-full flex-shrink-0 object-cover"
                    />
                  ) : (
                    <div
                      className="w-[26px] h-[26px] rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: bot.primaryColor || '#3B82F6' }}
                    >
                      {bot.agentName?.charAt(0) || bot.name?.charAt(0) || 'A'}
                    </div>
                  )
                )}
                <div
                  className={`p-3 max-w-[80%] text-sm shadow-sm ${
                    msg.role === 'user'
                      ? 'text-white rounded-tl-xl rounded-tr-xl rounded-bl-xl'
                      : 'bg-white text-gray-700 border border-gray-100 rounded-tr-xl rounded-bl-xl rounded-br-xl'
                  }`}
                  style={msg.role === 'user' ? { backgroundColor: bot.primaryColor || '#3B82F6' } : {}}
                >
                  {msg.role === 'assistant' ? (
                    <div className="markdown-content">
                      {msg.id === 'welcome' && isStreamingWelcome ? (
                        <p className="mb-0 leading-relaxed">{streamingWelcomeContent}</p>
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 ml-2">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 ml-2">{children}</ol>,
                            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                            code: ({ node, inline, className, children, ...props }: any) => {
                              return !inline ? (
                                <code className="block bg-gray-900 text-gray-100 p-2 rounded text-xs overflow-x-auto mb-2 font-mono" {...props}>
                                {String(children).replace(/\n$/, '')}
                              </code>
                            ) : (
                              <code className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                                {children}
                              </code>
                            );
                          },
                          pre: ({ children }) => <pre className="bg-gray-900 text-gray-100 p-2 rounded text-xs overflow-x-auto mb-2 font-mono">{children}</pre>,
                          h1: ({ children }) => <h1 className="text-base font-bold mb-2 mt-0">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-sm font-bold mb-2 mt-0">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-0">{children}</h3>,
                          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          a: ({ children, href }: any) => <a href={href} className="text-blue-600 underline hover:text-blue-700" target="_blank" rel="noopener noreferrer">{children}</a>,
                          blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2 text-gray-600">{children}</blockquote>,
                          hr: () => <hr className="my-3 border-gray-200" />,
                          table: ({ children }) => <div className="overflow-x-auto my-2"><table className="min-w-full border border-gray-200">{children}</table></div>,
                          thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
                          tbody: ({ children }) => <tbody>{children}</tbody>,
                          tr: ({ children }) => <tr className="border-b border-gray-200">{children}</tr>,
                          th: ({ children }) => <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">{children}</th>,
                          td: ({ children }) => <td className="px-3 py-2 text-xs">{children}</td>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                      )}
                      
                      {/* Show input form inside message bubble if this message is asking for info */}
                      {collectingField && 
                       messages.length > 0 && 
                       messages[messages.length - 1].id === msg.id && 
                       messages[messages.length - 1].role === 'assistant' && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <InfoCollectionForm
                            field={collectingField}
                            onSubmit={handleInfoSubmit}
                            onSkip={handleInfoSkip}
                            botColor={bot.primaryColor || '#3B82F6'}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 chat-enter">
                {bot.avatarImage ? (
                  <Image
                    src={bot.avatarImage}
                    alt={bot.agentName}
                    width={26}
                    height={26}
                    className="w-[26px] h-[26px] rounded-full flex-shrink-0 object-cover"
                  />
                ) : (
                  <div
                    className="w-[26px] h-[26px] rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: bot.primaryColor || '#3B82F6' }}
                  >
                    {bot.agentName?.charAt(0) || bot.name?.charAt(0) || 'A'}
                  </div>
                )}
                <div className="bg-white p-3 rounded-tr-xl rounded-bl-xl rounded-br-xl shadow-sm border border-gray-100 flex gap-1 items-center h-10">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></span>
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full typing-dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
              <form onSubmit={customHandleSubmit} className="p-3 border-t border-gray-100 bg-white shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                    placeholder={collectingField ? "Please provide your information above..." : (bot.inputPlaceholder || 'Type a message...')}
                    disabled={!!collectingField}
                    className={`flex-1 bg-gray-50 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 outline-none ${
                      collectingField ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                onFocus={(e) => {
                      if (!collectingField) {
                  setIsInputFocused(true);
                  // Convert hex to rgba for focus border
                  const hex = bot.primaryColor || '#3b82f6';
                  const r = parseInt(hex.slice(1, 3), 16);
                  const g = parseInt(hex.slice(3, 5), 16);
                  const b = parseInt(hex.slice(5, 7), 16);
                  e.currentTarget.style.boxShadow = `0 0 0 2px rgba(${r}, ${g}, ${b}, 0.25)`;
                      }
                }}
                onBlur={(e) => {
                  setIsInputFocused(false);
                  e.currentTarget.style.boxShadow = '';
                }}
              />
              <button
                type="submit"
                    disabled={isLoading || !!collectingField}
                className="p-2 rounded-lg text-white transition-opacity disabled:opacity-50"
                style={{ backgroundColor: bot.primaryColor || '#3B82F6' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>

              {/* Footer - Same as welcome screen */}
              <div className="p-4 text-center border-t border-gray-100 bg-white rounded-b-2xl shrink-0">
                <p className="text-xs text-gray-400">
                  Powered by <span className="font-bold" style={{ color: bot.primaryColor || '#3B82F6' }}>Proweaver</span>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 overflow-hidden"
          style={{ 
            backgroundColor: bot.primaryColor || '#3B82F6',
            animation: isChatOpen ? 'none' : 'chatbot-pulse 2s ease-in-out infinite',
            '--pulse-color': (() => {
              const hex = bot.primaryColor || '#3b82f6';
              const r = parseInt(hex.slice(1, 3), 16);
              const g = parseInt(hex.slice(3, 5), 16);
              const b = parseInt(hex.slice(5, 7), 16);
              return `rgba(${r}, ${g}, ${b}, 0.25)`;
            })()
          } as React.CSSProperties & { '--pulse-color': string }}
        >
          {isChatOpen ? (
            <X className="w-7 h-7" />
          ) : bot.showAvatarOnButton && bot.avatarImage ? (
            <Image
              src={bot.avatarImage}
              alt={bot.agentName || bot.name || 'Bot'}
              width={56}
              height={56}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : bot.widgetIcon === 'message-circle' ? (
            <MessageCircle className="w-7 h-7" />
          ) : bot.widgetIcon === 'bot' ? (
            <BotIcon className="w-7 h-7" />
          ) : bot.widgetIcon === 'sparkles' ? (
            <Sparkles className="w-7 h-7" />
          ) : bot.widgetIcon === 'help-circle' ? (
            <HelpCircle className="w-7 h-7" />
          ) : (
            <MessageCircle className="w-7 h-7" />
          )}
        </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

