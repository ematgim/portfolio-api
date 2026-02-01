import { ConversationModel, IConversation } from '../conversationModel';
import {
  IConversationRepository,
  Message,
  Conversation
} from '../../../domain/ports/conversationRepository';

export class MongoConversationRepository implements IConversationRepository {
  private maxMessages: number;

  constructor(maxMessages: number = 20) {
    this.maxMessages = maxMessages;
  }

  async findById(conversationId: string): Promise<Conversation | null> {
    if (!conversationId) {
      return null;
    }

    try {
      const doc = await ConversationModel.findOne({ conversationId });
      
      if (!doc) {
        return null;
      }

      return this.mapDocumentToConversation(doc);
    } catch (error) {
      console.error('Error al buscar conversación:', error);
      throw error;
    }
  }

  async save(conversation: Conversation): Promise<Conversation> {
    if (!conversation.conversationId) {
      throw new Error('conversationId es requerido');
    }

    try {
      const existingDoc = await ConversationModel.findOne({
        conversationId: conversation.conversationId
      });

      if (existingDoc) {
        existingDoc.messages = conversation.messages as any;
        await existingDoc.save();
        return this.mapDocumentToConversation(existingDoc);
      } else {
        const newDoc = await ConversationModel.create({
          conversationId: conversation.conversationId,
          messages: conversation.messages as any
        });
        return this.mapDocumentToConversation(newDoc);
      }
    } catch (error) {
      console.error('Error al guardar conversación:', error);
      throw error;
    }
  }

  async addMessage(
    conversationId: string,
    role: string,
    content: string
  ): Promise<void> {
    if (!conversationId) {
      throw new Error('conversationId requerido');
    }

    try {
      const conversation = await ConversationModel.findOne({ conversationId });

      if (conversation) {
        conversation.messages.push({
          role,
          content,
          timestamp: new Date()
        });

        // Limitar el historial a los últimos N mensajes
        if (conversation.messages.length > this.maxMessages) {
          conversation.messages = conversation.messages.slice(-this.maxMessages);
        }

        await conversation.save();
      } else {
        await ConversationModel.create({
          conversationId,
          messages: [{
            role,
            content,
            timestamp: new Date()
          }]
        });
      }
    } catch (error) {
      console.error('Error al añadir mensaje:', error);
      throw error;
    }
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    if (!conversationId) {
      return [];
    }

    try {
      const conversation = await ConversationModel.findOne({ conversationId });
      
      if (!conversation) {
        return [];
      }

      return conversation.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }));
    } catch (error) {
      console.error('Error al obtener mensajes:', error);
      return [];
    }
  }

  async clearHistory(conversationId: string): Promise<void> {
    if (!conversationId) {
      throw new Error('conversationId requerido');
    }

    try {
      await ConversationModel.deleteOne({ conversationId });
    } catch (error) {
      console.error('Error al limpiar historial:', error);
      throw error;
    }
  }

  async getSummary(conversationId: string): Promise<Conversation | null> {
    return this.findById(conversationId);
  }

  async getFormattedHistory(
    conversationId: string
  ): Promise<Array<{ role: string; content: string }>> {
    const messages = await this.getMessages(conversationId);
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  private mapDocumentToConversation(doc: IConversation): Conversation {
    return {
      conversationId: doc.conversationId,
      messages: doc.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      })),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
}
