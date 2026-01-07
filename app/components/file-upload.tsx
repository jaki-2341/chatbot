'use client';

import { useCallback, useState } from 'react';
import { Upload, X, File, Loader2 } from 'lucide-react';

interface FileUploadProps {
  files: (File | string)[];
  onFilesChange: (files: (File | string)[]) => void;
  botId?: string;
  onUploadComplete?: () => void;
}

export default function FileUpload({ files, onFilesChange, botId, onUploadComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: boolean }>({});

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const uploadFiles = useCallback(async (filesToUpload: File[]) => {
    if (!botId) {
      alert('Please save the bot first before uploading files.');
      return;
    }

    setUploading(true);
    const progress: { [key: string]: boolean } = {};
    filesToUpload.forEach((file) => {
      progress[file.name] = true;
    });
    setUploadProgress(progress);

    try {
      const formData = new FormData();
      filesToUpload.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch(`/api/bots/${botId}/files`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload files');
      }

      const data = await response.json();
      
      // Update files list with uploaded file names
      const uploadedFileNames = data.uploadedFiles || [];
      const existingFiles = files.filter((f): f is string => typeof f === 'string');
      onFilesChange([...existingFiles, ...uploadedFileNames]);

      if (data.errors && data.errors.length > 0) {
        alert(`Some files failed to upload:\n${data.errors.join('\n')}`);
      }

      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert(`Failed to upload files: ${(error as Error).message}`);
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  }, [botId, files, onFilesChange, onUploadComplete]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files).filter(
        (file) => file.type === 'application/pdf' || file.type.includes('text') || file.type.includes('document')
      );

      if (droppedFiles.length === 0) return;

      // If botId exists, upload files immediately
      if (botId) {
        await uploadFiles(droppedFiles);
      } else {
        // Otherwise, just add to state (will be uploaded when bot is saved)
        onFilesChange([...files, ...droppedFiles]);
      }
    },
    [files, onFilesChange, botId, uploadFiles]
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files).filter(
          (file) => file.type === 'application/pdf' || file.type.includes('text') || file.type.includes('document')
        );

        if (selectedFiles.length === 0) return;

        // If botId exists, upload files immediately
        if (botId) {
          await uploadFiles(selectedFiles);
        } else {
          // Otherwise, just add to state (will be uploaded when bot is saved)
          onFilesChange([...files, ...selectedFiles]);
        }
      }
    },
    [files, onFilesChange, botId, uploadFiles]
  );

  const removeFile = useCallback(
    async (index: number) => {
      const fileToRemove = files[index];
      
      // If it's a string (already uploaded) and we have botId, delete from server
      if (typeof fileToRemove === 'string' && botId) {
        try {
          const response = await fetch(`/api/bots/${botId}/files/${encodeURIComponent(fileToRemove)}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            throw new Error('Failed to delete file');
          }
        } catch (error) {
          console.error('Error deleting file:', error);
          alert('Failed to delete file from server. It will be removed from the list.');
        }
      }

      const newFiles = files.filter((_, i) => i !== index);
      onFilesChange(newFiles);
    },
    [files, onFilesChange, botId]
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
      >
        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 mb-1">
          Drag and drop files here, or{' '}
          <label className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium">
            browse
            <input
              type="file"
              multiple
              accept=".pdf,.txt,.doc,.docx"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </p>
        <p className="text-xs text-gray-500">PDF, TXT, DOC, DOCX up to 10MB</p>
      </div>

      {uploading && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Uploading files...</span>
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => {
            const fileName = typeof file === 'string' ? file : file.name;
            const fileSize = typeof file === 'string' ? 0 : file.size;
            const isUploading = typeof file === 'object' && uploadProgress[file.name];
            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                  ) : (
                    <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
                    {fileSize > 0 && (
                      <p className="text-xs text-gray-500">{formatFileSize(fileSize)}</p>
                    )}
                    {typeof file === 'string' && (
                      <p className="text-xs text-green-600">✓ Uploaded</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  disabled={isUploading}
                  className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

