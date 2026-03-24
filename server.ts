import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

// Handlers
import generateRecipeImage from "./api/generate-recipe-image.js";
import receita from "./api/receita.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // API routes
  app.post("/api/generate-recipe-image", async (req, res) => {
    try {
      // VercelRequest/Response are compatible enough with Express for basic usage
      await generateRecipeImage(req as any, res as any);
    } catch (error) {
      console.error("[Server API Error]", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/receita", async (req, res) => {
    try {
      await receita(req as any, res as any);
    } catch (error) {
      console.error("[Server API Error]", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Deep link rewrite for Vercel compatibility in preview
  app.get("/receita/:id", async (req, res) => {
    req.query.id = req.params.id;
    try {
      await receita(req as any, res as any);
    } catch (error) {
      console.error("[Server API Error]", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
