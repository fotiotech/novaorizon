// lib/voyageClient.ts
import "server-only";
import { VoyageAIClient } from "voyageai";

// MongoDB Atlas hosts Voyage models behind its own endpoint. The SDK's
// default (api.voyageai.com) rejects Atlas-issued keys with a 403, so
// we have to point it at ai.mongodb.com explicitly. Override via
// VOYAGE_BASE_URL if you ever switch to a Voyage-direct key.
const VOYAGE_BASE_URL =
  process.env.VOYAGE_BASE_URL ?? "https://ai.mongodb.com/v1";

// Lazy — instantiated on first use, not at module load. This lets
// callers load this module before .env is populated (backfill scripts,
// tests) and pick up the key when the first call happens.
let _client: VoyageAIClient | null = null;

export function getVoyageClient(): VoyageAIClient {
  if (!_client) {
    _client = new VoyageAIClient({
      apiKey: process.env.VOYAGE_API_KEY!,
      baseUrl: VOYAGE_BASE_URL,
    });
  }
  return _client;
}
