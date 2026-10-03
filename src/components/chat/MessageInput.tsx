import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import {
  Paperclip,
  Smile,
  Mic,
  Send,
  X,
  Image as ImageIcon,
  FileText,
  Music,
  File as FileIcon,
  Edit2,
  Loader2,
  UploadCloud
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { Dropdown } from '../common/Dropdown';
import { EmojiPicker } from '../common/EmojiPicker';

export const MessageInput: React.FC = () => {
  const {
    sendMessage,
    sendAttachmentMessage,
    replyingToMessage,
    setReplyingToMessage,
    editingMessage,
    setEditingMessage,
    handleStartTyping
  } = useChat();

  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

  // Dedicated file input refs for specific media types
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const anyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content || '');
    }
  }, [editingMessage]);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleSelectFile = (file: File) => {
    if (!file) return;

    // File size check warning (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File size exceeds 50MB limit.');
      return;
    }

    setUploadingFile(file);
    setUploadError(null);
    setUploadProgress(0);

    // If image, create client-side preview URL
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleSelectFile(files[0]);
    }
    e.target.value = '';
  };

  const cancelUpload = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setUploadingFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    setIsUploading(false);
    setUploadError(null);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() && !uploadingFile) return;

    if (uploadingFile) {
      const fileToUpload = uploadingFile;
      const captionText = text.trim();
      setIsUploading(true);
      setUploadError(null);

      try {
        await sendAttachmentMessage(fileToUpload, captionText, (percent) => {
          setUploadProgress(percent);
        });
        cancelUpload();
        setText('');
      } catch (err: any) {
        setUploadError(err.message || 'File upload failed');
        setIsUploading(false);
      }
      return;
    }

    sendMessage(text);
    setText('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    if (e.target.value.trim()) {
      handleStartTyping();
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSelectFile(e.dataTransfer.files[0]);
    }
  };

  const attachmentOptions = [
    {
      label: 'Photos & Videos',
      icon: <ImageIcon className="w-4 h-4 text-emerald-500" />,
      onClick: () => mediaInputRef.current?.click()
    },
    {
      label: 'Audio & Music',
      icon: <Music className="w-4 h-4 text-purple-500" />,
      onClick: () => audioInputRef.current?.click()
    },
    {
      label: 'Documents & PDFs',
      icon: <FileText className="w-4 h-4 text-brand-500" />,
      onClick: () => docInputRef.current?.click()
    },
    {
      label: 'All File Types',
      icon: <Paperclip className="w-4 h-4 text-amber-500" />,
      onClick: () => anyInputRef.current?.click()
    }
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="p-3.5 glass-panel border-t border-gray-200/80 dark:border-gray-800/80 relative"
    >
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={mediaInputRef}
        accept="image/*,video/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        type="file"
        ref={audioInputRef}
        accept="audio/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        type="file"
        ref={docInputRef}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        type="file"
        ref={anyInputRef}
        accept="*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-brand-500/15 dark:bg-brand-500/25 backdrop-blur-sm border-2 border-dashed border-brand-500 rounded-2xl flex items-center justify-center z-30 transition-all pointer-events-none">
          <div className="flex items-center gap-2 text-brand-600 dark:text-brand-300 font-bold text-sm bg-white dark:bg-dark-panel px-4 py-2 rounded-xl shadow-lg">
            <UploadCloud className="w-5 h-5 animate-bounce text-brand-500" />
            <span>Drop media or file to attach</span>
          </div>
        </div>
      )}

      {/* Optimized Pre-Send Attachment Preview Bar */}
      {uploadingFile && (
        <div className="p-3 bg-white/90 dark:bg-dark-panel/90 backdrop-blur-md rounded-2xl mb-2 border border-brand-200 dark:border-brand-900/60 shadow-md space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Image Preview Thumbnail or File Icon Badge */}
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Attachment Preview"
                  className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-gray-700 shrink-0 shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-300 flex items-center justify-center shrink-0 border border-brand-200 dark:border-brand-800">
                  {uploadingFile.type.startsWith('video/') ? (
                    <ImageIcon className="w-6 h-6 text-purple-500" />
                  ) : uploadingFile.type.startsWith('audio/') ? (
                    <Music className="w-6 h-6 text-purple-500" />
                  ) : (
                    <FileIcon className="w-6 h-6 text-brand-500" />
                  )}
                </div>
              )}

              <div className="min-w-0">
                <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                  {uploadingFile.name}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                  <span className="font-semibold text-brand-600 dark:text-brand-400 uppercase">
                    {uploadingFile.type.split('/')[1] || 'FILE'}
                  </span>
                  <span>•</span>
                  <span>{formatFileSize(uploadingFile.size)}</span>
                </div>
              </div>
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={cancelUpload}
              disabled={isUploading}
              className="p-1.5 rounded-full text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
              title="Remove attachment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="pt-1">
              <div className="flex items-center justify-between text-[10px] font-semibold text-brand-600 dark:text-brand-400 mb-1">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Uploading to Cloudinary...
                </span>
                <span>{uploadProgress || 20}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-600 transition-all duration-200"
                  style={{ width: `${uploadProgress || 20}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="flex items-center justify-between p-2.5 bg-rose-50 dark:bg-rose-950/60 rounded-xl mb-2 text-xs border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="p-1 hover:text-rose-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editing Banner */}
      {editingMessage && (
        <div className="flex items-center justify-between px-3 py-2 bg-amber-50 dark:bg-amber-950/60 rounded-xl mb-2 text-xs border border-amber-200 dark:border-amber-800">
          <div className="truncate flex items-center gap-2">
            <Edit2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-amber-700 dark:text-amber-300">Editing message</span>
              <p className="text-gray-600 dark:text-gray-300 truncate">{editingMessage.content}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingMessage(null);
              setText('');
            }}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Replying banner */}
      {!editingMessage && replyingToMessage && (
        <div className="flex items-center justify-between px-3 py-2 bg-brand-50 dark:bg-brand-950/60 rounded-xl mb-2 text-xs border border-brand-200 dark:border-brand-800">
          <div className="truncate">
            <span className="font-semibold text-brand-700 dark:text-brand-300">Replying to message</span>
            <p className="text-gray-600 dark:text-gray-300 truncate">{replyingToMessage.content}</p>
          </div>
          <button
            onClick={() => setReplyingToMessage(null)}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isRecording ? (
        <div className="flex items-center justify-between p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900 animate-pulse">
          <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 text-sm font-semibold">
            <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
            <span>Recording Voice Message (0:04)...</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRecording(false)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setIsRecording(false);
                sendMessage('Voice Message', 'audio');
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700"
            >
              Send Voice
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSend} className="flex items-center gap-2">
          {/* Main Attachment Dropdown Menu */}
          <Dropdown
            trigger={
              <button
                type="button"
                className={`p-2.5 rounded-xl transition-all ${
                  uploadingFile
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-brand-600 dark:hover:text-brand-400'
                }`}
                title="Attach photos, videos, or documents"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            }
            items={attachmentOptions}
            align="left"
          />

          {/* Quick Direct Photo & Video Picker */}
          <button
            type="button"
            onClick={() => mediaInputRef.current?.click()}
            className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-emerald-500 transition-colors hidden sm:block"
            title="Quick attach photo or video"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Emoji Button & Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={clsx(
                'p-2.5 rounded-xl transition-all',
                showEmojiPicker
                  ? 'bg-amber-500/15 text-amber-500 dark:bg-amber-500/25'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-amber-500'
              )}
              title="Emoji picker"
            >
              <Smile className="w-5 h-5" />
            </button>

            {showEmojiPicker && (
              <div className="fixed inset-x-3 bottom-20 sm:absolute sm:inset-auto sm:bottom-12 sm:left-0 z-50 shadow-2xl flex justify-center sm:block">
                <EmojiPicker
                  onSelectEmoji={(emoji) => {
                    setText(prev => prev + emoji);
                  }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
          </div>

          {/* Text Input */}
          <input
            type="text"
            value={text}
            onChange={handleInputChange}
            placeholder={
              uploadingFile
                ? 'Add an optional caption and press send...'
                : editingMessage
                ? 'Edit message...'
                : 'Write a message or drop files here...'
            }
            className="flex-1 bg-gray-100 dark:bg-dark-panel text-gray-900 dark:text-gray-100 text-sm rounded-xl px-4 py-2.5 border border-transparent focus:border-brand-500 focus:bg-white dark:focus:bg-dark-panel focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />

          {/* Voice recording or Send */}
          {!text.trim() && !uploadingFile ? (
            <button
              type="button"
              onClick={() => setIsRecording(true)}
              className="p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-purple-500 transition-colors"
              title="Record Voice Note"
            >
              <Mic className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isUploading}
              className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white transition-colors shadow-sm disabled:opacity-50"
              title="Send Message"
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          )}
        </form>
      )}
    </div>
  );
};
