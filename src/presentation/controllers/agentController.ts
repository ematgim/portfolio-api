import { Request, Response } from "express";
import { ConversationHistoryService } from "../../domain/services/conversationHistoryService";

interface StreamAgentResponseFunction {
  (params: { prompt: string; context?: any; conversationId?: string }): AsyncGenerator<any, void, unknown>;
}

interface Dependencies {
  streamAgentResponse: StreamAgentResponseFunction;
  conversationHistory?: ConversationHistoryService;
}

interface AgentController {
  stream: (req: Request, res: Response) => Promise<void>;
  getHistory: (req: Request, res: Response) => void;
  clearHistory: (req: Request, res: Response) => void;
}

export const createAgentController = ({ streamAgentResponse, conversationHistory }: Dependencies): AgentController => {
  const stream = async (req: Request, res: Response): Promise<void> => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const { prompt, context, conversationId } = req.body || {};

    try {
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

  const getHistory = (req: Request, res: Response): void => {
    const conversationId = req.params.conversationId as string;
    
    if (!conversationId || !conversationHistory) {
      res.status(400).json({ error: "conversationId requerido" });
      return;
    }

    try {
      const summary = conversationHistory.getSummary(conversationId);
      res.json(summary);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      res.status(400).json({ error: errorMessage });
    }
  };

  const clearHistory = (req: Request, res: Response): void => {
    const conversationId = req.params.conversationId as string;
    
    if (!conversationId || !conversationHistory) {
      res.status(400).json({ error: "conversationId requerido" });
      return;
    }

    try {
      conversationHistory.clearHistory(conversationId);
      res.json({ message: "Historial eliminado", conversationId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido";
      res.status(400).json({ error: errorMessage });
    }
  };

  return { stream, getHistory, clearHistory };
};
