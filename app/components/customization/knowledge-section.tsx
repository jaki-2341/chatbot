import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot } from '@/app/types/bot';
import {
  AlignLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Database,
  FilePlus,
  FileText,
  Loader2,
  Sparkles,
  UploadCloud,
  Trash2,
  Maximize2,
  X,
  AlertTriangle,
} from 'lucide-react';

interface KnowledgeSectionProps {
  bot: Bot;
  onBotChange: (updates: Partial<Bot>) => void;
}

export function KnowledgeSection({ bot, onBotChange }: KnowledgeSectionProps) {
  const [isGeneratingKB, setIsGeneratingKB] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const generateModalRef = useRef<HTMLDivElement>(null);
  const generateButtonRef = useRef<HTMLButtonElement>(null);
  const modalGenerateButtonRef = useRef<HTMLButtonElement>(null);
  const [showExpandModal, setShowExpandModal] = useState(false);
  const [expandedKnowledgeBase, setExpandedKnowledgeBase] = useState('');
  const expandModalRef = useRef<HTMLDivElement>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ index: number; fileName: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGenerateFAQs = async () => {
    if (!generatePrompt.trim()) {
      alert('Please describe what knowledge base content you want to generate.');
      return;
    }

    setIsGeneratingKB(true);
    setShowGenerateModal(false);
    
    try {
      const response = await fetch('/api/generate-knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: generatePrompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate content');
      }

      const data = await response.json();
      const generatedContent = data.content;

      if (generatedContent) {
        // Replace existing content with generated content (not append)
        onBotChange({ knowledgeBase: generatedContent });
        // Also update expanded modal if it's open
        if (showExpandModal) {
          setExpandedKnowledgeBase(generatedContent);
        }
        setGeneratePrompt('');
      } else {
        throw new Error('No content was generated');
      }
    } catch (error) {
      console.error('Failed to generate:', error);
      alert(`Failed to generate: ${(error as Error).message}`);
    } finally {
      setIsGeneratingKB(false);
    }
  };

  const handleOpenGenerateModal = (trigger?: HTMLElement | null) => {
    const target = trigger || generateButtonRef.current;
    if (target) {
      const buttonRect = target.getBoundingClientRect();
      setModalPosition({
        top: buttonRect.top,
        left: buttonRect.right + 8,
      });
    }
    setShowGenerateModal(true);
  };

  const handleCloseGenerateModal = () => {
    setShowGenerateModal(false);
    setGeneratePrompt('');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (generateModalRef.current && !generateModalRef.current.contains(event.target as Node)) {
        handleCloseGenerateModal();
      }
      if (expandModalRef.current && !expandModalRef.current.contains(event.target as Node)) {
        handleCloseExpandModal();
      }
    };

    if (showGenerateModal || showExpandModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showGenerateModal, showExpandModal]);

  // Sync expanded modal content when bot.knowledgeBase changes externally (e.g., from generate)
  useEffect(() => {
    if (showExpandModal) {
      setExpandedKnowledgeBase(bot.knowledgeBase || '');
    }
  }, [bot.knowledgeBase, showExpandModal]);

  const handleOpenExpandModal = () => {
    setExpandedKnowledgeBase(bot.knowledgeBase || '');
    setShowExpandModal(true);
  };

  const handleCloseExpandModal = () => {
    setShowExpandModal(false);
    setExpandedKnowledgeBase('');
  };

  const handleUpdateExpanded = () => {
    onBotChange({ knowledgeBase: expandedKnowledgeBase });
    handleCloseExpandModal();
  };

  return (
    <div className="p-6 space-y-8">
      {/* Prompt Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-blue-50 rounded-lg">
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900">Prompt & Instructions</h3>
            <p className="text-xs text-slate-500">Primary instruction set for your chatbot</p>
          </div>
          <div className="relative">
            <button
              ref={generateButtonRef}
              onClick={() => handleOpenGenerateModal(generateButtonRef.current)}
              disabled={isGeneratingKB}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingKB ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        {showGenerateModal && (
          <>
            <div className="fixed inset-0 z-[10000]" onClick={handleCloseGenerateModal} />
            <div
              ref={generateModalRef}
              className="fixed z-[10001] w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
              style={{ top: `${modalPosition.top}px`, left: `${modalPosition.left}px` }}
            >
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 rounded-lg">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">Generate Prompt</h3>
                </div>
                <input
                  type="text"
                  value={generatePrompt}
                  onChange={(e) => setGeneratePrompt(e.target.value)}
                  placeholder="Describe what knowledge base content you want to generate (e.g., FAQs about return policy, product information, company policies)"
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleGenerateFAQs();
                    } else if (e.key === 'Escape') {
                      handleCloseGenerateModal();
                    }
                  }}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCloseGenerateModal}
                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateFAQs}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    Submit Edit
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
        
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-slate-500" />
                <label className="text-xs font-medium text-slate-600">Enter your prompt and instructions</label>
              </div>
              <button
                onClick={handleOpenExpandModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Expand editor"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
            <textarea
              id="manual-knowledge-text"
              value={bot.knowledgeBase || ''}
              onChange={(e) => onBotChange({ knowledgeBase: e.target.value })}
              rows={8}
              style={{ maxHeight: '400px', minHeight: '120px' }}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm resize-y"
              placeholder="Enter your prompt and instructions for the chatbot here. This will be used as the primary instruction set for the chatbot to answer questions. (FAQs, product details, policies, etc.)..."
            />
            {bot.knowledgeBase && bot.knowledgeBase.trim().length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span>{bot.knowledgeBase.length} characters</span>
              </div>
            )}
          </div>
        </div>

        {/* Expand Modal */}
        {showExpandModal && (
          <>
            <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={handleCloseExpandModal} />
            <div
              ref={expandModalRef}
              className="fixed z-[9999] w-[90vw] max-w-4xl h-[85vh] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
              style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-blue-50 rounded-lg">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">Assistant Prompt</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    ref={modalGenerateButtonRef}
                    onClick={() => handleOpenGenerateModal(modalGenerateButtonRef.current)}
                    disabled={isGeneratingKB}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingKB ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Generate</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCloseExpandModal}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 p-6 overflow-hidden flex flex-col">
                <textarea
                  value={expandedKnowledgeBase}
                  onChange={(e) => setExpandedKnowledgeBase(e.target.value)}
                  className="w-full h-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm resize-none"
                  placeholder="Enter your prompt and instructions for the chatbot here. This will be used as the primary instruction set for the chatbot to answer questions. (FAQs, product details, policies, etc.)..."
                />
                {expandedKnowledgeBase && expandedKnowledgeBase.trim().length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-3">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <span>{expandedKnowledgeBase.length} characters</span>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
                <button
                  onClick={handleCloseExpandModal}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateExpanded}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  Update
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Additional Resources & Active Sources - Combined Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 bg-purple-50 rounded-lg">
            <Database className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Additional Resources</h3>
            <p className="text-xs text-slate-500">Upload PDF documents as supplementary knowledge</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          {/* Upload Area */}
          <div className="p-4 border-b border-slate-100">
            <label className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-center hover:bg-slate-50 hover:border-slate-400 transition-all cursor-pointer group bg-slate-50/50">
              <div className="bg-white border border-slate-200 p-3 rounded-lg group-hover:scale-105 transition-transform shadow-sm">
                <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-1">Upload PDF Document</p>
                <p className="text-xs text-slate-500">Max file size: 10MB • PDF files only</p>
              </div>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                id="pdf-upload-input"
                onChange={async (e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    if (file.type !== 'application/pdf') {
                      alert('Please upload a PDF file.');
                      e.target.value = '';
                      return;
                    }
                    if (file.size > 10 * 1024 * 1024) {
                      alert('File is too large. Max 10MB.');
                      e.target.value = '';
                      return;
                    }
                    if (bot.id) {
                      const formData = new FormData();
                      formData.append('files', file);
                      try {
                        const response = await fetch(`/api/bots/${bot.id}/files`, {
                          method: 'POST',
                          body: formData,
                        });
                        if (response.ok) {
                          const data = await response.json();
                          const uploadedFileNames = data.uploadedFiles || [];
                          const existingFiles = bot.files?.filter((f): f is string => typeof f === 'string') || [];
                          onBotChange({ files: [...existingFiles, ...uploadedFileNames] });
                        } else {
                          alert('Failed to upload file.');
                        }
                      } catch (error) {
                        console.error('Error uploading file:', error);
                        alert('Failed to upload file.');
                      }
                    } else {
                      onBotChange({ files: [...(bot.files || []), file] });
                    }
                    e.target.value = '';
                  }
                }}
              />
            </label>
          </div>

          {/* Active Sources List */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-slate-200"></div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Sources</p>
              <div className="h-px flex-1 bg-slate-200"></div>
            </div>
            
            <div className="space-y-3">
              {bot.files && bot.files.length > 0 ? (
                bot.files.map((file, index) => {
                  const fileName = typeof file === 'string' ? file : file.name;
                  const fileSize = typeof file === 'object' && file.size ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : '';
                  return (
                    <div key={index} className="bg-slate-50 rounded-lg border border-slate-200 p-3 hover:shadow-sm transition-all group">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="bg-red-50 text-red-600 p-2 rounded-lg shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate mb-0.5" title={fileName}>{fileName}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              {fileSize && <span>{fileSize}</span>}
                              {fileSize && <span>•</span>}
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                Parsed & Active
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const fileToRemove = bot.files?.[index];
                            const fileName = typeof fileToRemove === 'string' ? fileToRemove : fileToRemove?.name;
                            setFileToDelete({ index, fileName: fileName || '' });
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
                  <FileText className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-400 mb-1">No PDF files uploaded</p>
                  <p className="text-xs text-slate-400">Upload PDF documents to add them as active sources</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete File Confirmation Modal */}
      {mounted && showDeleteModal && fileToDelete && createPortal(
        <>
          <div className="fixed top-0 left-0 right-0 bottom-0 bg-black/50 backdrop-blur-sm z-[10000]" style={{ margin: 0, padding: 0 }} />
          <div className="fixed top-0 left-0 right-0 bottom-0 z-[10001] flex items-center justify-center p-4 pointer-events-none" style={{ margin: 0 }}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all pointer-events-auto">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-50 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete File?</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Are you sure you want to delete &quot;<span className="font-medium text-slate-900">{fileToDelete.fileName}</span>&quot;? This action cannot be undone and the file will be removed from your knowledge base.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        if (fileToDelete === null) return;
                        
                        const fileToRemove = bot.files?.[fileToDelete.index];
                        const fileName = typeof fileToRemove === 'string' ? fileToRemove : fileToRemove?.name;
                        
                        // If it's a string (already uploaded) and we have bot.id, delete from server
                        if (typeof fileToRemove === 'string' && bot.id && fileName) {
                          try {
                            const response = await fetch(`/api/bots/${bot.id}/files/${encodeURIComponent(fileName)}`, {
                              method: 'DELETE',
                            });

                            if (!response.ok) {
                              throw new Error('Failed to delete file');
                            }
                          } catch (error) {
                            console.error('Error deleting file:', error);
                            alert('Failed to delete file from server. Please try again.');
                            setShowDeleteModal(false);
                            setFileToDelete(null);
                            return;
                          }
                        }

                        // Update local state
                        const newFiles = bot.files?.filter((_, i) => i !== fileToDelete.index);
                        onBotChange({ files: newFiles });
                        setShowDeleteModal(false);
                        setFileToDelete(null);
                      }}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setFileToDelete(null);
                      }}
                      className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setFileToDelete(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

