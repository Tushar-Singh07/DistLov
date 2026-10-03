import React, { useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, Shield } from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { Avatar } from '../common/Avatar';

export const ActiveVoiceCallModal: React.FC = () => {
  const { activeCall, endCall, toggleMute } = useCall();
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);

  if (!activeCall || (activeCall.state !== 'active' && activeCall.state !== 'connecting') || activeCall.callType !== 'voice') {
    return null;
  }

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isConnecting = activeCall.state === 'connecting';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
      <div className="bg-dark-panel border border-gray-800 rounded-3xl p-8 max-w-md w-full text-center text-white shadow-2xl animate-slide-up flex flex-col items-center relative overflow-hidden">
        {/* Top Encryption Badge */}
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-3 py-1 rounded-full mb-6">
          <Shield className="w-3 h-3" />
          <span>Encrypted Voice Call</span>
        </div>

        {/* Peer Avatar & Pulsing Glow */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping ring-8 ring-brand-500/10" />
          <Avatar src={activeCall.peerUser.avatarUrl} name={activeCall.peerUser.name} size="xl" className="relative z-10 shadow-2xl" />
        </div>

        <h3 className="text-2xl font-bold text-gray-100">{activeCall.peerUser.name}</h3>
        <p className="text-xs text-brand-400 font-mono mt-1 flex items-center gap-1.5 justify-center">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {isConnecting ? 'Connecting...' : formatDuration(activeCall.durationSeconds)}
        </p>

        {/* Live Animated Audio Waves */}
        <div className="flex items-center gap-1.5 my-8 h-10">
          {[40, 75, 30, 90, 100, 55, 80, 45, 85, 35, 60, 95].map((h, i) => (
            <div
              key={i}
              className={`w-1.5 rounded-full transition-all duration-300 ${
                activeCall.isMuted ? 'bg-gray-700 h-2' : 'bg-brand-500 animate-pulse'
              }`}
              style={{
                height: activeCall.isMuted ? '8px' : `${h}%`,
                animationDelay: `${i * 120}ms`,
              }}
            />
          ))}
        </div>

        {/* Call Action Controls */}
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={toggleMute}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all transform active:scale-95 ${
              activeCall.isMuted
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            title={activeCall.isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {activeCall.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button
            onClick={endCall}
            className="w-16 h-16 rounded-2xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-xl shadow-red-600/40 transition-all transform active:scale-95"
            title="End Call"
          >
            <PhoneOff className="w-7 h-7" />
          </button>

          <button
            onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all transform active:scale-95 ${
              isSpeakerMuted ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            title={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
          >
            {isSpeakerMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </div>
  );
};
