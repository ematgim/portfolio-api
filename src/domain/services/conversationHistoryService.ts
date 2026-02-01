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
 * Service to manage conversation history
 * Stores and retrieves chat messages for maintaining context
 */
export class ConversationHistoryService {
  private conversations: Map<string, Message[]>;

  constructor() {
    // In-memory storage: conversationId -> messages array
    this.conversations = new Map();
  }

  /**
   * Add a message to conversation history
   * @param conversationId - Unique conversation identifier
   * @param role - "user" or "assistant"
   * @param content - Message content
   */
  addMessage(conversationId: string, role: string, content: string): void {
    if (!conversationId) {
      throw new Error("conversationId requerido");
    }

    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, []);
    }

    const messages = this.conversations.get(conversationId)!;
    messages.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });

    // Limit history to last 20 messages to avoid token limits
    if (messages.length > 20) {
      messages.shift();
    }
  }

  /**
   * Get all messages in a conversation
   * @param conversationId
   * @returns Array of messages
   */
  getHistory(conversationId: string): Message[] {
    if (!conversationId) {
      return [];
    }
    return this.conversations.get(conversationId) || [];
  }

  /**
   * Get formatted history for LLM context
   * @param conversationId
   * @returns Formatted messages for LLM
   */
  getFormattedHistory(conversationId: string): Array<{ role: string; content: string }> {
    const history = this.getHistory(conversationId);
    return history.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Clear conversation history
   * @param conversationId
   */
  clearHistory(conversationId: string): void {
    this.conversations.delete(conversationId);
  }

  /**
   * Get summary of conversation (for debugging)
   * @param conversationId
   * @returns Summary info
   */
  getSummary(conversationId: string): ConversationSummary {
    const history = this.getHistory(conversationId);
    return {
      conversationId,
      messageCount: history.length,
      messages: history
    };
  }
}
