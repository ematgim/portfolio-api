# Portfolio API

API básica en Express con agente conversacional usando Ollama, Qwen2.5 y MongoDB para persistencia.

## Configuración Rápida

### 1. Levantar servicios con Docker

```bash
docker-compose up -d
```

El docker-compose levanta automáticamente:
- **API**: El servidor Express en el puerto 3000
- **Ollama**: El servidor LLM en el puerto 11434
- **MongoDB**: La base de datos en el puerto 27017

El contenedor de Ollama automáticamente:
- Descarga el modelo base `qwen2.5:7b` si no existe
- Crea el modelo personalizado `ematgim-assistant` con el prompt de [PROMPT.md](PROMPT.md)

Puedes ver el progreso con:
```bash
docker logs -f portfolio-ollama
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env`:

```bash
cp .env.example .env
```

### 3. Iniciar la API (desarrollo local)

```bash
npm install
npm run dev
```

## Persistencia con MongoDB

La API ahora guarda el historial de cada conversación en MongoDB. Características:

- **Persistencia**: Los chats se mantienen entre reinicios
- **Límite de mensajes**: Se mantienen los últimos 20 mensajes por conversación
- **TTL**: Las conversaciones se eliminan automáticamente después de 30 días de inactividad
- **Identificación**: Cada chat se identifica con un `conversationId` único

### Estructura de datos

Cada conversación se guarda con:
- `conversationId`: Identificador único
- `messages`: Array de mensajes (role, content, timestamp)
- `createdAt` y `updatedAt`: Timestamps automáticos


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
CLIENT_ORIGIN=http://localhost:5173

# MongoDB
MONGODB_URI=mongodb://mongo:27017/portfolio-chat

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
