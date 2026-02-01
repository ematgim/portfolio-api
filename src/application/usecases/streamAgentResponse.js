const createStreamAgentResponse = ({ llmClient, cvRepository }) => {
  return async function* streamAgentResponse({ prompt, context }) {
    if (!prompt || typeof prompt !== "string") {
      throw new Error("Prompt requerido");
    }

    const cvProfile = await cvRepository.getProfile();
    const mergedContext = {
      cvProfile,
      ...context
    };

    for await (const chunk of llmClient.streamChat({ prompt, context: mergedContext })) {
      yield chunk;
    }
  };
};

module.exports = { createStreamAgentResponse };
