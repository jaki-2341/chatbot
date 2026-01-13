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
  HelpCircle,
  Plus,
  Trash2,
  Mail,
} from 'lucide-react';

interface ConfigSectionProps {
  bot: Bot;
  onBotChange: (updates: Partial<Bot>) => void;
}

export function ConfigSection({ bot, onBotChange }: ConfigSectionProps) {
  const [newQuestion, setNewQuestion] = useState('');
  
  // Use bot state for collect info settings
  const collectInfoEnabled = bot.collectInfoEnabled || false;
  const leadReceiverEmail = bot.leadReceiverEmail || '';
  const collectEmail = bot.collectEmail !== undefined ? bot.collectEmail : true;
  const collectName = bot.collectName || false;
  const collectPhone = bot.collectPhone || false;
  
  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // Check if receiver email is set and valid
  const isValidEmail = leadReceiverEmail.trim().length > 0 && emailRegex.test(leadReceiverEmail.trim());
  const hasReceiverEmail = leadReceiverEmail.trim().length > 0;
  const showEmailError = hasReceiverEmail && !isValidEmail;

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    const currentQuestions = bot.suggestedQuestions || [];
    if (currentQuestions.length >= 4) {
      alert('Maximum 4 suggested questions allowed');
      return;
    }
    onBotChange({ 
      suggestedQuestions: [...currentQuestions, newQuestion.trim()] 
    });
    setNewQuestion('');
  };

  const handleRemoveQuestion = (index: number) => {
    const currentQuestions = bot.suggestedQuestions || [];
    onBotChange({ 
      suggestedQuestions: currentQuestions.filter((_, i) => i !== index) 
    });
  };

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
              rows={2}
              placeholder="Hello! How can I help you today?"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm resize-none"
            />
            <p className="text-xs text-slate-400 mt-1.5">First message users will see</p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <BotIcon className="w-4 h-4 text-slate-500" />
              Suggested Questions
            </label>
            
            {/* Input field - static position at top */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddQuestion()}
                placeholder="Add a suggested question..."
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
              />
              <button
                onClick={handleAddQuestion}
                disabled={!newQuestion.trim() || (bot.suggestedQuestions || []).length >= 4}
                className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium text-sm hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Questions list - appears below input, grows downward */}
            <div className="space-y-2 min-h-[40px]">
              {(bot.suggestedQuestions || []).length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No questions added yet</p>
              ) : (
                (bot.suggestedQuestions || []).map((question, index) => (
                  <div key={index} className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <div className="flex-1 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700">
                      {question}
                    </div>
                    <button
                      onClick={() => handleRemoveQuestion(index)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            <p className="text-xs text-slate-400 mt-2">Add up to 4 quick questions for users to click</p>
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
          <div className="pt-4">
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
                  onChange={(e) => onBotChange({ collectInfoEnabled: e.target.checked })}
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
              <div className="mt-4 bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4">
                {/* Email Receiver Field - Must be set first */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Mail className="w-4 h-4 text-slate-500" />
                    Lead Notification Email
                  </label>
                  <input
                    type="email"
                    value={leadReceiverEmail}
                    onChange={(e) => onBotChange({ leadReceiverEmail: e.target.value })}
                    placeholder="your-email@example.com"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all text-sm ${
                      showEmailError
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20'
                    }`}
                  />
                  {showEmailError ? (
                    <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Please enter a valid email address
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1.5">Email address where collected leads will be sent</p>
                  )}
                </div>

                {/* Divider */}
                {isValidEmail && (
                  <>
                    <div className="flex items-center gap-2 my-2">
                      <div className="h-px flex-1 bg-slate-200"></div>
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Fields to Request</p>
                      <div className="h-px flex-1 bg-slate-200"></div>
                    </div>

                    {/* Field Selection Checkboxes */}
                    <div className="space-y-3">
                      <label className={`flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer group ${
                        isValidEmail ? 'hover:bg-white' : 'opacity-50 cursor-not-allowed'
                      }`}>
                        <input
                          type="checkbox"
                          checked={collectEmail}
                          onChange={(e) => onBotChange({ collectEmail: e.target.checked })}
                          disabled={!isValidEmail}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-slate-700">Email Address</span>
                          <p className="text-xs text-slate-500">Collect user&apos;s email</p>
                        </div>
                      </label>
                      <label className={`flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer group ${
                        isValidEmail ? 'hover:bg-white' : 'opacity-50 cursor-not-allowed'
                      }`}>
                        <input
                          type="checkbox"
                          checked={collectName}
                          onChange={(e) => onBotChange({ collectName: e.target.checked })}
                          disabled={!isValidEmail}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-slate-700">Full Name</span>
                          <p className="text-xs text-slate-500">Collect user&apos;s full name</p>
                        </div>
                      </label>
                      <label className={`flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer group ${
                        isValidEmail ? 'hover:bg-white' : 'opacity-50 cursor-not-allowed'
                      }`}>
                        <input
                          type="checkbox"
                          checked={collectPhone}
                          onChange={(e) => onBotChange({ collectPhone: e.target.checked })}
                          disabled={!isValidEmail}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-slate-700">Phone Number</span>
                          <p className="text-xs text-slate-500">Collect user&apos;s phone number</p>
                        </div>
                      </label>
                    </div>
                  </>
                )}

                {!hasReceiverEmail && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700">
                      Please enter a notification email address above to enable field selection.
                    </p>
                  </div>
                )}

                {showEmailError && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-700">
                      Please enter a valid email address to enable field selection.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

