import { User, CallType, CallSession } from '../types';

export const callService = {
  async initiateCall(peer: User, callType: CallType): Promise<CallSession> {
    return Promise.resolve({
      id: `call_${Date.now()}`,
      peerUser: peer,
      callType,
      state: 'outgoing',
      durationSeconds: 0,
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false
    });
  }
};
