const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const agentRoutes = require("./presentation/routes/agentRoutes");

const app = express();
const port = process.env.PORT || 3000;

// Configure CORS
const corsOptions = {
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.use(express.json());
app.use("/api", agentRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api", (req, res) => {
  res.json({ message: "Hola desde la API" });
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});
