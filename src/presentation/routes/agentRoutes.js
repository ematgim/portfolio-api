const express = require("express");
const { createAgentController } = require("../controllers/agentController");
const { createStreamAgentResponse } = require("../../application/usecases/streamAgentResponse");
const { PlaceholderLlmClient } = require("../../infrastructure/llm/placeholderLlmClient");
const { OllamaLlmClient } = require("../../infrastructure/llm/ollamaLlmClient");
const { CloudflareLlmClient } = require("../../infrastructure/llm/cloudflareLlmClient");
const { InMemoryCvRepository } = require("../../infrastructure/cv/inMemoryCvRepository");

const router = express.Router();

// Seleccionar el cliente LLM basado en variables de entorno
let llmClient;
if (process.env.USE_CLOUDFLARE === "true") {
	llmClient = new CloudflareLlmClient({
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
		apiToken: process.env.CLOUDFLARE_API_TOKEN,
		model: process.env.CLOUDFLARE_MODEL
	});
} else if (process.env.USE_OLLAMA === "true") {
	llmClient = new OllamaLlmClient({
		baseUrl: process.env.OLLAMA_BASE_URL,
		model: process.env.OLLAMA_MODEL
	});
} else {
	llmClient = new PlaceholderLlmClient();
}
const cvRepository = new InMemoryCvRepository();
const streamAgentResponse = createStreamAgentResponse({ llmClient, cvRepository });
const controller = createAgentController({ streamAgentResponse });

router.post("/agent/stream", controller.stream);

module.exports = router;
