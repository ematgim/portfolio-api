import { ConversationModel } from '../../infrastructure/database/conversationModel';

export interface Message {
  role: string;
  content: string;
  timestamp: string;
}

export interface ConversationSummary {
  conversationId: string;
  messageCount: number;
  messages: Message[];
}

/**
 * Service to manage conversation history with MongoDB persistence
 * Stores and retrieves chat messages for maintaining context
 */
export class ConversationHistoryService {
  private maxMessages: number;

  constructor(maxMessages: number = 20) {
    this.maxMessages = maxMessages;
  }

  /**
   * Add a message to conversation history
   * @param conversationId - Unique conversation identifier
   * @param role - "user" or "assistant"
   * @param content - Message content
   */
  async addMessage(conversationId: string, role: string, content: string): Promise<void> {
    if (!conversationId) {
      throw new Error("conversationId requerido");
    }

    try {
      const conversation = await ConversationModel.findOne({ conversationId });

      if (conversation) {
        // Añadir el mensaje al array existente
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
        // Crear nueva conversación
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

  /**
   * Get all messages in a conversation
   * @param conversationId
   * @returns Array of messages
   */
  async getHistory(conversationId: string): Promise<Message[]> {
    if (!conversationId) {
      return [];
    }

    try {
      const conversation = await ConversationModel.findOne({ conversationId });
      
      if (!conversation) {
        return [];
      }

      return conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }));
    } catch (error) {
      console.error('Error al obtener historial:', error);
      return [];
    }
  }

  /**
   * Get formatted history for LLM context
   * @param conversationId
   * @returns Formatted messages for LLM
   */
  async getFormattedHistory(conversationId: string): Promise<Array<{ role: string; content: string }>> {
    const history = await this.getHistory(conversationId);
    return history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Clear conversation history
   * @param conversationId
   */
  async clearHistory(conversationId: string): Promise<void> {
    try {
      await ConversationModel.deleteOne({ conversationId });
    } catch (error) {
      console.error('Error al limpiar historial:', error);
      throw error;
    }
  }

  /**
   * Get summary of conversation (for debugging)
   * @param conversationId
   * @returns Summary info
   */
  async getSummary(conversationId: string): Promise<ConversationSummary> {
    const history = await this.getHistory(conversationId);
    return {
      conversationId,
      messageCount: history.length,
      messages: history
    };
  }
}
