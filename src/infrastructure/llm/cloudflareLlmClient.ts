import { promises as fs } from "fs";
import path from "path";
import { LlmClient, StreamChatParams, LlmChunk } from "../../domain/ports/llmClient";

interface CloudflareConfig {
  accountId?: string;
  apiToken?: string;
  model?: string;
  systemPromptPath?: string;
}

interface CloudflareMessage {
  role: string;
  content: string;
}

interface CloudflareResponse {
  response?: string;
  content?: string;
  delta?: {
    content?: string;
  };
  result?: {
    response?: string;
  };
}

export class CloudflareLlmClient extends LlmClient {
  private accountId: string;
  private apiToken: string;
  private model: string;
  private systemPromptPath: string;
  private systemPrompt: string | null = null;
  private baseUrl: string;

  constructor({ accountId, apiToken, model, systemPromptPath }: CloudflareConfig = {}) {
    super();
    this.accountId = accountId || "4a9ac68da97c49e165e006cddca2c770";
    this.apiToken = apiToken || "";
    this.model = model || "@cf/meta/llama-3-8b-instruct";
    this.systemPromptPath = systemPromptPath || path.join(__dirname, "../../../PROMPT.md");
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run`;
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
    
    const messages = this.buildMessages(prompt, context);
    
    const response = await fetch(`${this.baseUrl}/${this.model}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages,
        stream: true
      })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Cloudflare AI error: ${response.status} ${text}`);
    }

    // Si Cloudflare AI no soporta streaming, devolver la respuesta completa
    if (!response.body) {
      const result = await response.json() as CloudflareResponse;
      const content = result.result?.response || result.response || JSON.stringify(result);
      yield { type: "token", data: content };
      return;
    }

    // Procesar streaming si está disponible
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
        if (!line || line.startsWith(":")) continue;

        try {
          // Formato Server-Sent Events
          if (line.startsWith("data: ")) {
            const jsonData = line.slice(6);
            if (jsonData === "[DONE]") break;
            
            const payload: CloudflareResponse = JSON.parse(jsonData);
            const content = payload.response || payload.content || payload.delta?.content;
            if (content) {
              yield { type: "token", data: content };
            }
          } else {
            // Formato JSON directo
            const payload: CloudflareResponse = JSON.parse(line);
            const content = payload.response || payload.content || payload.delta?.content;
            if (content) {
              yield { type: "token", data: content };
            }
          }
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          console.warn("Failed to parse line:", line, errorMessage);
        }
      }
    }
  }

  private buildMessages(prompt: string, context?: any): CloudflareMessage[] {
    const cv = context?.cvProfile;
    const cvText = cv ? JSON.stringify(cv, null, 2) : "{}";
    
    const systemContent = `${this.systemPrompt}\n\n### DATOS DEL CV:\n${cvText}`;
    
    const messages: CloudflareMessage[] = [
      {
        role: "system",
        content: systemContent
      }
    ];

    // Add conversation history if available
    const conversationHistory = context?.conversationHistory || [];
    if (conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Add current user message
    messages.push({
      role: "user",
      content: prompt
    });

    return messages;
  }
}
