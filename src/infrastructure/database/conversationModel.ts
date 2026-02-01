import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage {
  role: string;
  content: string;
  timestamp: Date;
}

export interface IConversation extends Document {
  conversationId: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant', 'system']
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const ConversationSchema = new Schema<IConversation>({
  conversationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  messages: [MessageSchema]
}, {
  timestamps: true
});

// TTL index - eliminar conversaciones después de 30 días de inactividad
ConversationSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 2592000 });

export const ConversationModel = mongoose.model<IConversation>('Conversation', ConversationSchema);
