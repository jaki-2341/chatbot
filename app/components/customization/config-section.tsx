import { useState } from 'react';
import { Bot } from '@/app/types/bot';
import {
  Power,
  Settings,
  User,
  MessageSquare,
  MessageCircle,
  Tag,
  UserCircle,
  Info,
  Bot as BotIcon,
} from 'lucide-react';

interface ConfigSectionProps {
  bot: Bot;
  onBotChange: (updates: Partial<Bot>) => void;
}

export function ConfigSection({ bot, onBotChange }: ConfigSectionProps) {
  const [collectInfoEnabled, setCollectInfoEnabled] = useState(false);
  const [collectEmail, setCollectEmail] = useState(true);
  const [collectName, setCollectName] = useState(false);
  const [collectPhone, setCollectPhone] = useState(false);

  return (
    <div className="p-6 space-y-8">
      {/* Bot Status & Basic Information - Combined Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-blue-50 rounded-lg">
            <Settings className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Basic Information</h3>
            <p className="text-xs text-slate-500">Configure your bot&apos;s identity and visibility</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          {/* Bot Status */}
          <div className="p-4 border-b border-slate-100">
            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${
                  bot.status === 'Active' ? 'bg-green-100' : 'bg-slate-100'
                }`}>
                  <Power className={`w-4 h-4 ${
                    bot.status === 'Active' ? 'text-green-600' : 'text-slate-400'
                  }`} />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-900 block">Bot Active</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {bot.status === 'Active' ? 'Bot is publicly accessible' : 'Bot is hidden from public'}
                  </p>
                </div>
              </div>
              <label className="relative inline-block w-11 h-6 align-middle select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={bot.status === 'Active'}
                  onChange={(e) => onBotChange({ status: e.target.checked ? 'Active' : 'Inactive' })}
                  className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-300 checked:left-[calc(100%-1.25rem)] checked:border-blue-500 transition-all opacity-0 z-10"
                />
                <span
                  className={`block overflow-hidden h-6 rounded-full transition-colors duration-200 ${
                    bot.status === 'Active' ? 'bg-blue-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200 shadow-sm ${
                      bot.status === 'Active' ? 'left-[calc(100%-1.25rem)]' : 'left-0.5'
                    }`}
                  ></span>
                </span>
              </label>
            </label>
          </div>

          {/* Basic Information Fields */}
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-slate-200"></div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Bot Details</p>
              <div className="h-px flex-1 bg-slate-200"></div>
            </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <User className="w-4 h-4 text-slate-500" />
              Internal Bot Name
            </label>
            <input
              type="text"
              value={bot.name}
              onChange={(e) => onBotChange({ name: e.target.value })}
              placeholder="e.g., Customer Support Bot"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
            />
            <div className="flex items-center gap-1 mt-1.5">
              <Info className="w-3 h-3 text-slate-400" />
              <p className="text-xs text-slate-400">Only visible in your dashboard</p>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <UserCircle className="w-4 h-4 text-slate-500" />
              Display Name
            </label>
            <input
              type="text"
              value={bot.agentName}
              onChange={(e) => onBotChange({ agentName: e.target.value })}
              placeholder="e.g., Sarah"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
            />
            <p className="text-xs text-slate-400 mt-1.5">The name users will see in the chat</p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Tag className="w-4 h-4 text-slate-500" />
              Role
            </label>
            <input
              type="text"
              value={bot.role || ''}
              onChange={(e) => onBotChange({ role: e.target.value || undefined })}
              placeholder="e.g., Customer Support Agent"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
            />
            <p className="text-xs text-slate-400 mt-1.5">Displayed in the chat header (optional)</p>
          </div>
          </div>
        </div>
      </div>

      {/* Chat Messages Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-indigo-50 rounded-lg">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Chat Messages</h3>
            <p className="text-xs text-slate-500">Customize chat interface text</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <MessageCircle className="w-4 h-4 text-slate-500" />
              Welcome Message
            </label>
            <textarea
              value={bot.welcomeMessage}
              onChange={(e) => onBotChange({ welcomeMessage: e.target.value })}
              rows={3}
              placeholder="Hello! How can I help you today?"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm resize-none"
            />
            <p className="text-xs text-slate-400 mt-1.5">First message users will see</p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              Input Placeholder
            </label>
            <input
              type="text"
              value={bot.inputPlaceholder || 'Type a message...'}
              onChange={(e) => onBotChange({ inputPlaceholder: e.target.value })}
              placeholder="Type a message..."
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
            />
            <p className="text-xs text-slate-400 mt-1.5">Placeholder text in the input field</p>
          </div>
        </div>
      </div>

      {/* Advanced Settings Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-slate-50 rounded-lg">
            <Settings className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Advanced Settings</h3>
            <p className="text-xs text-slate-500">Additional configuration options</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <BotIcon className="w-4 h-4 text-slate-500" />
              Model Personality
            </label>
            <select className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm bg-white">
              <option value="Professional & Concise">Professional & Concise</option>
              <option value="Friendly & Casual">Friendly & Casual</option>
              <option value="Technical & Detailed">Technical & Detailed</option>
              <option value="Empathetic Support">Empathetic Support</option>
              <option value="Sarcastic & Witty">Sarcastic & Witty</option>
            </select>
            <p className="text-xs text-slate-400 mt-1.5">Define the tone of AI responses</p>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${
                  collectInfoEnabled ? 'bg-blue-100' : 'bg-slate-100'
                }`}>
                  <UserCircle className={`w-4 h-4 ${
                    collectInfoEnabled ? 'text-blue-600' : 'text-slate-400'
                  }`} />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-900 block">Collect Information</span>
                  <p className="text-xs text-slate-500 mt-0.5">Ask user for details before starting chat</p>
                </div>
              </div>
              <label className="relative inline-block w-11 h-6 align-middle select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={collectInfoEnabled}
                  onChange={(e) => setCollectInfoEnabled(e.target.checked)}
                  className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-slate-300 checked:left-[calc(100%-1.25rem)] checked:border-blue-500 transition-all opacity-0 z-10"
                />
                <span
                  className={`block overflow-hidden h-6 rounded-full transition-colors duration-200 ${
                    collectInfoEnabled ? 'bg-blue-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200 shadow-sm ${
                      collectInfoEnabled ? 'left-[calc(100%-1.25rem)]' : 'left-0.5'
                    }`}
                  ></span>
                </span>
              </label>
            </label>

            {collectInfoEnabled && (
              <div className="mt-4 bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Fields to Request</p>
                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={collectEmail}
                    onChange={(e) => setCollectEmail(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-slate-700">Email Address</span>
                    <p className="text-xs text-slate-500">Collect user&apos;s email</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={collectName}
                    onChange={(e) => setCollectName(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-slate-700">Full Name</span>
                    <p className="text-xs text-slate-500">Collect user&apos;s full name</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={collectPhone}
                    onChange={(e) => setCollectPhone(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-slate-700">Phone Number</span>
                    <p className="text-xs text-slate-500">Collect user&apos;s phone number</p>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

