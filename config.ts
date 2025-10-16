/**
 * Configuration for Application Environment
 *
 * In a real-world deployment, these values would be populated by environment variables
 * during the build process (e.g., using Vite's `import.meta.env` or Webpack's `DefinePlugin`).
 * This allows the same codebase to be deployed to different environments (development, staging, production)
 * with different configurations.
 */

// The base URL for the backend API server.
// For the current prototype, this is not used as we are mocking the API with localStorage.
export const API_BASE_URL = 'https://api.laborsync.com/v1';

// The URL for our backend proxy that securely handles requests to the Gemini API.
// This prevents exposing the Gemini API Key on the client-side.
export const GEMINI_API_PROXY_URL = 'https://api.laborsync.com/gemini-proxy';
