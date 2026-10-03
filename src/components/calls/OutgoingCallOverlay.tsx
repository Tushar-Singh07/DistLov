import React from 'react';
import { PhoneOff, Video, Phone } from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { Avatar } from '../common/Avatar';

export const OutgoingCallOverlay: React.FC = () => {
  const { activeCall, cancelCall } = useCall();

  if (!activeCall || activeCall.state !== 'outgoing') return null;

  const isVideo = activeCall.callType === 'video';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-dark-panel border border-gray-800 rounded-3xl p-8 max-w-sm w-full text-center text-white shadow-2xl animate-slide-up flex flex-col items-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping ring-8 ring-brand-500/10" />
          <Avatar src={activeCall.peerUser.avatarUrl} name={activeCall.peerUser.name} size="xl" className="relative z-10 shadow-xl" />
          <span className="absolute bottom-0 right-0 z-20 w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center border-2 border-dark-panel shadow-md">
            {isVideo ? <Video className="w-4 h-4 text-white" /> : <Phone className="w-4 h-4 text-white" />}
          </span>
        </div>

        <h3 className="text-xl font-bold">{activeCall.peerUser.name}</h3>
        <p className="text-xs text-brand-400 mt-1 font-medium animate-pulse">
          Calling {activeCall.peerUser.name}...
        </p>

        <button
          onClick={cancelCall}
          className="flex flex-col items-center gap-2 group mt-8"
        >
          <div className="w-14 h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition-all transform group-hover:scale-105 active:scale-95">
            <PhoneOff className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-medium text-gray-400 group-hover:text-red-400 transition-colors">Cancel Call</span>
        </button>
      </div>
    </div>
  );
};
