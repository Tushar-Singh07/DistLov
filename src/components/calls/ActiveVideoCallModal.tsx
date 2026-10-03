import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, PhoneOff, Maximize2, Shield } from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { Avatar } from '../common/Avatar';

export const ActiveVideoCallModal: React.FC = () => {
  const { activeCall, localStream, remoteStream, endCall, toggleMute, toggleVideo, toggleScreenShare } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream to PiP video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, activeCall?.isVideoOff]);

  // Attach remote stream to main video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, activeCall?.state]);

  if (!activeCall || (activeCall.state !== 'active' && activeCall.state !== 'connecting') || activeCall.callType !== 'video') {
    return null;
  }

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isConnecting = activeCall.state === 'connecting';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-6xl h-[92vh] bg-gray-950 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Top Header Floating Status Bar */}
        <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-3 bg-black/70 backdrop-blur-md px-4 py-2 rounded-2xl border border-gray-700/60 text-white shadow-lg pointer-events-auto">
            <Avatar src={activeCall.peerUser.avatarUrl} name={activeCall.peerUser.name} size="xs" />
            <div className="flex flex-col">
              <span className="text-xs font-semibold">{activeCall.peerUser.name}</span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {isConnecting ? 'Connecting WebRTC...' : formatDuration(activeCall.durationSeconds)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-gray-700/60 text-gray-300 text-xs pointer-events-auto">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-medium hidden sm:inline">End-to-End Encrypted</span>
          </div>
        </div>

        {/* Remote Video Container */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          {remoteStream && remoteStream.getVideoTracks().length > 0 ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white p-6">
              <Avatar src={activeCall.peerUser.avatarUrl} name={activeCall.peerUser.name} size="xl" className="mb-4 shadow-2xl ring-4 ring-brand-500/30" />
              <h3 className="text-xl font-bold">{activeCall.peerUser.name}</h3>
              <p className="text-xs text-gray-400 mt-1">
                {isConnecting ? 'Establishing peer-to-peer stream...' : 'Camera Off'}
              </p>
            </div>
          )}

          {/* Local Picture-in-Picture Video */}
          <div className="absolute bottom-6 right-6 w-36 h-48 sm:w-48 sm:h-36 bg-gray-900 rounded-2xl border-2 border-white/20 overflow-hidden shadow-2xl z-20 transition-all hover:scale-105">
            {activeCall.isVideoOff || !localStream || localStream.getVideoTracks().length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-950 text-gray-400 text-xs">
                <VideoOff className="w-6 h-6 mb-1 text-red-400" />
                <span className="text-[10px] font-medium">Your Camera Off</span>
              </div>
            ) : (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
            )}
          </div>
        </div>

        {/* Bottom Call Toolbar */}
        <div className="p-4 bg-gray-950/90 backdrop-blur-md border-t border-gray-800 flex items-center justify-center gap-3 sm:gap-5 z-30">
          <button
            onClick={toggleMute}
            className={`p-3.5 sm:p-4 rounded-2xl transition-all transform active:scale-95 ${
              activeCall.isMuted
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-gray-800/90 text-gray-200 hover:bg-gray-700'
            }`}
            title={activeCall.isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {activeCall.isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3.5 sm:p-4 rounded-2xl transition-all transform active:scale-95 ${
              activeCall.isVideoOff
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-gray-800/90 text-gray-200 hover:bg-gray-700'
            }`}
            title={activeCall.isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {activeCall.isVideoOff ? <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <VideoIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-3.5 sm:p-4 rounded-2xl transition-all transform active:scale-95 ${
              activeCall.isScreenSharing
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30'
                : 'bg-gray-800/90 text-gray-200 hover:bg-gray-700'
            }`}
            title={activeCall.isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            <Monitor className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          <button
            onClick={endCall}
            className="p-3.5 sm:p-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-600/40 transition-all transform active:scale-95 ml-2 sm:ml-4"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
