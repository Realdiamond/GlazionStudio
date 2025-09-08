import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

// ---- Config (reads your existing envs; safe on server) ----
const BASE_URL = process.env.PRIVATE_API_BASE_URL; // required
const PATH = process.env.RECIPE_IMAGE_PATH || '/api/Recipe/image';

const GENERIC_ERROR_MESSAGE =
  process.env.GENERIC_ERROR_MESSAGE || 'Something went wrong on our side. Please try again.';

const QUERY_TIMEOUT_MS = Number(process.env.QUERY_TIMEOUT_MS || 15000);

// Light-weight circuit breaker (same spirit as your chat route)
const CB_THRESHOLD = Number(process.env.CIRCUIT_BREAKER_THRESHOLD || 3);
const CB_COOLDOWN_MS = Number(process.env.CIRCUIT_BREAKER_COOLDOWN_MS || 60000);

let failureCount = 0;
let circuitOpenedAt: number | null = null;

function circuitOpen() {
  if (failureCount >= CB_THRESHOLD) {
    if (!circuitOpenedAt) circuitOpenedAt = Date.now();
    const since = Date.now() - circuitOpenedAt;
    if (since < CB_COOLDOWN_MS) return true;
    // cooldown passed → reset
    failureCount = 0;
    circuitOpenedAt = null;
  }
  return false;
}

function recordFailure() {
  failureCount += 1;
  if (failureCount >= CB_THRESHOLD && !circuitOpenedAt) circuitOpenedAt = Date.now();
}

function recordSuccess() {
  failureCount = 0;
  circuitOpenedAt = null;
}

// ---- Zod schema based on your Swagger ----
const recipeLine = z.object({
  material: z.string().min(1),
  amount: z.number(),
  unit: z.string().optional(),
});

const payloadSchema = z.object({
  baseRecipe: recipeLine,                // Swagger shows a single object (not array)
  additives: z.array(recipeLine).optional(),
  oxidationNumber: z.number().int().optional(),
  atmosphere: z.string().optional(),
  notes: z.string().optional(),
  enhancePrompt: z.boolean().optional(),
  quality: z.string().optional(),        // free text per Swagger
});

// ---- Handler ----
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS (mirrors your other route)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } });

  try {
    if (!BASE_URL) {
      return res.status(500).json({ error: { message: 'PRIVATE_API_BASE_URL not configured' } });
    }

    // Circuit breaker guard
    if (circuitOpen()) {
      return res.status(503).json({ error: { message: 'Service temporarily unavailable. Please try again shortly.' } });
    }

    // Parse and validate payload
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const data = payloadSchema.parse(body);

    // Timeout via AbortController
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

    const upstreamUrl = `${BASE_URL}${PATH}`;
    const r = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    }).catch((err) => {
      // Network-level failure → count as failure
      recordFailure();
      throw err;
    }).finally(() => clearTimeout(timeout));

    const contentType = r.headers.get('content-type') || '';

    if (!r.ok) {
      recordFailure();
      // Your Swagger shows 400/503 can be plain text strings
      let msg = `Upstream error (${r.status})`;
      try {
        if (contentType.includes('application/json')) {
          const j = await r.json();
          msg = typeof j === 'string' ? j : (j?.errorMessage || msg);
        } else {
          msg = await r.text();
        }
      } catch {
        // ignore parse errors
      }
      return res.status(r.status).json({ error: { message: msg || GENERIC_ERROR_MESSAGE } });
    }

    // Success
    recordSuccess();
    if (contentType.includes('application/json')) {
      const json = await r.json();
      return res.status(200).json(json); // includes imageUrl and metadata
    } else {
      // should not happen per Swagger, but safe-guard
      const text = await r.text();
      return res.status(200).send(text);
    }
  } catch (err: any) {
    const aborted = err?.name === 'AbortError';
    const message = aborted ? 'The request took too long and was aborted.' : (err?.message || GENERIC_ERROR_MESSAGE);
    return res.status(500).json({ error: { message } });
  }
}
