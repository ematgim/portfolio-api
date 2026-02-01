import { LlmClient } from "../../domain/ports/llmClient";
import { IConversationRepository } from "../../domain/ports/conversationRepository";

interface StreamAgentResponseParams {
  prompt: string;
  context?: any;
  conversationId?: string;
}

interface Dependencies {
  llmClient: LlmClient;
  conversationRepository?: IConversationRepository;
}

export const createStreamAgentResponse = ({ 
  llmClient, 
  conversationRepository 
}: Dependencies) => {
  return async function* streamAgentResponse({ 
    prompt, 
    context, 
    conversationId 
  }: StreamAgentResponseParams): AsyncGenerator<any, void, unknown> {
    if (!prompt || typeof prompt !== "string") {
      throw new Error("Prompt requerido");
    }
    
    // Get conversation history if conversationId is provided
    const history = conversationId && conversationRepository 
      ? await conversationRepository.getFormattedHistory(conversationId)
      : [];

    const mergedContext = {
      conversationHistory: history,
      ...context
    };

    // Add user message to history
    if (conversationId && conversationRepository) {
      await conversationRepository.addMessage(conversationId, "user", prompt);
    }

    let fullResponse = "";

    for await (const chunk of llmClient.streamChat({ prompt, context: mergedContext })) {
      fullResponse += chunk.data || "";
      yield chunk;
    }

    // Add assistant response to history
    if (conversationId && conversationRepository && fullResponse) {
      await conversationRepository.addMessage(conversationId, "assistant", fullResponse);
    }
  };
};
