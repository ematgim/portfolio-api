const fs = require("fs/promises");
const path = require("path");

class OllamaLlmClient {
  constructor({ baseUrl, model, systemPromptPath }) {
    this.baseUrl = baseUrl || "http://localhost:11434";
    this.model = model || "ai/llama3.2:latest";
    this.systemPromptPath = systemPromptPath || path.join(__dirname, "../../../PROMPT.md");
    this.systemPrompt = null;
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

      let newlineIndex;
      while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line) continue;

        const payload = JSON.parse(line);
        if (payload.response) {
          yield { type: "token", data: payload.response };
        }
      }
    }
  }

  buildPrompt(prompt, context) {
    const cv = context?.cvProfile;
    const cvText = cv ? JSON.stringify(cv, null, 2) : "{}";
    return `${this.systemPrompt}\n\n### DATOS DEL CV:\n${cvText}\n\n### PREGUNTA DEL USUARIO:\n${prompt}`;
  }
}

module.exports = { OllamaLlmClient };

module.exports = { OllamaLlmClient };
