# Portfolio API

Conversational portfolio API built with Express + TypeScript, streaming responses from an LLM provider and persisting chat history in MongoDB.

## Highlights

- **Streaming chat (SSE)** for fast, incremental responses
- **MongoDB persistence** for conversation history and TTL cleanup
- **Pluggable LLM providers**: Ollama (local), Cloudflare Workers AI, or a placeholder client
- **Docker-first** setup for API + Ollama + MongoDB

## Quick start (Docker)

1. Start the stack:

```bash
docker-compose up -d
```

This brings up:
- **API** on port 3000
- **Ollama** on port 11434
- **MongoDB** on port 27017

The Ollama container runs [scripts/init-ollama.sh](scripts/init-ollama.sh), which:
- Pulls the base model `llama3.2`
- Creates the custom model `ematgim-assistant` using [Modelfile](Modelfile)

Watch progress with:

```bash
docker logs -f portfolio-ollama
```

## Local development

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Install and run:

```bash
npm install
npm run dev
```

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | API port | `3000` |
| `CLIENT_ORIGIN` | CORS origin | `http://localhost:5173` |
| `MONGODB_URI` | Mongo connection string | `mongodb://mongo:27017/portfolio-chat` |
| `USE_OLLAMA` | Use Ollama provider | `false` |
| `OLLAMA_BASE_URL` | Ollama base URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | Ollama model | `ai/llama3.2:latest` |
| `USE_CLOUDFLARE` | Use Cloudflare provider | `false` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account id | — |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | — |
| `CLOUDFLARE_MODEL` | Cloudflare model | `@cf/meta/llama-3-8b-instruct` |

If neither `USE_OLLAMA` nor `USE_CLOUDFLARE` is set to `true`, the placeholder LLM client is used.

## API endpoints

- `GET /health` — health check
- `GET /api` — basic info
- `POST /api/agent/stream` — chat stream (Server-Sent Events)
- `GET /api/agent/history/:conversationId` — fetch conversation history
- `DELETE /api/agent/history/:conversationId` — clear conversation history

## Conversation persistence

Conversation history is stored in MongoDB with:
- **Retention:** last 20 messages per conversation
- **TTL:** auto-delete after 30 days of inactivity
- **Identity:** each chat is keyed by `conversationId`

## Customization

### Update the system prompt

Edit [PROMPT.md](PROMPT.md). The LLM client loads this file at runtime.

### Switch the base model

Update the `FROM` line in [Modelfile](Modelfile), then rebuild the model:

```bash
docker exec portfolio-ollama ollama create ematgim-assistant -f /root/Modelfile
```

You can also override the model name with `OLLAMA_MODEL`.

## Project structure

```
src/
├── application/usecases/     # Business logic
├── domain/ports/             # Interfaces
├── infrastructure/           # DB + LLM implementations
│   ├── database/             # MongoDB connection + repositories
│   ├── di/                   # Dependency container
│   └── llm/                  # LLM clients
└── presentation/             # REST API controllers + routes
```

## Scripts

- `npm run dev` — start in development mode
- `npm run dev:watch` — start with auto-reload
- `npm run build` — compile TypeScript
- `npm start` — run compiled server
- `npm test` — run tests
