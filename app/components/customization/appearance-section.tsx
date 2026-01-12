import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Bot } from '@/app/types/bot';
import {
  Bot as BotIcon,
  HelpCircle,
  Image as ImageIcon,
  Layout,
  MessageCircle,
  MousePointerClick,
  Palette,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';

interface AppearanceSectionProps {
  bot: Bot;
  savedBot: Bot | null;
  onBotChange: (updates: Partial<Bot>) => void;
}

export function AppearanceSection({ bot, savedBot, onBotChange }: AppearanceSectionProps) {
  // Initialize color history from saved bot or use default
  const defaultColorHistory: (string | null)[] = [null, null, null, null, null, '#3B82F6'];
  const [colorHistory, setColorHistory] = useState<(string | null)[]>(
    savedBot?.colorHistory || defaultColorHistory
  );
  
  // Track last processed savedBot to avoid duplicate updates
  const lastProcessedBotId = useRef<string | undefined>(savedBot?.id);
  const lastProcessedColor = useRef<string | undefined>(savedBot?.primaryColor);

  // Initialize color history when bot changes or when loading saved data
  useEffect(() => {
    if (savedBot?.id !== lastProcessedBotId.current) {
      // Bot changed - reset tracking and load colorHistory
      lastProcessedBotId.current = savedBot?.id;
      lastProcessedColor.current = savedBot?.primaryColor;
      
      if (savedBot?.colorHistory) {
        setColorHistory(savedBot.colorHistory);
      } else {
        setColorHistory(defaultColorHistory);
      }
    } else if (savedBot?.primaryColor && savedBot.primaryColor !== lastProcessedColor.current) {
      // Primary color changed after save - update history with FIFO
      const color = savedBot.primaryColor;
      lastProcessedColor.current = color;
      
      setColorHistory(prev => {
        // Don't add if already in history
        if (prev.includes(color)) {
          return prev;
        }

        // FIFO: Always shift left and add new at end (keeping 6 items)
        return [...prev.slice(1), color];
      });
    }
  }, [savedBot]); // Trigger when savedBot changes

  // Save colorHistory to bot state whenever it changes (so it gets persisted to database)
  useEffect(() => {
    if (colorHistory) {
      onBotChange({ colorHistory: colorHistory });
    }
  }, [colorHistory]); // Save whenever colorHistory state changes

  const handleColorPick = (color: string) => {
    onBotChange({ primaryColor: color });
    // Removed immediate history update - now handled by useEffect on savedBot
  };

  return (
    <div className="p-6 space-y-8">
      {/* Brand Colors Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-blue-50 rounded-lg">
            <Palette className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Brand Color</h3>
            <p className="text-xs text-slate-500">Choose your primary brand color</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div 
              className="w-12 h-12 rounded-lg border-2 border-slate-200 flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
              style={{ backgroundColor: bot.primaryColor || '#3B82F6' }}
              title="Current color"
            >
              <div className="w-8 h-8 rounded" style={{ backgroundColor: bot.primaryColor || '#3B82F6' }}></div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Selected Color</p>
              <p className="text-xs font-mono text-slate-500">{bot.primaryColor?.toUpperCase() || '#3B82F6'}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-medium text-slate-600">Color Palette</label>
              <span className="text-[10px] text-slate-400">Recent colors</span>
            </div>
            <div className="flex gap-2">
              {colorHistory.map((color, index) => (
                <button
                  key={index}
                  onClick={() => color && onBotChange({ primaryColor: color })}
                  disabled={!color}
                  className={`flex-1 aspect-square rounded-lg border-2 transition-all ${
                    color 
                      ? 'hover:scale-105 hover:shadow-sm cursor-pointer' 
                      : 'border-dashed border-slate-200 cursor-default bg-slate-50'
                  } ${
                    color && (bot.primaryColor || '#3B82F6').toLowerCase() === color.toLowerCase()
                      ? 'border-blue-500 ring-2 ring-blue-200 shadow-sm'
                      : color ? 'border-transparent' : ''
                  }`}
                  style={color ? { backgroundColor: color } : {}}
                  title={color || 'Empty slot'}
                />
              ))}
            </div>
            
            <div className="pt-2 mt-2 border-t border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer group p-2 hover:bg-slate-50 rounded-lg transition-colors">
                <div className="relative">
                  <div className="w-10 h-10 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center bg-white shadow-sm group-hover:shadow transition-all">
                    <Palette className="w-5 h-5 text-slate-600" />
                  </div>
                  <input
                    type="color"
                    value={bot.primaryColor || '#3B82F6'}
                    onChange={(e) => handleColorPick(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Pick a custom color"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">Custom Color</p>
                  <p className="text-xs text-slate-500">Click to pick any color</p>
                </div>
                <div className="w-8 h-8 rounded-full border border-slate-200" style={{ backgroundColor: bot.primaryColor || '#3B82F6' }} />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Bot Avatar Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-purple-50 rounded-lg">
            <ImageIcon className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Bot Avatar</h3>
            <p className="text-xs text-slate-500">Upload an image for your chatbot</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="relative w-20 h-20 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-sm transition-all group-hover:shadow-md group-hover:scale-105">
                {bot.avatarImage ? (
                  <Image
                    src={bot.avatarImage}
                    alt={bot.agentName || bot.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100">
                    <BotIcon className="w-10 h-10 text-slate-400" />
                  </div>
                )}
              </div>
              {bot.avatarImage && (
                <button
                  onClick={() => onBotChange({ avatarImage: undefined })}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
                  title="Remove avatar"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <label className="cursor-pointer inline-flex items-center px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 transition-all group">
                <Upload className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                {bot.avatarImage ? 'Change Image' : 'Upload Image'}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        onBotChange({ avatarImage: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
              <p className="text-xs text-slate-500">Square JPG/PNG recommended, min 64x64px</p>
            </div>
          </div>
        </div>
      </div>

      {/* Widget Icon Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-green-50 rounded-lg">
            <MousePointerClick className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Widget Icon</h3>
            <p className="text-xs text-slate-500">Choose the icon for your chat button</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="grid grid-cols-4 gap-3">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => onBotChange({ widgetIcon: 'message-circle' })}
                className={`w-full p-4 border-2 rounded-xl flex items-center justify-center transition-all hover:scale-105 hover:shadow-md ${
                  bot.widgetIcon === 'message-circle'
                    ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
                title="Message Circle"
              >
                <MessageCircle className="w-6 h-6" />
              </button>
              <span className="text-xs font-medium text-slate-700">Message</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => onBotChange({ widgetIcon: 'bot' })}
                className={`w-full p-4 border-2 rounded-xl flex items-center justify-center transition-all hover:scale-105 hover:shadow-md ${
                  bot.widgetIcon === 'bot'
                    ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
                title="Bot"
              >
                <BotIcon className="w-6 h-6" />
              </button>
              <span className="text-xs font-medium text-slate-700">Bot</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => onBotChange({ widgetIcon: 'sparkles' })}
                className={`w-full p-4 border-2 rounded-xl flex items-center justify-center transition-all hover:scale-105 hover:shadow-md ${
                  bot.widgetIcon === 'sparkles'
                    ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
                title="Sparkles"
              >
                <Sparkles className="w-6 h-6" />
              </button>
              <span className="text-xs font-medium text-slate-700">Sparkles</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => onBotChange({ widgetIcon: 'help-circle' })}
                className={`w-full p-4 border-2 rounded-xl flex items-center justify-center transition-all hover:scale-105 hover:shadow-md ${
                  bot.widgetIcon === 'help-circle'
                    ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
                title="Help Circle"
              >
                <HelpCircle className="w-6 h-6" />
              </button>
              <span className="text-xs font-medium text-slate-700">Help</span>
            </div>
          </div>
        </div>
      </div>

      {/* Position Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-orange-50 rounded-lg">
            <Layout className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Widget Position</h3>
            <p className="text-xs text-slate-500">Where should the chat button appear?</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onBotChange({ position: 'bottom-left' })}
              className={`p-4 border-2 rounded-xl flex flex-col items-center gap-3 transition-all hover:scale-105 hover:shadow-md ${
                bot.position === 'bottom-left'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className="w-16 h-12 border-2 border-current rounded-lg bg-white relative shadow-sm">
                <div className="absolute bottom-2 left-2 w-4 h-4 bg-current rounded"></div>
              </div>
              <div className="text-center">
                <span className="text-sm font-semibold block">Bottom Left</span>
                <span className="text-xs text-slate-500">Left corner</span>
              </div>
            </button>
            <button
              onClick={() => onBotChange({ position: 'bottom-right' })}
              className={`p-4 border-2 rounded-xl flex flex-col items-center gap-3 transition-all hover:scale-105 hover:shadow-md ${
                bot.position === 'bottom-right'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <div className="w-16 h-12 border-2 border-current rounded-lg bg-white relative shadow-sm">
                <div className="absolute bottom-2 right-2 w-4 h-4 bg-current rounded"></div>
              </div>
              <div className="text-center">
                <span className="text-sm font-semibold block">Bottom Right</span>
                <span className="text-xs text-slate-500">Right corner</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

