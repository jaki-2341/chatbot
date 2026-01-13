'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Heart, User, FileText, Search, ChevronRight } from 'lucide-react';
import { BotTemplate, BOT_TEMPLATES } from '@/app/templates/bot-templates';

interface TemplateSelectionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: BotTemplate, clientName: string, assistantName: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  plus: <Plus className="w-6 h-6" />,
  heart: <Heart className="w-6 h-6" />,
  user: <User className="w-6 h-6" />,
  'file-text': <FileText className="w-6 h-6" />,
};

export default function TemplateSelectionPanel({
  isOpen,
  onClose,
  onSelectTemplate,
}: TemplateSelectionPanelProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<BotTemplate | null>(
    BOT_TEMPLATES.find(t => t.id === 'blank') || null
  );
  const [clientName, setClientName] = useState('');
  const [assistantName, setAssistantName] = useState('New Assistant');

  // Reset state when panel opens
  useEffect(() => {
    if (isOpen) {
      const blankTemplate = BOT_TEMPLATES.find(t => t.id === 'blank');
      setSelectedTemplate(blankTemplate || null);
      setClientName('');
      setAssistantName('New Assistant');
    }
  }, [isOpen]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const blankTemplate = BOT_TEMPLATES.find(t => t.category === 'blank');
  const quickstartTemplates = BOT_TEMPLATES.filter(t => t.category === 'quickstart');

  const handleCreate = () => {
    if (selectedTemplate && clientName.trim()) {
      onSelectTemplate(selectedTemplate, clientName.trim(), assistantName);
    }
  };

  const isClientNameValid = clientName.trim().length > 0;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Use state to control mounting and animation
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // First, render the component off-screen
      setShouldRender(true);
      // Then trigger animation after a tiny delay to ensure DOM is ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      // Start closing animation
      setIsAnimating(false);
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 400); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        style={{
          opacity: isAnimating ? 1 : 0,
          pointerEvents: isAnimating ? 'auto' : 'none',
          transition: 'opacity 0.4s ease-out',
        }}
        onClick={handleBackdropClick}
      />

      {/* Slide-over Panel */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col"
        style={{
          transform: isAnimating ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          willChange: 'transform',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Search className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Create Assistant</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Choose Template Section */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Choose a template</h3>
              <p className="text-sm text-slate-600">
                Here&apos;s a few templates to get you started, or you can create your own template and use it to create a new assistant.
              </p>
            </div>

            {/* Client Name Input */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Client Name <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Only visible in your dashboard
              </p>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  clientName.trim().length === 0 ? 'border-red-300' : 'border-slate-300'
                }`}
                placeholder="e.g., Customer Support Bot"
              />
              {clientName.trim().length === 0 && (
                <p className="text-xs text-red-500 mt-1">Client name is required</p>
              )}
            </div>

            {/* Assistant Name Input */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Assistant Name
              </label>
              <p className="text-xs text-slate-500 mb-2">
                The name users will see in the chat (This can be adjusted at any time after creation.)
              </p>
              <input
                type="text"
                value={assistantName}
                onChange={(e) => setAssistantName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="New Assistant"
                autoFocus
              />
            </div>

            {/* Blank Template */}
            {blankTemplate && (
              <div>
                <button
                  onClick={() => setSelectedTemplate(blankTemplate)}
                  className={`w-full p-4 border-2 rounded-xl text-left transition-all ${
                    selectedTemplate?.id === blankTemplate.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-lg flex-shrink-0 ${
                        selectedTemplate?.id === blankTemplate.id
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {iconMap[blankTemplate.icon] || <Plus className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 mb-1">{blankTemplate.name}</h4>
                      <p className="text-sm text-slate-600">{blankTemplate.description}</p>
                    </div>
                    {selectedTemplate?.id === blankTemplate.id && (
                      <div className="text-blue-600 flex-shrink-0">
                        <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-blue-600" />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              </div>
            )}

            {/* Quickstart Templates */}
            {quickstartTemplates.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Quickstart
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickstartTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template)}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${
                        selectedTemplate?.id === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg flex-shrink-0 ${
                            selectedTemplate?.id === template.id
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {iconMap[template.icon] || <FileText className="w-6 h-6" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 mb-1">{template.name}</h4>
                          <p className="text-xs text-slate-600 line-clamp-3">{template.description}</p>
                        </div>
                        {selectedTemplate?.id === template.id && (
                          <div className="text-blue-600 flex-shrink-0">
                            <div className="w-5 h-5 rounded-full border-2 border-blue-600 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-blue-600" />
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleCreate}
            disabled={!isClientNameValid}
            className={`px-5 py-2.5 text-white rounded-lg font-medium flex items-center gap-2 transition-colors ${
              isClientNameValid
                ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            Create Assistant
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

