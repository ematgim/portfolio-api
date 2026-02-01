import { Request, Response } from "express";
import { IConversationRepository } from "../../domain/ports/conversationRepository";

interface StreamAgentResponseFunction {
  (params: { prompt: string; context?: any; conversationId?: string }): AsyncGenerator<any, void, unknown>;
}

interface Dependencies {
  streamAgentResponse: StreamAgentResponseFunction;
  conversationRepository?: IConversationRepository;
}

interface AgentController {
  stream: (req: Request, res: Response) => Promise<void>;
  getHistory: (req: Request, res: Response) => Promise<void>;
  clearHistory: (req: Request, res: Response) => Promise<void>;
}

export const createAgentController = ({ 
  streamAgentResponse, 
  conversationRepository 
}: Dependencies): AgentController => {
  const stream = async (req: Request, res: Response): Promise<void> => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const { prompt, context, conversationId } = req.body || {};

    try {
      // Validar entrada
      if (!prompt) {
        if (!res.headersSent) {
          res.status(400).json({ error: "Prompt es requerido" });
        }
        return;
      }

      res.write("event: meta\n");
      res.write(`data: ${JSON.stringify({ streaming: true, conversationId })}\n\n`);

      for await (const chunk of streamAgentResponse({ prompt, context, conversationId })) {
        res.write("event: chunk\n");
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.write("event: done\n");
      res.write("data: {}\n\n");
      res.end();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      
      if (!res.headersSent) {
        res.status(400).json({ error: errorMessage });
        return;
      }

      res.write("event: error\n");
      res.write(`data: ${JSON.stringify({ message: errorMessage })}\n\n`);
      res.end();
    }
  };

  const getHistory = async (req: Request, res: Response): Promise<void> => {
    const conversationId = Array.isArray(req.params.conversationId) 
      ? req.params.conversationId[0]
      : req.params.conversationId;
    
    try {
      if (!conversationId) {
        res.status(400).json({ error: "conversationId requerido" });
        return;
      }

      if (!conversationRepository) {
        res.status(500).json({ error: "Repositorio no disponible" });
        return;
      }

      const summary = await conversationRepository.getSummary(conversationId);
      
      if (!summary) {
        res.status(404).json({ error: "Conversación no encontrada" });
        return;
      }

      res.json(summary);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      res.status(500).json({ error: errorMessage });
    }
  };

  const clearHistory = async (req: Request, res: Response): Promise<void> => {
    const conversationId = Array.isArray(req.params.conversationId) 
      ? req.params.conversationId[0]
      : req.params.conversationId;
    
    try {
      if (!conversationId) {
        res.status(400).json({ error: "conversationId requerido" });
        return;
      }

      if (!conversationRepository) {
        res.status(500).json({ error: "Repositorio no disponible" });
        return;
      }

      await conversationRepository.clearHistory(conversationId);
      res.json({ message: "Historial eliminado", conversationId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      res.status(500).json({ error: errorMessage });
    }
  };

  return { stream, getHistory, clearHistory };
};
