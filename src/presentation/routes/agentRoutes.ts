import express, { Router } from "express";
import { createAgentController } from "../controllers/agentController";
import { createStreamAgentResponse } from "../../application/usecases/streamAgentResponse";
import { DependencyContainer } from "../../infrastructure/di/dependencyContainer";

const router: Router = express.Router();

// Obtener las dependencias
const { llmClient, conversationRepository } = DependencyContainer.getInstance();

// Crear el usecase con las dependencias inyectadas
const streamAgentResponse = createStreamAgentResponse({
  llmClient,
  conversationRepository
});

// Crear el controller con las dependencias inyectadas
const controller = createAgentController({
  streamAgentResponse,
  conversationRepository
});

// Definir rutas
router.post("/agent/stream", controller.stream);
router.get("/agent/history/:conversationId", controller.getHistory);
router.delete("/agent/history/:conversationId", controller.clearHistory);

export default router;
