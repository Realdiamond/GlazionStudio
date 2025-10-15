import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

/**
 * Recipes → Image proxy
 * - Forwards safe payload to PRIVATE_API_BASE_URL + PATH
 * - Times out with RECIPE_TIMEOUT_MS (default 60s)
 * - Circuit breaker counts only network errors, timeouts, and 5xx
 * - 4xx from upstream are passed through and DO NOT trip the breaker
 */

/* ============================== Config ============================== */

const BASE_URL = process.env.PRIVATE_API_BASE_URL; // required
const PATH = process.env.RECIPE_IMAGE_PATH || '/api/Recipe/image';

const GENERIC_ERROR_MESSAGE =
  process.env.GENERIC_ERROR_MESSAGE || 'Something went wrong on our side. Please try again.';

// Use recipe-specific timeout, then fall back to general, then 60s default
const RECIPE_TIMEOUT_MS = Number(
  process.env.RECIPE_TIMEOUT_MS || process.env.QUERY_TIMEOUT_MS || 60000
);

// Circuit breaker (same spirit as chat, but smarter on 4xx)
const CB_THRESHOLD = Number(process.env.CIRCUIT_BREAKER_THRESHOLD || 3);
const CB_COOLDOWN_MS = Number(process.env.CIRCUIT_BREAKER_COOLDOWN_MS || 60000);

let failureCount = 0;
let circuitOpenedAt: number | null = null;

function circuitOpen(): boolean {
  if (failureCount >= CB_THRESHOLD) {
    if (!circuitOpenedAt) circuitOpenedAt = Date.now();
    const since = Date.now() - circuitOpenedAt;
    if (since < CB_COOLDOWN_MS) return true;
    // Cooldown elapsed → reset
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

/* ============================== Validation ============================== */

// Clean payload schema - NO enhancePrompt, NO quality
const payloadSchema = z.object({
  cone: z.string().min(1),
  atmosphere: z.string().optional(),
  umf: z.record(z.number()), // UMF oxide values
  molePct: z.record(z.number()), // Mole percent values
  notes: z.string().optional(),
});

/* ============================== Handler ============================== */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
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

    // Parse + validate
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const data = payloadSchema.parse(body);

    // Log what we're sending
    console.log(JSON.stringify({
      level: 'info',
      route: '/api/recipes-to-image',
      action: 'forwarding_to_backend',
      payload: data,
    }));

    // Timeout via AbortController
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RECIPE_TIMEOUT_MS);

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
      // Read message from upstream for debugging & user feedback
      let msg = `Upstream error (${r.status})`;
      try {
        if (contentType.includes('application/json')) {
          const j = await r.json();
          msg = typeof j === 'string' ? j : (j?.errorMessage || msg);
        } else {
          msg = await r.text();
        }
      } catch {
        // ignore parsing errors
      }

      // Log for observability
      console.log(JSON.stringify({
        level: 'info',
        route: '/api/recipes-to-image',
        upstream_status: r.status,
        message: msg,
      }));

      // Only count server-side failures (>=500). DO NOT count 4xx.
      if (r.status >= 500) recordFailure(); else recordSuccess();

      return res.status(r.status).json({ error: { message: msg || GENERIC_ERROR_MESSAGE } });
    }

    // Success
    recordSuccess();
    if (contentType.includes('application/json')) {
      const json = await r.json();
      return res.status(200).json(json); // includes imageUrl and metadata
    } else {
      // Should not happen per Swagger, but safe-guard
      const text = await r.text();
      return res.status(200).send(text);
    }
  } catch (err: any) {
    const aborted = err?.name === 'AbortError';
    const message = aborted ? 'The request took too long and was aborted.' : (err?.message || GENERIC_ERROR_MESSAGE);

    // Log the timeout/exception once
    console.error(JSON.stringify({
      level: 'error',
      route: '/api/recipes-to-image',
      aborted,
      message,
    }));

    // On timeout or network/unknown errors, count as failure
    if (aborted) recordFailure();

    return res.status(aborted ? 504 : 500).json({ error: { message } });
  }
}