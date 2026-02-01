export interface Message {
  role: string;
  content: string;
  timestamp: string;
}

export interface Conversation {
  conversationId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IConversationRepository {
  /**
   * Obtener una conversación por ID
   */
  findById(conversationId: string): Promise<Conversation | null>;

  /**
   * Crear o actualizar una conversación
   */
  save(conversation: Conversation): Promise<Conversation>;

  /**
   * Añadir un mensaje a una conversación
   */
  addMessage(
    conversationId: string,
    role: string,
    content: string
  ): Promise<void>;

  /**
   * Obtener todos los mensajes de una conversación
   */
  getMessages(conversationId: string): Promise<Message[]>;

  /**
   * Limpiar el historial de una conversación
   */
  clearHistory(conversationId: string): Promise<void>;

  /**
   * Obtener un resumen de la conversación
   */
  getSummary(conversationId: string): Promise<Conversation | null>;

  /**
   * Obtener historial formateado para LLM
   */
  getFormattedHistory(conversationId: string): Promise<Array<{
    role: string;
    content: string;
  }>>;
}
