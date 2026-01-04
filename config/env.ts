// =============================================================================
// Frontend Environment Variables (loaded via import.meta.env for Vite)
// This file is ONLY for frontend use - do not import in server code!
// =============================================================================

export const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8010";
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8010";
export const ML_API_URL = import.meta.env.VITE_ML_SERVICE_URL || "http://localhost:8002";
export const API_KEY = import.meta.env.VITE_API_KEY || "hackathon-demo-key";

// Debugging check (only in development mode)
if (import.meta.env.DEV) {
  console.log("🔑 OpenRouter Key Loaded:", OPENROUTER_API_KEY ? "YES" : "NO");
  console.log("🌐 API URL:", API_URL);
  console.log("🖥️ Backend URL:", BACKEND_URL);
  console.log("🤖 ML Service URL:", ML_API_URL);
}
