import Image from 'next/image';
import { Bot, COLORS } from '@/app/types/bot';
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
  onBotChange: (updates: Partial<Bot>) => void;
}

export function AppearanceSection({ bot, onBotChange }: AppearanceSectionProps) {
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
            <label className="block text-xs font-medium text-slate-600 mb-2">Quick Select</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => onBotChange({ primaryColor: color })}
                  className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 hover:shadow-md ${
                    (bot.primaryColor || '#3B82F6').toLowerCase() === color.toLowerCase()
                      ? 'border-blue-500 ring-2 ring-blue-200 scale-110 shadow-md'
                      : 'border-white ring-1 ring-slate-200 hover:ring-slate-300'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-slate-100 transition-colors">
                  <Palette className="w-4 h-4 text-slate-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-700">Custom Color</p>
                  <p className="text-xs text-slate-500">Pick any color you want</p>
                </div>
                <input
                  type="color"
                  value={bot.primaryColor || '#3B82F6'}
                  onChange={(e) => onBotChange({ primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200"
                  title="Custom Color"
                />
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

