import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Attachment } from '../../types';
import { resolveMediaUrl } from '../../utils/mediaUrl';

interface AudioPlayerProps {
  attachment: Attachment;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ attachment }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileUrl = resolveMediaUrl(attachment.fileUrl || attachment.url, attachment.id || attachment.attachmentId);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 max-w-sm mt-1.5">
      <audio
        ref={audioRef}
        src={fileUrl}
        onEnded={() => setIsPlaying(false)}
        preload="metadata"
      />
      <button
        onClick={togglePlay}
        className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0 hover:bg-brand-700 transition-colors shadow-sm"
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
          <span className="flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-brand-500" /> Voice Message
          </span>
          <span className="text-[10px] text-gray-400">0:{attachment.durationSeconds || '42'}</span>
        </div>
        {/* Mock Waveform indicator */}
        <div className="flex items-center gap-0.5 h-4">
          {[40, 65, 30, 80, 100, 45, 60, 90, 35, 70, 50, 85, 30, 95, 60, 40].map((h, idx) => (
            <div
              key={idx}
              className={`w-1 rounded-full transition-all ${
                isPlaying && idx < 8 ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
