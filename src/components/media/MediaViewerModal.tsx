import React from 'react';
import { X, Download } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { resolveMediaUrl } from '../../utils/mediaUrl';

export const MediaViewerModal: React.FC = () => {
  const { activeMediaViewer, setActiveMediaViewer } = useChat();

  if (!activeMediaViewer) return null;

  const isVideo = activeMediaViewer.mimeType.startsWith('video/');
  const fileUrl = resolveMediaUrl(activeMediaViewer.url || activeMediaViewer.fileUrl, activeMediaViewer.id || activeMediaViewer.attachmentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        <a
          href={fileUrl}
          download
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Download Media"
        >
          <Download className="w-5 h-5" />
        </a>
        <button
          onClick={() => setActiveMediaViewer(null)}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-4xl max-h-[85vh] flex items-center justify-center overflow-hidden rounded-2xl">
        {isVideo ? (
          <video src={fileUrl} controls autoPlay className="max-w-full max-h-[85vh] rounded-2xl" />
        ) : (
          <img src={fileUrl} alt="Media preview" className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
        )}
      </div>
    </div>
  );
};
