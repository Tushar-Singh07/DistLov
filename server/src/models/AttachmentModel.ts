import mongoose, { Schema, Document } from 'mongoose';

export interface IAttachmentDocument extends Document {
  uploadedBy: mongoose.Types.ObjectId;
  uploaderId: mongoose.Types.ObjectId;
  conversationId: mongoose.Types.ObjectId;
  messageId?: mongoose.Types.ObjectId;
  originalName: string;
  storageName: string;
  storedFileName: string;
  storagePath: string;
  mimeType: string;
  size: number;
  fileSize: number;
  checksum?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  cloudinaryPublicId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachmentDocument>(
  {
    uploaderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    messageId: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
    originalName: { type: String, required: [true, 'originalName is required'] },
    storedFileName: { type: String, required: true },
    storageName: { type: String },
    storagePath: { type: String, default: '' },
    mimeType: { type: String, required: [true, 'mimeType is required'] },
    fileSize: { type: Number, required: [true, 'fileSize is required'], min: [1, 'File size must be greater than 0'] },
    size: { type: Number },
    checksum: { type: String, default: null },
    fileUrl: { type: String, required: true },
    thumbnailUrl: { type: String, default: null },
    durationSeconds: { type: Number, default: 0 },
    cloudinaryPublicId: { type: String, default: null },
  },
  { timestamps: true }
);

AttachmentSchema.pre('save', function (next) {
  if (!this.uploadedBy) this.uploadedBy = this.uploaderId;
  if (!this.storageName) this.storageName = this.storedFileName;
  if (!this.size) this.size = this.fileSize;
  next();
});

AttachmentSchema.index({ conversationId: 1, createdAt: -1 });
AttachmentSchema.index({ uploaderId: 1 });
AttachmentSchema.index({ messageId: 1 });
AttachmentSchema.index({ createdAt: -1 });

export const AttachmentModel = mongoose.model<IAttachmentDocument>('Attachment', AttachmentSchema);
