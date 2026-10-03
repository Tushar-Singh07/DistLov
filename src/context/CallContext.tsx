import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { socketService } from '../services/socketService';
import { webrtcService } from '../services/webrtcService';
import { soundEffects } from '../utils/soundEffects';
import { useAuth } from './AuthContext';

export type CallState = 'idle' | 'outgoing' | 'calling' | 'ringing' | 'incoming' | 'connecting' | 'active' | 'ended';
export type CallType = 'voice' | 'video';

export interface CallPeerUser {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  profilePhoto?: string | null;
}

export interface ActiveCall {
  id: string;
  callId?: string;
  conversationId: string;
  peerUser: CallPeerUser;
  callType: CallType;
  state: CallState;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing?: boolean;
  durationSeconds: number;
}

interface CallContextType {
  activeCall: ActiveCall | null;
  callState: CallState;
  callType: CallType;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  errorMessage: string | null;

  startCall: (targetUserId: string | CallPeerUser, conversationIdOrType?: string, type?: CallType, targetUserObj?: CallPeerUser) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  cancelCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleCamera: () => void;
  toggleScreenShare: () => Promise<void>;
  clearCallError: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentCallIdRef = useRef<string | null>(null);
  currentCallIdRef.current = activeCall?.id || activeCall?.callId || null;

  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Sound effects controller for state transitions
  useEffect(() => {
    if (!activeCall) {
      soundEffects.stopRingtone();
      return;
    }

    if (activeCall.state === 'incoming') {
      soundEffects.startIncomingRing();
    } else if (activeCall.state === 'outgoing') {
      soundEffects.startOutgoingRingback();
    } else if (activeCall.state === 'active') {
      soundEffects.stopRingtone();
    } else if (activeCall.state === 'ended') {
      soundEffects.playCallEndedBeep();
    }
  }, [activeCall?.state]);

  // Handle remote audio stream binding
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const resetCallState = () => {
    soundEffects.stopRingtone();
    webrtcService.destroy();
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startDurationTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveCall((prev) => (prev ? { ...prev, durationSeconds: prev.durationSeconds + 1 } : null));
    }, 1000);
  };

  // Socket Signaling Listeners
  useEffect(() => {
    if (!isAuthenticated) {
      resetCallState();
      return;
    }

    const unsubIncoming = socketService.onIncomingCall(({ callId, conversationId, caller, callType }) => {
      if (activeCall && activeCall.state !== 'idle') {
        socketService.rejectCall(callId, 'busy');
        return;
      }

      const peerUser: CallPeerUser = {
        id: caller.id || caller._id || '',
        name: caller.name || 'Caller',
        username: caller.username || 'caller',
        avatarUrl: caller.profilePhoto || caller.avatarUrl || '',
        profilePhoto: caller.profilePhoto || caller.avatarUrl || null,
      };

      setActiveCall({
        id: callId,
        callId,
        conversationId,
        peerUser,
        callType,
        state: 'incoming',
        isMuted: false,
        isVideoOff: false,
        isScreenSharing: false,
        durationSeconds: 0,
      });
    });

    const unsubAccepted = socketService.onCallAccepted(async ({ callId: acceptedId }) => {
      if (acceptedId === currentCallIdRef.current) {
        setActiveCall((prev) => (prev ? { ...prev, state: 'connecting' } : null));

        try {
          const offer = await webrtcService.createOffer();
          socketService.sendCallOffer(acceptedId, offer);
        } catch (err: any) {
          setErrorMessage(err.message || 'Failed to negotiate WebRTC connection');
          resetCallState();
        }
      }
    });

    const unsubRejected = socketService.onCallRejected(({ reason }) => {
      setErrorMessage(reason === 'busy' ? 'User is on another call' : 'Call was declined');
      setActiveCall((prev) => (prev ? { ...prev, state: 'ended' } : null));
      setTimeout(resetCallState, 2000);
    });

    const unsubCancelled = socketService.onCallCancelled(() => {
      setErrorMessage('Call was cancelled');
      setActiveCall((prev) => (prev ? { ...prev, state: 'ended' } : null));
      setTimeout(resetCallState, 2000);
    });

    const unsubOffer = socketService.onCallOffer(async ({ callId: offerCallId, sdp }) => {
      if (offerCallId === currentCallIdRef.current) {
        try {
          await webrtcService.setRemoteDescription(sdp);
          const answer = await webrtcService.createAnswer();
          socketService.sendCallAnswer(offerCallId, answer);
          setActiveCall((prev) => (prev ? { ...prev, state: 'active' } : null));
          startDurationTimer();
        } catch (err: any) {
          setErrorMessage(err.message || 'Failed to process offer');
        }
      }
    });

    const unsubAnswer = socketService.onCallAnswer(async ({ callId: answerCallId, sdp }) => {
      if (answerCallId === currentCallIdRef.current) {
        try {
          await webrtcService.setRemoteDescription(sdp);
          setActiveCall((prev) => (prev ? { ...prev, state: 'active' } : null));
          startDurationTimer();
        } catch (err: any) {
          setErrorMessage(err.message || 'Failed to process answer');
        }
      }
    });

    const unsubCandidate = socketService.onIceCandidate(async ({ callId: candCallId, candidate }) => {
      if (candCallId === currentCallIdRef.current && candidate) {
        await webrtcService.addIceCandidate(candidate);
      }
    });

    const unsubEnded = socketService.onCallEnded(({ durationSeconds }) => {
      setActiveCall((prev) => (prev ? { ...prev, state: 'ended', durationSeconds: durationSeconds || prev.durationSeconds } : null));
      setTimeout(resetCallState, 1500);
    });

    const unsubBusy = socketService.onCallBusy(({ message }) => {
      setErrorMessage(message || 'User is busy');
      setActiveCall((prev) => (prev ? { ...prev, state: 'ended' } : null));
      setTimeout(resetCallState, 2500);
    });

    const unsubFailed = socketService.onCallFailed(({ message }) => {
      setErrorMessage(message || 'Call failed');
      setActiveCall((prev) => (prev ? { ...prev, state: 'ended' } : null));
      setTimeout(resetCallState, 2500);
    });

    const unsubInitiated = socketService.onCallInitiated(({ callId }) => {
      setActiveCall((prev) => (prev ? { ...prev, id: callId, callId } : null));
    });

    return () => {
      unsubInitiated();
      unsubIncoming();
      unsubAccepted();
      unsubRejected();
      unsubCancelled();
      unsubOffer();
      unsubAnswer();
      unsubCandidate();
      unsubEnded();
      unsubBusy();
      unsubFailed();
    };
  }, [isAuthenticated, activeCall?.id, activeCall?.state]);

  const startCall = async (
    targetParam: string | CallPeerUser,
    convIdOrType?: string,
    typeParam?: CallType,
    targetUserObj?: CallPeerUser
  ) => {
    let targetUserId = typeof targetParam === 'string' ? targetParam : targetParam.id;
    let targetUser: CallPeerUser = typeof targetParam === 'object'
      ? targetParam
      : targetUserObj || { id: targetUserId, name: 'Contact', username: 'contact' };
    let convId = typeof convIdOrType === 'string' ? convIdOrType : '';
    let callType: CallType = (typeParam || (typeof convIdOrType === 'string' && (convIdOrType === 'voice' || convIdOrType === 'video') ? convIdOrType : 'voice')) as CallType;

    if (activeCall && activeCall.state !== 'idle') return;

    setActiveCall({
      id: '',
      conversationId: convId,
      peerUser: targetUser,
      callType,
      state: 'outgoing',
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
      durationSeconds: 0,
    });
    setErrorMessage(null);

    try {
      const stream = await webrtcService.getUserMedia(callType === 'video');
      setLocalStream(stream);

      webrtcService.createPeerConnection(
        (candidate) => {
          if (currentCallIdRef.current) {
            socketService.sendIceCandidate(currentCallIdRef.current, candidate);
          }
        },
        (rStream) => {
          setRemoteStream(rStream);
        },
        (connState) => {
          if (connState === 'failed' || connState === 'closed') {
            setErrorMessage('Call connection lost');
            resetCallState();
          }
        }
      );

      socketService.initiateCall(convId, targetUserId, callType);
    } catch (err: any) {
      setErrorMessage(err.message || 'Media permission denied or device error');
      resetCallState();
    }
  };

  const acceptCall = async () => {
    if (!activeCall || activeCall.state !== 'incoming') return;

    try {
      const stream = await webrtcService.getUserMedia(activeCall.callType === 'video');
      setLocalStream(stream);

      webrtcService.createPeerConnection(
        (candidate) => {
          if (currentCallIdRef.current) {
            socketService.sendIceCandidate(currentCallIdRef.current, candidate);
          }
        },
        (rStream) => {
          setRemoteStream(rStream);
        },
        (connState) => {
          if (connState === 'failed' || connState === 'closed') {
            setErrorMessage('Call connection lost');
            resetCallState();
          }
        }
      );

      socketService.acceptCall(activeCall.id);
      setActiveCall((prev) => (prev ? { ...prev, state: 'connecting' } : null));
    } catch (err: any) {
      setErrorMessage(err.message || 'Media access error');
      rejectCall();
    }
  };

  const rejectCall = () => {
    if (activeCall?.id) {
      socketService.rejectCall(activeCall.id);
    }
    resetCallState();
  };

  const cancelCall = () => {
    if (activeCall?.id) {
      socketService.cancelCall(activeCall.id);
    }
    resetCallState();
  };

  const endCall = () => {
    if (activeCall?.id) {
      socketService.endCall(activeCall.id);
    }
    resetCallState();
  };

  const toggleMute = () => {
    if (!activeCall) return;
    const nextState = !activeCall.isMuted;
    webrtcService.toggleAudio(!nextState);
    setActiveCall((prev) => (prev ? { ...prev, isMuted: nextState } : null));
  };

  const toggleVideo = () => {
    if (!activeCall) return;
    const nextState = !activeCall.isVideoOff;
    webrtcService.toggleVideo(!nextState);
    setActiveCall((prev) => (prev ? { ...prev, isVideoOff: nextState } : null));
  };

  const toggleCamera = () => {
    toggleVideo();
  };

  const toggleScreenShare = async () => {
    if (!activeCall) return;

    if (activeCall.isScreenSharing) {
      webrtcService.stopScreenShare();
      setActiveCall((prev) => (prev ? { ...prev, isScreenSharing: false } : null));
    } else {
      try {
        const stream = await webrtcService.startScreenShare(() => {
          setActiveCall((prev) => (prev ? { ...prev, isScreenSharing: false } : null));
        });
        if (stream) {
          setActiveCall((prev) => (prev ? { ...prev, isScreenSharing: true } : null));
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to share screen');
      }
    }
  };

  const clearCallError = () => {
    setErrorMessage(null);
  };

  return (
    <CallContext.Provider
      value={{
        activeCall,
        callState: activeCall?.state || 'idle',
        callType: activeCall?.callType || 'voice',
        localStream,
        remoteStream,
        errorMessage,
        startCall,
        acceptCall,
        rejectCall,
        cancelCall,
        endCall,
        toggleMute,
        toggleVideo,
        toggleCamera,
        toggleScreenShare,
        clearCallError,
      }}
    >
      {children}
      {/* Hidden audio element for remote voice stream playback */}
      <audio ref={remoteAudioRef} autoPlay />
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
};
