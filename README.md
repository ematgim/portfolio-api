# Portfolio API

API básica en Express con agente conversacional usando Ollama y Qwen2.5.

## Configuración Rápida

### 1. Levantar Ollama con Docker

```bash
docker-compose up -d
```

El contenedor automáticamente:
- Descarga el modelo base `qwen2.5:7b` si no existe
- Crea el modelo personalizado `ematgim-assistant` con el prompt de [PROMPT.md](PROMPT.md)

Puedes ver el progreso con:
```bash
docker logs -f portfolio-model-setup
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env`:

```bash
cp .env.example .env
```

### 3. Iniciar la API

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` - Inicia el servidor en modo desarrollo
- `npm start` - Inicia el servidor en modo producción
- `./scripts/setup-model.sh` - (Opcional) Configurar modelo manualmente desde el host

## Endpoints

- `GET /health` - Health check
- `GET /api` - Info básica
- `POST /api/agent/stream` - Chat con el agente (Server-Sent Events)

## Estructura

```
src/
├── application/usecases/     # Lógica de negocio
├── domain/ports/             # Interfaces
├── infrastructure/           # Implementaciones
│   ├── cv/                   # Repositorio de CV
│   └── llm/                  # Clientes LLM
└── presentation/             # API REST
```

## Personalización

### Modificar el CV

Edita [src/infrastructure/cv/cvProfile.json](src/infrastructure/cv/cvProfile.json) con tu información.

### Modificar el prompt del agente

Edita [PROMPT.md](PROMPT.md) y recrea el modelo:

```bash
docker exec portfolio-ollama ollama create ematgim-assistant -f /tmp/Modelfile
```

### Usar otro modelo

Cambia `FROM qwen2.5:7b` en [Modelfile](Modelfile) y ejecuta `./scripts/setup-model.sh`.

## Configuración

Variables de entorno en `.env`:

```env
PORT=3000

# Usar Ollama (local)
USE_OLLAMA=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=ematgim-assistant

# Usar Cloudflare Workers AI
USE_CLOUDFLARE=false
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_MODEL=@cf/meta/llama-3-8b-instruct
```

### Proveedores LLM Soportados

La API soporta múltiples proveedores de modelos:

1. **Ollama (local)** - Por defecto
   - Configura `USE_OLLAMA=true`
   - Requiere Ollama corriendo localmente o en Docker

2. **Cloudflare Workers AI**
   - Configura `USE_CLOUDFLARE=true` 
   - Requiere cuenta de Cloudflare y API token
   - Modelos disponibles: `@cf/meta/llama-3-8b-instruct`, etc.

3. **Placeholder** - Modo de prueba sin LLM real
