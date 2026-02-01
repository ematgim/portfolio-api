import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, Application } from "express";
import cors from "cors";
import agentRoutes from "./presentation/routes/agentRoutes";
import { mongoConnection } from "./infrastructure/database/mongoConnection";

const app: Application = express();
const port: number = parseInt(process.env.PORT || "3000", 10);

// Configure CORS
const corsOptions: cors.CorsOptions = {
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.use(express.json());
app.use("/api", agentRoutes);

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/api", (_req: Request, res: Response) => {
  res.json({ message: "Hola desde la API" });
});

// Conectar a MongoDB antes de iniciar el servidor
async function startServer() {
  try {
    await mongoConnection.connect();
    
    app.listen(port, () => {
      console.log(`API listening on port ${port}`);
    });
  } catch (error) {
    console.error("Error al iniciar el servidor:", error);
    process.exit(1);
  }
}

// Manejar el cierre graceful
process.on('SIGTERM', async () => {
  console.log('SIGTERM recibido, cerrando conexiones...');
  await mongoConnection.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT recibido, cerrando conexiones...');
  await mongoConnection.disconnect();
  process.exit(0);
});

startServer();
