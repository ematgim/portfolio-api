const fs = require("fs/promises");
const path = require("path");

class CloudflareLlmClient {
  constructor({ accountId, apiToken, model, systemPromptPath }) {
    this.accountId = accountId || "4a9ac68da97c49e165e006cddca2c770";
    this.apiToken = apiToken;
    this.model = model || "@cf/meta/llama-3-8b-instruct";
    this.systemPromptPath = systemPromptPath || path.join(__dirname, "../../../PROMPT.md");
    this.systemPrompt = null;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run`;
  }

  async loadSystemPrompt() {
    if (!this.systemPrompt) {
      try {
        this.systemPrompt = await fs.readFile(this.systemPromptPath, "utf-8");
      } catch (error) {
        console.warn(`Warning: Could not load system prompt from ${this.systemPromptPath}`, error.message);
        this.systemPrompt = "Eres un asistente para un portfolio profesional.";
      }
    }
    return this.systemPrompt;
  }

  async *streamChat({ prompt, context }) {
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
      const result = await response.json();
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

      let newlineIndex;
      while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line || line.startsWith(":")) continue;

        try {
          // Formato Server-Sent Events
          if (line.startsWith("data: ")) {
            const jsonData = line.slice(6);
            if (jsonData === "[DONE]") break;
            
            const payload = JSON.parse(jsonData);
            const content = payload.response || payload.content || payload.delta?.content;
            if (content) {
              yield { type: "token", data: content };
            }
          } else {
            // Formato JSON directo
            const payload = JSON.parse(line);
            const content = payload.response || payload.content || payload.delta?.content;
            if (content) {
              yield { type: "token", data: content };
            }
          }
        } catch (e) {
          console.warn("Failed to parse line:", line, e.message);
        }
      }
    }
  }

  buildMessages(prompt, context) {
    const cv = context?.cvProfile;
    const cvText = cv ? JSON.stringify(cv, null, 2) : "{}";
    
    const systemContent = `${this.systemPrompt}\n\n### DATOS DEL CV:\n${cvText}`;
    
    return [
      {
        role: "system",
        content: systemContent
      },
      {
        role: "user",
        content: prompt
      }
    ];
  }
}

module.exports = { CloudflareLlmClient };
