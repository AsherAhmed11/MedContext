import dns from "node:dns";
import path from "node:path";
import { fileURLToPath } from "node:url";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.js";
import patientRoutes from "./routes/patients.js";
import doctorRoutes from "./routes/doctors.js";
import adminRoutes from "./routes/admin.js";
import { requireAuth } from "./middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "medcontext-api",
    mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/patients", requireAuth, patientRoutes);
app.use("/api/doctors", requireAuth, doctorRoutes);
app.use("/api/admin", requireAuth, adminRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

function validateMongoUri(uri) {
  if (!uri || typeof uri !== "string" || !uri.trim()) {
    throw new Error(
      "MONGODB_URI is missing. Set it in server/.env to your MongoDB Atlas connection string."
    );
  }

  let parsed;
  try {
    parsed = new URL(uri.trim());
  } catch {
    throw new Error(
      "MONGODB_URI is invalid and could not be parsed. Check the Atlas connection string format."
    );
  }

  const protocol = parsed.protocol.replace(/:$/, "");
  if (protocol !== "mongodb" && protocol !== "mongodb+srv") {
    throw new Error(
      `MONGODB_URI must use mongodb or mongodb+srv. Received protocol: ${protocol}`
    );
  }

  const username = decodeURIComponent(parsed.username || "");
  const hostname = parsed.hostname || "";

  if (!username) {
    throw new Error(
      "MONGODB_URI is missing a database username. Check your Atlas connection string."
    );
  }

  if (!hostname) {
    throw new Error(
      "MONGODB_URI is missing a hostname. Check your Atlas cluster host."
    );
  }

  if (!parsed.password) {
    throw new Error(
      "MONGODB_URI is missing a database password. Check your Atlas connection string."
    );
  }

  return { username, hostname, protocol };
}

function formatMongoConnectError(error) {
  const message = String(error?.message || error || "Unknown error");
  const lower = message.toLowerCase();

  if (
    lower.includes("bad auth") ||
    lower.includes("authentication failed") ||
    lower.includes("auth failed") ||
    error?.codeName === "AuthenticationFailed" ||
    error?.code === 18
  ) {
    return (
      "MongoDB Atlas rejected the credentials (authentication failed). " +
      "Reset the database user password in MongoDB Atlas and update MONGODB_URI in server/.env. " +
      "Do not commit or share the password."
    );
  }

  if (lower.includes("enodeesnotfound") || lower.includes("querySrv")) {
    return (
      "MongoDB Atlas DNS/SRV lookup failed. Check the cluster hostname and network connectivity."
    );
  }

  if (lower.includes("timed out") || lower.includes("server selection")) {
    return (
      "MongoDB Atlas connection timed out. Check Atlas Network Access (IP allowlist) and connectivity."
    );
  }

  return `MongoDB connection failed: ${message}`;
}

async function start() {
  let mongoMeta;

  try {
    mongoMeta = validateMongoUri(process.env.MONGODB_URI);
    console.log(
      `Connecting to MongoDB Atlas (${mongoMeta.protocol}) as ${mongoMeta.username}@${mongoMeta.hostname}`
    );

    await mongoose.connect(process.env.MONGODB_URI.trim(), {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("MongoDB connected");
  } catch (error) {
    if (
      error?.message?.startsWith("MONGODB_URI") ||
      error?.message?.includes("MONGODB_URI must use")
    ) {
      console.error(error.message);
    } else {
      console.error(formatMongoConnectError(error));
    }
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

// Only start the server if this file is run directly (not imported by tests)
if (process.env.NODE_ENV !== "test") {
  start();
}

export { app, start };
