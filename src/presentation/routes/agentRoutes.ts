import express, { Router } from "express";
import { createAgentController } from "../controllers/agentController";
import { createStreamAgentResponse } from "../../application/usecases/streamAgentResponse";
import { PlaceholderLlmClient } from "../../infrastructure/llm/placeholderLlmClient";
import { OllamaLlmClient } from "../../infrastructure/llm/ollamaLlmClient";
import { CloudflareLlmClient } from "../../infrastructure/llm/cloudflareLlmClient";
import { ConversationHistoryService } from "../../domain/services/conversationHistoryService";
import { LlmClient } from "../../domain/ports/llmClient";

const router: Router = express.Router();

// Seleccionar el cliente LLM basado en variables de entorno
let llmClient: LlmClient;
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

const conversationHistory = new ConversationHistoryService();
const streamAgentResponse = createStreamAgentResponse({ llmClient, conversationHistory });
const controller = createAgentController({ streamAgentResponse, conversationHistory });

router.post("/agent/stream", controller.stream);
router.get("/agent/history/:conversationId", controller.getHistory);
router.delete("/agent/history/:conversationId", controller.clearHistory);

export default router;
