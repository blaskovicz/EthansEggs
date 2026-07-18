import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";

import authRoutes from "./routes/auth";
import eggsRoutes from "./routes/eggs";
import paymentsRoutes from "./routes/payments";
import settingsRoutes from "./routes/settings";
import usersRoutes from "./routes/users";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(express.json());
app.use(cookieParser());

if (process.env.NODE_ENV !== "production") {
  // In dev, the Vite dev server runs on a different port and proxies /api here.
  app.use(cors({ origin: true, credentials: true }));
}

app.use("/api/auth", authRoutes);
app.use("/api/eggs", eggsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/users", usersRoutes);

// Serve the built Vue SPA in production.
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Ethan's Eggs server listening on http://0.0.0.0:${PORT}`);
});
