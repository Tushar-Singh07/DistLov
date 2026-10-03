import mongoose from 'mongoose';
import { CallModel, ICallDocument, CallType } from '../models/CallModel.js';
import { ConversationModel } from '../models/ConversationModel.js';
import { UserModel } from '../models/UserModel.js';
import { MessageModel } from '../models/MessageModel.js';
import { canUsersInteract } from '../utils/userPrivacy.js';
import { serializePublicUser } from '../utils/userSerializer.js';
import { messageService } from './messageService.js';
import { getIO } from '../sockets/socketManager.js';

export interface InitiateCallInput {
  callerId: string;
  receiverId: string;
  conversationId: string;
  callType: CallType;
}

async function recordCallLogMessage(call: ICallDocument, statusOverride?: string) {
  if (!call.conversationId) return null;

  const finalStatus = statusOverride || call.status;
  const isVideo = call.type === 'video' || call.callType === 'video';
  const callTypeLabel = isVideo ? 'Video call' : 'Voice call';

  let content = '';
  if (finalStatus === 'ended') {
    const durationSeconds = call.durationSeconds || call.duration || 0;
    if (durationSeconds > 0) {
      const mins = Math.floor(durationSeconds / 60);
      const secs = durationSeconds % 60;
      const formattedTime = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      content = `${callTypeLabel} • ${formattedTime}`;
    } else {
      content = `${callTypeLabel} ended`;
    }
  } else if (finalStatus === 'rejected') {
    content = `${callTypeLabel} declined`;
  } else if (finalStatus === 'cancelled') {
    content = `${callTypeLabel} cancelled`;
  } else if (finalStatus === 'missed' || call.endReason === 'timeout') {
    content = `Missed ${callTypeLabel.toLowerCase()}`;
  } else {
    content = `${callTypeLabel} ${finalStatus}`;
  }

  try {
    const message = await MessageModel.create({
      conversationId: call.conversationId,
      senderId: call.callerId,
      messageType: 'call',
      content,
      status: 'sent',
    });

    const formattedMsg = await messageService.formatMessageWithPopulate(message);

    // Update conversation metadata
    const conversation = await ConversationModel.findById(call.conversationId);
    if (conversation) {
      conversation.lastMessage = message._id as mongoose.Types.ObjectId;
      conversation.lastMessageAt = message.createdAt;
      conversation.updatedAt = message.createdAt;
      await conversation.save();
    }

    // Broadcast over Socket.IO to conversation and both users
    try {
      const io = getIO();
      const convIdStr = call.conversationId.toString();
      io.to(`conversation:${convIdStr}`).emit('message:new', formattedMsg);
      io.to(`user:${call.callerId.toString()}`).emit('message:new', formattedMsg);
      io.to(`user:${call.receiverId.toString()}`).emit('message:new', formattedMsg);
    } catch (err) {
      // Socket io might not be initialized yet in test setup
    }

    return formattedMsg;
  } catch (err) {
    console.error('[recordCallLogMessage Error]:', err);
    return null;
  }
}

export const callService = {
  async initiateCall(input: InitiateCallInput) {
    const { callerId, receiverId, conversationId, callType } = input;

    if (!mongoose.Types.ObjectId.isValid(callerId) || !mongoose.Types.ObjectId.isValid(receiverId) || !mongoose.Types.ObjectId.isValid(conversationId)) {
      throw new Error('Invalid IDs provided for call initiation.');
    }

    if (callerId === receiverId) {
      throw new Error('Cannot initiate a call with yourself.');
    }

    // Verify conversation
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      const err: any = new Error('Conversation not found.');
      err.status = 404;
      throw err;
    }

    const callerIsParticipant = conversation.participants.some(p => p.userId && p.userId.toString() === callerId);
    const receiverIsParticipant = conversation.participants.some(p => p.userId && p.userId.toString() === receiverId);

    if (!callerIsParticipant || !receiverIsParticipant) {
      const err: any = new Error('Unauthorized: Both users must be participants of the conversation.');
      err.status = 403;
      throw err;
    }

    // Privacy & Block checks
    const canInteract = await canUsersInteract(callerId, receiverId);
    if (!canInteract) {
      const err: any = new Error('Cannot initiate call due to privacy or block settings.');
      err.status = 403;
      throw err;
    }

    const receiverUser = await UserModel.findById(receiverId);
    if (!receiverUser || !receiverUser.isActive || receiverUser.isBlocked) {
      const err: any = new Error('Receiver is not available for calls.');
      err.status = 404;
      throw err;
    }

    if ((receiverUser.privacySettings as any)?.allowCallsFrom === 'nobody') {
      const err: any = new Error('User privacy settings do not allow incoming calls.');
      err.status = 403;
      throw err;
    }

    // Auto-clean any stale ringing or accepted calls older than 2 minutes
    const staleThreshold = new Date(Date.now() - 2 * 60 * 1000);
    await CallModel.updateMany(
      {
        status: { $in: ['ringing', 'accepted'] },
        $or: [
          { callerId: new mongoose.Types.ObjectId(callerId) },
          { receiverId: new mongoose.Types.ObjectId(callerId) },
          { callerId: new mongoose.Types.ObjectId(receiverId) },
          { receiverId: new mongoose.Types.ObjectId(receiverId) },
        ],
        updatedAt: { $lt: staleThreshold },
      },
      {
        $set: {
          status: 'ended',
          endedAt: new Date(),
          endReason: 'timeout',
        },
      }
    );

    // Check if receiver is already in an active call
    const activeCall = await CallModel.findOne({
      status: { $in: ['ringing', 'accepted'] },
      $or: [
        { callerId: new mongoose.Types.ObjectId(receiverId) },
        { receiverId: new mongoose.Types.ObjectId(receiverId) },
      ],
    });

    if (activeCall) {
      return {
        isBusy: true,
        message: 'User is currently on another call.',
        call: null,
      };
    }

    // Check if caller is already in an active call
    const callerActiveCall = await CallModel.findOne({
      status: { $in: ['ringing', 'accepted'] },
      $or: [
        { callerId: new mongoose.Types.ObjectId(callerId) },
        { receiverId: new mongoose.Types.ObjectId(callerId) },
      ],
    });

    if (callerActiveCall) {
      const err: any = new Error('You are already in an active call.');
      err.status = 400;
      throw err;
    }

    const callerUser = await UserModel.findById(callerId);

    const callDoc = await CallModel.create({
      callerId: new mongoose.Types.ObjectId(callerId),
      receiverId: new mongoose.Types.ObjectId(receiverId),
      conversationId: new mongoose.Types.ObjectId(conversationId),
      type: callType,
      callType: callType,
      status: 'ringing',
      startedAt: new Date(),
    });

    return {
      isBusy: false,
      call: callDoc,
      callerInfo: callerUser ? serializePublicUser(callerUser) : { id: callerId, name: 'Caller', username: 'caller' },
    };
  },

  async acceptCall(callId: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(callId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid call or user ID.');
    }

    const call = await CallModel.findById(callId);
    if (!call) {
      const err: any = new Error('Call not found.');
      err.status = 404;
      throw err;
    }

    if (call.receiverId.toString() !== userId) {
      const err: any = new Error('Unauthorized to accept this call.');
      err.status = 403;
      throw err;
    }

    if (call.status !== 'ringing') {
      throw new Error(`Call cannot be accepted in state '${call.status}'.`);
    }

    call.status = 'accepted';
    call.answeredAt = new Date();
    await call.save();

    return call;
  },

  async rejectCall(callId: string, userId: string, reason?: string) {
    if (!mongoose.Types.ObjectId.isValid(callId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid call or user ID.');
    }

    const call = await CallModel.findById(callId);
    if (!call) {
      const err: any = new Error('Call not found.');
      err.status = 404;
      throw err;
    }

    const isParticipant = call.callerId.toString() === userId || call.receiverId.toString() === userId;
    if (!isParticipant) {
      const err: any = new Error('Unauthorized to reject this call.');
      err.status = 403;
      throw err;
    }

    if (call.status === 'ended' || call.status === 'rejected' || call.status === 'cancelled') {
      return call;
    }

    call.status = 'rejected';
    call.endedAt = new Date();
    call.endReason = (reason as any) || 'declined';
    await call.save();

    await recordCallLogMessage(call, 'rejected');

    return call;
  },

  async cancelCall(callId: string, userId: string) {
    if (!mongoose.Types.ObjectId.isValid(callId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid call or user ID.');
    }

    const call = await CallModel.findById(callId);
    if (!call) {
      const err: any = new Error('Call not found.');
      err.status = 404;
      throw err;
    }

    if (call.callerId.toString() !== userId) {
      const err: any = new Error('Only the caller can cancel this call.');
      err.status = 403;
      throw err;
    }

    if (call.status !== 'ringing') {
      return call;
    }

    call.status = 'cancelled';
    call.endedAt = new Date();
    call.endReason = 'normal';
    await call.save();

    await recordCallLogMessage(call, 'cancelled');

    return call;
  },

  async endCall(callId: string, userId: string, reason?: string) {
    if (!mongoose.Types.ObjectId.isValid(callId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid call or user ID.');
    }

    const call = await CallModel.findById(callId);
    if (!call) {
      const err: any = new Error('Call not found.');
      err.status = 404;
      throw err;
    }

    const isParticipant = call.callerId.toString() === userId || call.receiverId.toString() === userId;
    if (!isParticipant) {
      const err: any = new Error('Unauthorized to end this call.');
      err.status = 403;
      throw err;
    }

    if (call.status === 'ended') {
      return call;
    }

    const now = new Date();
    let durationSeconds = 0;
    if (call.answeredAt) {
      durationSeconds = Math.max(0, Math.round((now.getTime() - call.answeredAt.getTime()) / 1000));
    }

    call.status = 'ended';
    call.endedAt = now;
    call.durationSeconds = durationSeconds;
    call.duration = durationSeconds;
    call.endReason = (reason as any) || 'normal';
    await call.save();

    await recordCallLogMessage(call, 'ended');

    return call;
  },

  async handleRingTimeout(callId: string) {
    if (!mongoose.Types.ObjectId.isValid(callId)) return null;

    const call = await CallModel.findById(callId);
    if (call && call.status === 'ringing') {
      call.status = 'missed';
      call.endedAt = new Date();
      call.endReason = 'timeout';
      await call.save();

      await recordCallLogMessage(call, 'missed');

      return call;
    }
    return null;
  },

  async getUserCalls(userId: string, limit: number = 20) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID.');
    }

    const calls = await CallModel.find({
      $or: [{ callerId: userId }, { receiverId: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('callerId', 'name username profilePhoto')
      .populate('receiverId', 'name username profilePhoto');

    return calls;
  },

  async handleUserDisconnect(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) return;

    const activeCalls = await CallModel.find({
      status: { $in: ['ringing', 'accepted'] },
      $or: [
        { callerId: new mongoose.Types.ObjectId(userId) },
        { receiverId: new mongoose.Types.ObjectId(userId) },
      ],
    });

    for (const call of activeCalls) {
      call.status = 'ended';
      call.endedAt = new Date();
      call.endReason = 'connection_error';
      await call.save();

      await recordCallLogMessage(call, 'ended');
    }
  },
};

