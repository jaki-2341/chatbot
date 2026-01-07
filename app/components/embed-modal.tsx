'use client';

import { Bot } from '@/app/types/bot';
import { X, Copy, Check } from 'lucide-react';
import { useEffect, useState } from 'react';

interface EmbedModalProps {
  bot: Bot;
  onClose: () => void;
}

export default function EmbedModal({ bot, onClose }: EmbedModalProps) {
  const [baseUrl, setBaseUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Get the current origin for the embed code
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const code = `<!-- Paste this code before the </body> tag -->
<script>
  window.chatbotConfig = {
    id: "${bot.id}",
    position: "${bot.position}",
    apiUrl: "${baseUrl}"
  };
</script>
<script src="${baseUrl}/loader.js" async defer></script>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 opacity-100">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Embed Your Widget</h3>
            <p className="text-sm text-gray-500">Add {bot.name} to your website.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <div className="mb-4">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Installation Script
            </label>
            <div className="relative group">
              <div className="absolute top-0 right-0 p-2">
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-2 px-3 py-1.5 text-white text-xs font-medium rounded transition-all border ${
                    copied
                      ? 'bg-green-500 border-green-400'
                      : 'bg-white/10 hover:bg-white/20 backdrop-blur border-white/20'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-gray-900 text-gray-100 p-5 rounded-lg text-xs overflow-x-auto font-mono leading-relaxed shadow-inner border border-gray-800 whitespace-pre" id="embed-code-block">
                {code}
              </pre>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-gray-600 hover:text-gray-900 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

