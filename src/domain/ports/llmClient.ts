export interface LlmChunk {
  type: string;
  data: string;
}

export interface ChatContext {
  cvProfile?: any;
  conversationHistory?: Array<{
    role: string;
    content: string;
  }>;
}

export interface StreamChatParams {
  prompt: string;
  context?: ChatContext;
}

export abstract class LlmClient {
  abstract streamChat(params: StreamChatParams): AsyncGenerator<LlmChunk, void, unknown>;
}
