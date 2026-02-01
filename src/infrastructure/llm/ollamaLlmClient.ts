import { promises as fs } from "fs";
import path from "path";
import { LlmClient, StreamChatParams, LlmChunk } from "../../domain/ports/llmClient";

interface OllamaConfig {
  baseUrl?: string;
  model?: string;
  systemPromptPath?: string;
}

interface OllamaResponse {
  response?: string;
}

export class OllamaLlmClient extends LlmClient {
  private baseUrl: string;
  private model: string;
  private systemPromptPath: string;
  private systemPrompt: string | null = null;

  constructor({ baseUrl, model, systemPromptPath }: OllamaConfig = {}) {
    super();
    this.baseUrl = baseUrl || "http://localhost:11434";
    this.model = model || "ai/llama3.2:latest";
    this.systemPromptPath = systemPromptPath || path.join(__dirname, "../../../PROMPT.md");
  }

  private async loadSystemPrompt(): Promise<string> {
    if (!this.systemPrompt) {
      try {
        this.systemPrompt = await fs.readFile(this.systemPromptPath, "utf-8");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Warning: Could not load system prompt from ${this.systemPromptPath}`, errorMessage);
        this.systemPrompt = "Eres un asistente para un portfolio profesional.";
      }
    }
    return this.systemPrompt;
  }

  async *streamChat({ prompt, context }: StreamChatParams): AsyncGenerator<LlmChunk, void, unknown> {
    await this.loadSystemPrompt();
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: this.buildPrompt(prompt, context),
        stream: true
      })
    });

    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => "");
      throw new Error(`Ollama error: ${response.status} ${text}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line) continue;

        const payload: OllamaResponse = JSON.parse(line);
        if (payload.response) {
          yield { type: "token", data: payload.response };
        }
      }
    }
  }

  private buildPrompt(prompt: string, context?: any): string {
    const cv = context?.cvProfile;
    const cvText = cv ? JSON.stringify(cv, null, 2) : "{}";
    
    let fullPrompt = `${this.systemPrompt}\n\n### DATOS DEL CV:\n${cvText}`;

    // Add conversation history if available
    const conversationHistory = context?.conversationHistory || [];
    if (conversationHistory.length > 0) {
      fullPrompt += "\n\n### HISTORIAL DE CONVERSACIÓN:\n";
      conversationHistory.forEach((msg: any) => {
        fullPrompt += `${msg.role === "user" ? "Usuario" : "Asistente"}: ${msg.content}\n`;
      });
    }

    fullPrompt += `\n\n### PREGUNTA DEL USUARIO:\n${prompt}`;
    
    return fullPrompt;
  }
}
