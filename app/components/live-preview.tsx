'use client';

import { Bot } from '@/app/types/bot';
import { X, MessageSquare, MessageCircle, Send, Sparkles, RefreshCw, ArrowLeft, ArrowRight, RotateCw, Lock, ArrowRight as ArrowRightIcon, Globe, Info, Bot as BotIcon, HelpCircle } from 'lucide-react';
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

export default function LivePreview({ bot, onBotChange }: LivePreviewProps) {
  const [isChatOpen, setIsChatOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamingWelcomeContent, setStreamingWelcomeContent] = useState<string>('');
  const [isStreamingWelcome, setIsStreamingWelcome] = useState(false);
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Get welcome message - use as-is from bot configuration
  const getWelcomeMessage = useCallback(() => {
    return bot.welcomeMessage || 'Hello! How can I help you today?';
  }, [bot.welcomeMessage]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, reload, setMessages } = useChat({
    api: '/api/chat',
    body: {
      botId: bot.id,
      knowledgeBase: bot.knowledgeBase || '',
      agentName: bot.agentName,
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
  }, [bot.id, setMessages]);

  // Stream welcome message effect - only when input is focused
  useEffect(() => {
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

  const handleRefresh = () => {
    // Reset to initial welcome message with streaming effect
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: '',
      },
    ]);
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
      <div className="flex-1 flex items-center justify-center p-4">
        {/* Website Mockup Background */}
        <div className="w-full max-w-[95%] h-[95%] bg-white rounded-xl shadow-xl border border-slate-200 flex flex-col overflow-hidden relative group/browser">
          {/* Fake Browser Header */}
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
                  ? 'bottom-6 right-6 items-end'
                  : 'bottom-6 left-6 items-start'
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
            width: '350px', 
            height: '600px',
            maxHeight: 'calc(100% - 100px)' // Ensure it doesn't overflow container height
          }}
        >
          {/* Header */}
          <div
            className="p-4 text-white flex justify-between items-center"
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

          {/* Messages */}
          <div className="flex-1 bg-gray-50 p-4 overflow-y-auto space-y-4 scrollbar-hide">
            {/* Show static welcome message when no messages or only empty welcome, and input not focused */}
            {(!isInputFocused && (messages.length === 0 || 
              (messages.length === 1 && messages[0].id === 'welcome' && (!messages[0].content || messages[0].content === '')))) && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${bot.primaryColor || '#3B82F6'}15` }}
                >
                  <MessageCircle className="w-8 h-8" style={{ color: bot.primaryColor || '#3B82F6' }} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {getWelcomeMessage() || 'How can we help?'}
                </h3>
                <p className="text-sm text-gray-500 mb-6 max-w-xs">
                  Ask {bot.agentName || 'us'} anything about our products, pricing, or support services.
                </p>
                <p className="text-xs text-gray-400 uppercase tracking-wider">
                  Start typing below
                </p>
              </div>
            )}
            {messages
              .filter((msg) => {
                // Hide empty welcome message when input is not focused (static welcome is shown instead)
                // Show it when input is focused (for streaming) or when it has content
                if (msg.id === 'welcome' && (!msg.content || msg.content === '')) {
                  return isInputFocused || isStreamingWelcome;
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
          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-100 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder={bot.inputPlaceholder || 'Type a message...'}
                className="flex-1 bg-gray-50 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 outline-none"
                onFocus={(e) => {
                  setIsInputFocused(true);
                  // Convert hex to rgba for focus border
                  const hex = bot.primaryColor || '#3b82f6';
                  const r = parseInt(hex.slice(1, 3), 16);
                  const g = parseInt(hex.slice(3, 5), 16);
                  const b = parseInt(hex.slice(5, 7), 16);
                  e.currentTarget.style.boxShadow = `0 0 0 2px rgba(${r}, ${g}, ${b}, 0.25)`;
                }}
                onBlur={(e) => {
                  setIsInputFocused(false);
                  e.currentTarget.style.boxShadow = '';
                }}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="p-2 rounded-lg text-white transition-opacity disabled:opacity-50"
                style={{ backgroundColor: bot.primaryColor || '#3B82F6' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="text-center mt-2 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-500" />
              <p className="text-[10px] text-gray-400">Powered by Proweaver</p>
            </div>
          </form>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95"
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

