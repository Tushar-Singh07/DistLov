import React from 'react';
import { FileText, Download, Eye } from 'lucide-react';
import { Attachment } from '../../types';
import { useChat } from '../../context/ChatContext';
import { API_BASE_URL } from '../../services/api';
import { resolveMediaUrl } from '../../utils/mediaUrl';

interface FileAttachmentCardProps {
  attachment: Attachment;
}

export const FileAttachmentCard: React.FC<FileAttachmentCardProps> = ({ attachment }) => {
  const { setActiveMediaViewer } = useChat();

  const fileUrl = resolveMediaUrl(attachment.fileUrl || attachment.url, attachment.id || attachment.attachmentId);
  const downloadUrl = fileUrl.includes('?') ? `${fileUrl}&download=true` : `${fileUrl}?download=true`;

  const mime = (attachment.mimeType || '').toLowerCase();
  const ext = (attachment.originalName || '').toLowerCase();

  const isImage = mime.startsWith('image/') ||
    ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png') ||
    ext.endsWith('.webp') || ext.endsWith('.gif') || ext.endsWith('.bmp');

  const isVideo = mime.startsWith('video/') ||
    ext.endsWith('.mp4') || ext.endsWith('.webm') || ext.endsWith('.mov') || ext.endsWith('.avi');

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isImage) {
    return (
      <div
        onClick={() => setActiveMediaViewer({ ...attachment, url: fileUrl })}
        className="group relative rounded-xl overflow-hidden cursor-pointer border border-gray-200 dark:border-gray-700 max-w-sm mt-1.5"
      >
        <img
          src={fileUrl}
          alt={attachment.originalName || 'Attachment'}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300 bg-gray-100 dark:bg-dark-panel"
          loading="lazy"
          onError={(e) => {
            console.warn('[Image Load Error]:', fileUrl);
          }}
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2">
          <Eye className="w-5 h-5" />
          <span className="text-xs font-semibold">View Image</span>
        </div>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 max-w-sm mt-1.5 bg-black">
        <video
          src={fileUrl}
          controls
          preload="metadata"
          className="w-full max-h-60 object-contain bg-black"
        />
        <div className="p-2 bg-gray-900 text-white text-xs flex justify-between items-center">
          <span className="truncate">{attachment.originalName}</span>
          <a
            href={downloadUrl}
            download={attachment.originalName}
            className="p-1 text-gray-300 hover:text-white"
            title="Download Video"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 max-w-sm mt-1.5">
      <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-300 flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{attachment.originalName}</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{formatBytes(attachment.fileSize || attachment.size)}</p>
      </div>
      <a
        href={downloadUrl}
        download={attachment.originalName}
        className="p-2 text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title="Download"
      >
        <Download className="w-4 h-4" />
      </a>
    </div>
  );
};
