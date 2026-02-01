import { LlmClient } from "../../domain/ports/llmClient";
import { ConversationHistoryService } from "../../domain/services/conversationHistoryService";

interface StreamAgentResponseParams {
  prompt: string;
  context?: any;
  conversationId?: string;
}

interface Dependencies {
  llmClient: LlmClient;
  conversationHistory?: ConversationHistoryService;
}

export const createStreamAgentResponse = ({ llmClient, conversationHistory }: Dependencies) => {
  return async function* streamAgentResponse({ 
    prompt, 
    context, 
    conversationId 
  }: StreamAgentResponseParams): AsyncGenerator<any, void, unknown> {
    if (!prompt || typeof prompt !== "string") {
      throw new Error("Prompt requerido");
    }
    
    // Get conversation history if conversationId is provided
    const history = conversationId && conversationHistory 
      ? await conversationHistory.getFormattedHistory(conversationId)
      : [];

    const mergedContext = {
      conversationHistory: history,
      ...context
    };

    // Add user message to history
    if (conversationId && conversationHistory) {
      await conversationHistory.addMessage(conversationId, "user", prompt);
    }

    let fullResponse = "";

    for await (const chunk of llmClient.streamChat({ prompt, context: mergedContext })) {
      fullResponse += chunk.data || "";
      yield chunk;
    }

    // Add assistant response to history
    if (conversationId && conversationHistory && fullResponse) {
      await conversationHistory.addMessage(conversationId, "assistant", fullResponse);
    }
  };
};
