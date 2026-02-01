import { LlmClient, StreamChatParams, LlmChunk } from "../../domain/ports/llmClient";

export class PlaceholderLlmClient extends LlmClient {
  async *streamChat(_params: StreamChatParams): AsyncGenerator<LlmChunk, void, unknown> {
    yield {
      type: "info",
      data: "LLM no configurado. Implementa el cliente real más adelante."
    };
  }
}
