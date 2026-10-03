import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, AlertCircle } from 'lucide-react';
import { useCall } from '../../context/CallContext';

export const ActiveCallOverlay: React.FC = () => {
  const {
    activeCall,
    localStream,
    remoteStream,
    errorMessage,
    endCall,
    cancelCall,
    toggleMute,
    toggleCamera,
    clearCallError,
  } = useCall();

  const callState = activeCall?.state || 'idle';
  const callType = activeCall?.callType || 'voice';
  const peerUser = activeCall?.peerUser;
  const isMuted = !!activeCall?.isMuted;
  const isCameraOff = !!activeCall?.isVideoOff;
  const callDuration = activeCall?.durationSeconds || 0;

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Attach local stream to local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to remote video/audio element
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream]);

  if (callState === 'idle' || callState === 'incoming') {
    if (!errorMessage) return null;
    return (
      <div className="fixed top-4 right-4 z-50 p-4 bg-red-600 text-white rounded-2xl shadow-xl flex items-center gap-3 animate-slide-in">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span className="text-xs font-semibold">{errorMessage}</span>
        <button onClick={clearCallError} className="ml-2 text-xs font-bold underline">Dismiss</button>
      </div>
    );
  }

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isVideoMode = callType === 'video';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg animate-fade-in p-4">
      {/* Hidden Audio element for remote voice stream */}
      <audio ref={remoteAudioRef} autoPlay />

      <div className="relative w-full max-w-4xl h-[80vh] bg-gray-950 rounded-3xl overflow-hidden shadow-2xl border border-gray-800 flex flex-col justify-between">
        {/* Status Bar */}
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">{peerUser?.name || 'Contact'}</span>
          </div>

          <div className="font-mono text-xs font-bold text-gray-300">
            {callState === 'active' ? (
              <span>{formatDuration(callDuration)}</span>
            ) : (
              <span className="capitalize">{callState}...</span>
            )}
          </div>
        </div>

        {/* Video / Main Screen */}
        {isVideoMode ? (
          <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
            {/* Remote Video */}
            {remoteStream && remoteStream.getVideoTracks().length > 0 ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6">
                <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center text-3xl font-bold text-gray-400 mb-4 shadow-lg">
                  {peerUser?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <p className="text-sm font-semibold text-gray-300">
                  {callState === 'active' ? 'Camera disabled by remote user' : 'Connecting video stream...'}
                </p>
              </div>
            )}

            {/* Local Video Picture-in-Picture */}
            <div className="absolute bottom-20 right-4 w-36 h-48 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl bg-gray-900 z-20">
              {isCameraOff ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-900 text-xs text-gray-400">
                  Camera Off
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>
        ) : (
          /* Voice Call UI */
          <div className="relative w-full h-full flex flex-col items-center justify-center p-6">
            <div className="relative w-32 h-32 mb-6">
              <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping" />
              <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-brand-500/40 shadow-2xl bg-gray-800 flex items-center justify-center">
                {peerUser?.profilePhoto ? (
                  <img src={peerUser.profilePhoto} alt={peerUser.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-gray-200">
                    {peerUser?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                )}
              </div>
            </div>

            <h2 className="text-xl font-bold text-white mb-1">{peerUser?.name}</h2>
            <p className="text-xs text-gray-400 mb-4">@{peerUser?.username}</p>
            <div className="px-4 py-1.5 rounded-full bg-white/10 text-brand-300 text-xs font-mono">
              {callState === 'active' ? formatDuration(callDuration) : callState}
            </div>
          </div>
        )}

        {/* Control Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 p-3 rounded-full bg-black/60 backdrop-blur-xl border border-white/15 shadow-2xl">
          {/* Mute Toggle */}
          <button
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-md ${
              isMuted ? 'bg-amber-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Camera Toggle (Video Call Only) */}
          {isVideoMode && (
            <button
              onClick={toggleCamera}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-md ${
                isCameraOff ? 'bg-amber-500 text-white' : 'bg-white/15 text-white hover:bg-white/25'
              }`}
              title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          {/* End / Cancel Call Button */}
          <button
            onClick={callState === 'calling' || callState === 'ringing' ? cancelCall : endCall}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
