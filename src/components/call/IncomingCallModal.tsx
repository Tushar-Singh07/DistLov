import React from 'react';
import { Phone, PhoneOff, Video, Mic } from 'lucide-react';
import { useCall } from '../../context/CallContext';

export const IncomingCallModal: React.FC = () => {
  const { activeCall, acceptCall, rejectCall } = useCall();
  const peerUser = activeCall?.peerUser;

  if (!activeCall || activeCall.state !== 'incoming' || !peerUser) return null;
  const callType = activeCall.callType;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in p-4">
      <div className="w-full max-w-sm bg-white dark:bg-dark-panel rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800 text-center relative overflow-hidden">
        {/* Animated pulsing background effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-500/10 to-transparent pointer-events-none" />

        {/* Call Type Icon Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-300 text-xs font-semibold mb-6">
          {callType === 'video' ? <Video className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          <span>Incoming {callType === 'video' ? 'Video' : 'Voice'} Call</span>
        </div>

        {/* Caller Avatar */}
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full bg-brand-500/30 animate-ping" />
          <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            {peerUser.profilePhoto ? (
              <img src={peerUser.profilePhoto} alt={peerUser.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-gray-600 dark:text-gray-300">
                {peerUser.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Caller Name & Info */}
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{peerUser.name}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-8">@{peerUser.username}</p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-6">
          {/* Reject */}
          <button
            onClick={rejectCall}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
            title="Decline Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Accept */}
          <button
            onClick={acceptCall}
            className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 animate-bounce"
            title="Accept Call"
          >
            <Phone className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
