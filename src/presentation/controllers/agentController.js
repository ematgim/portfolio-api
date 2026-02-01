const createAgentController = ({ streamAgentResponse }) => {
  const stream = async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const { prompt, context } = req.body || {};

    try {
      res.write("event: meta\n");
      res.write(`data: ${JSON.stringify({ streaming: true })}\n\n`);

      for await (const chunk of streamAgentResponse({ prompt, context })) {
        res.write("event: chunk\n");
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.write("event: done\n");
      res.write("data: {}\n\n");
      res.end();
    } catch (error) {
      if (!res.headersSent) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.write("event: error\n");
      res.write(`data: ${JSON.stringify({ message: error.message })}\n\n`);
      res.end();
    }
  };

  return { stream };
};

module.exports = { createAgentController };
