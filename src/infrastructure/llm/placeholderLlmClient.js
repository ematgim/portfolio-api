class PlaceholderLlmClient {
  async *streamChat() {
    yield {
      type: "info",
      data: "LLM no configurado. Implementa el cliente real más adelante."
    };
  }
}

module.exports = { PlaceholderLlmClient };
