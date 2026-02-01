import { LlmClient } from "../../domain/ports/llmClient";
import { IConversationRepository } from "../../domain/ports/conversationRepository";
import { PlaceholderLlmClient } from "../llm/placeholderLlmClient";
import { OllamaLlmClient } from "../llm/ollamaLlmClient";
import { CloudflareLlmClient } from "../llm/cloudflareLlmClient";
import { MongoConversationRepository } from "../database/repositories/mongoConversationRepository";

export interface ApplicationDependencies {
  llmClient: LlmClient;
  conversationRepository: IConversationRepository;
}

/**
 * Factory para inicializar las dependencias de la aplicación
 * basadas en variables de entorno
 */
export class DependencyContainer {
  private static instance: ApplicationDependencies | null = null;

  static getInstance(): ApplicationDependencies {
    if (!this.instance) {
      throw new Error("DependencyContainer no ha sido inicializado. Llama a initialize() primero.");
    }
    return this.instance;
  }

  static initialize(): ApplicationDependencies {
    // Inicializar cliente LLM
    const llmClient = this.initializeLlmClient();

    // Inicializar repositorio de conversaciones
    const conversationRepository = new MongoConversationRepository();

    this.instance = {
      llmClient,
      conversationRepository
    };

    return this.instance;
  }

  private static initializeLlmClient(): LlmClient {
    const useCloudflare = process.env.USE_CLOUDFLARE === "true";
    const useOllama = process.env.USE_OLLAMA === "true";

    if (useCloudflare) {
      console.log("Usando Cloudflare LLM Client");
      return new CloudflareLlmClient({
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
        apiToken: process.env.CLOUDFLARE_API_TOKEN,
        model: process.env.CLOUDFLARE_MODEL
      });
    }

    if (useOllama) {
      console.log("Usando Ollama LLM Client");
      return new OllamaLlmClient({
        baseUrl: process.env.OLLAMA_BASE_URL,
        model: process.env.OLLAMA_MODEL
      });
    }

    console.log("Usando Placeholder LLM Client");
    return new PlaceholderLlmClient();
  }

  static reset(): void {
    this.instance = null;
  }
}
