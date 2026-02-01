import { createStreamAgentResponse } from './streamAgentResponse';
import { LlmClient } from '../../domain/ports/llmClient';
import { IConversationRepository } from '../../domain/ports/conversationRepository';

describe('streamAgentResponse', () => {
  let mockLlmClient: jest.Mocked<LlmClient>;
  let mockConversationRepository: jest.Mocked<IConversationRepository>;

  beforeEach(() => {
    // Mock LLM Client
    mockLlmClient = {
      streamChat: jest.fn()
    } as any;

    // Mock Conversation Repository
    mockConversationRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      addMessage: jest.fn(),
      getMessages: jest.fn(),
      clearHistory: jest.fn(),
      getSummary: jest.fn(),
      getFormattedHistory: jest.fn()
    } as any;
  });

  describe('Input validation', () => {
    it('should throw error if prompt is not provided', async () => {
      const streamAgentResponse = createStreamAgentResponse({
        llmClient: mockLlmClient
      });

      await expect(async () => {
        const generator = streamAgentResponse({ prompt: '' });
        await generator.next();
      }).rejects.toThrow('Prompt requerido');
    });

    it('should throw error if prompt is not a string', async () => {
      const streamAgentResponse = createStreamAgentResponse({
        llmClient: mockLlmClient
      });

      await expect(async () => {
        const generator = streamAgentResponse({ prompt: null as any });
        await generator.next();
      }).rejects.toThrow('Prompt requerido');
    });
  });

  describe('Without conversation history', () => {
    it('should stream without history when conversationId is not provided', async () => {
      const mockChunks = [
        { type: 'content', data: 'Hola' },
        { type: 'content', data: ' mundo' },
        { type: 'content', data: '!' }
      ];

      mockLlmClient.streamChat.mockImplementation(async function* () {
        for (const chunk of mockChunks) {
          yield chunk;
        }
      });

      const streamAgentResponse = createStreamAgentResponse({
        llmClient: mockLlmClient
      });

      const generator = streamAgentResponse({ prompt: '¿Hola?' });
      const chunks: any[] = [];

      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(mockChunks);
      expect(mockLlmClient.streamChat).toHaveBeenCalledWith({
        prompt: '¿Hola?',
        context: { conversationHistory: [] }
      });
      expect(mockConversationRepository.addMessage).not.toHaveBeenCalled();
    });

    it('should include custom context when provided', async () => {
      mockLlmClient.streamChat.mockImplementation(async function* () {
        yield { type: 'content', data: 'test' };
      });

      const streamAgentResponse = createStreamAgentResponse({
        llmClient: mockLlmClient
      });

      const customContext = { userId: '123', metadata: { key: 'value' } };
      const generator = streamAgentResponse({
        prompt: 'test prompt',
        context: customContext
      });

      await generator.next();

      expect(mockLlmClient.streamChat).toHaveBeenCalledWith({
        prompt: 'test prompt',
        context: {
          conversationHistory: [],
          ...customContext
        }
      });
    });
  });

  describe('With conversation history', () => {
    it('should fetch history and add messages when conversationId is provided', async () => {
      const mockHistory = [
        { role: 'user', content: 'Mensaje anterior' },
        { role: 'assistant', content: 'Respuesta anterior' }
      ];

      mockConversationRepository.getFormattedHistory.mockResolvedValue(mockHistory);
      mockConversationRepository.addMessage.mockResolvedValue();

      mockLlmClient.streamChat.mockImplementation(async function* () {
        yield { type: 'content', data: 'Nueva' };
        yield { type: 'content', data: ' respuesta' };
      });

      const streamAgentResponse = createStreamAgentResponse({
        llmClient: mockLlmClient,
        conversationRepository: mockConversationRepository
      });

      const generator = streamAgentResponse({
        prompt: 'Nuevo mensaje',
        conversationId: 'conv-123'
      });

      const chunks: any[] = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      // Verificar que se obtuvo el historial
      expect(mockConversationRepository.getFormattedHistory).toHaveBeenCalledWith('conv-123');

      // Verificar que se añadió el mensaje del usuario
      expect(mockConversationRepository.addMessage).toHaveBeenCalledWith(
        'conv-123',
        'user',
        'Nuevo mensaje'
      );

      // Verificar que se añadió la respuesta del asistente
      expect(mockConversationRepository.addMessage).toHaveBeenCalledWith(
        'conv-123',
        'assistant',
        'Nueva respuesta'
      );

      // Verificar que se pasó el historial al LLM
      expect(mockLlmClient.streamChat).toHaveBeenCalledWith({
        prompt: 'Nuevo mensaje',
        context: {
          conversationHistory: mockHistory
        }
      });

      // Verificar chunks
      expect(chunks).toEqual([
        { type: 'content', data: 'Nueva' },
        { type: 'content', data: ' respuesta' }
      ]);
    });

    it('should handle empty history correctly', async () => {
      mockConversationRepository.getFormattedHistory.mockResolvedValue([]);
      mockConversationRepository.addMessage.mockResolvedValue();

      mockLlmClient.streamChat.mockImplementation(async function* () {
        yield { type: 'content', data: 'Primera respuesta' };
      });

      const streamAgentResponse = createStreamAgentResponse({
        llmClient: mockLlmClient,
        conversationRepository: mockConversationRepository
      });

      const generator = streamAgentResponse({
        prompt: 'Primer mensaje',
        conversationId: 'conv-new'
      });

      await generator.next();

      expect(mockConversationRepository.getFormattedHistory).toHaveBeenCalledWith('conv-new');
      expect(mockLlmClient.streamChat).toHaveBeenCalledWith({
        prompt: 'Primer mensaje',
        context: { conversationHistory: [] }
      });
    });

    it('should not save empty response to history', async () => {
      mockConversationRepository.getFormattedHistory.mockResolvedValue([]);
      mockConversationRepository.addMessage.mockResolvedValue();

      mockLlmClient.streamChat.mockImplementation(async function* () {
        // No yield nada, respuesta vacía
      });

      const streamAgentResponse = createStreamAgentResponse({
        llmClient: mockLlmClient,
        conversationRepository: mockConversationRepository
      });

      const generator = streamAgentResponse({
        prompt: 'Mensaje de prueba',
        conversationId: 'conv-456'
      });

      const chunks: any[] = [];
      for await (const chunk of generator) {
        chunks.push(chunk);
      }

      // Debería añadir el mensaje del usuario
      expect(mockConversationRepository.addMessage).toHaveBeenCalledWith(
        'conv-456',
        'user',
        'Mensaje de prueba'
      );

      // NO debería añadir la respuesta del asistente porque está vacía
      expect(mockConversationRepository.addMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling', () => {
    it('should propagate errors from LLM client', async () => {
      const error = new Error('Error del LLM');
      mockLlmClient.streamChat.mockImplementation(async function* () {
        throw error;
      });

      const streamAgentResponse = createStreamAgentResponse({
        llmClient: mockLlmClient
      });

      const generator = streamAgentResponse({ prompt: 'test' });

      await expect(generator.next()).rejects.toThrow('Error del LLM');
    });

    it('should propagate errors when fetching history', async () => {
      const error = new Error('Error de base de datos');
      mockConversationRepository.getFormattedHistory.mockRejectedValue(error);

      const streamAgentResponse = createStreamAgentResponse({
        llmClient: mockLlmClient,
        conversationRepository: mockConversationRepository
      });

      await expect(async () => {
        const generator = streamAgentResponse({
          prompt: 'test',
          conversationId: 'conv-error'
        });
        await generator.next();
      }).rejects.toThrow('Error de base de datos');
    });

    it('should continue streaming even if saving user message fails', async () => {
      mockConversationRepository.getFormattedHistory.mockResolvedValue([]);
      mockConversationRepository.addMessage.mockRejectedValueOnce(
        new Error('Error al guardar mensaje del usuario')
      );

      mockLlmClient.streamChat.mockImplementation(async function* () {
        yield { type: 'content', data: 'respuesta' };
      });

      const streamAgentResponse = createStreamAgentResponse({
        llmClient: mockLlmClient,
        conversationRepository: mockConversationRepository
      });

      const generator = streamAgentResponse({
        prompt: 'test',
        conversationId: 'conv-fail'
      });

      // Debería fallar al intentar guardar el mensaje del usuario
      await expect(generator.next()).rejects.toThrow('Error al guardar mensaje del usuario');
    });
  });

  describe('Context integration', () => {
    it('should correctly combine history and custom context', async () => {
      const mockHistory = [
        { role: 'user', content: 'Hola' },
        { role: 'assistant', content: 'Hola, ¿cómo estás?' }
      ];

      mockConversationRepository.getFormattedHistory.mockResolvedValue(mockHistory);
      mockConversationRepository.addMessage.mockResolvedValue();

      mockLlmClient.streamChat.mockImplementation(async function* () {
        yield { type: 'content', data: 'test' };
      });

      const streamAgentResponse = createStreamAgentResponse({
        llmClient: mockLlmClient,
        conversationRepository: mockConversationRepository
      });

      const customContext = {
        userName: 'Juan',
        preferences: { language: 'es' }
      };

      const generator = streamAgentResponse({
        prompt: 'Nueva pregunta',
        conversationId: 'conv-789',
        context: customContext
      });

      await generator.next();

      expect(mockLlmClient.streamChat).toHaveBeenCalledWith({
        prompt: 'Nueva pregunta',
        context: {
          conversationHistory: mockHistory,
          userName: 'Juan',
          preferences: { language: 'es' }
        }
      });
    });
  });
});
