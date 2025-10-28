/**
 * GlazionStudio Chat API - Three-Endpoint Strategy
 * 
 * Flow:
 * 1. Hit Knowledge Base endpoint (RAG-based answers)
 * 2. Hit GPT Direct endpoint (Conversational AI)
 * 3. Send both answers to GPT Merge endpoint for intelligent combination
 * 
 * Features:
 * - Parallel requests for KB and GPT Direct
 * - Intelligent merging via GPT
 * - Comprehensive error handling
 * - Structured logging
 * - Caching of final merged responses
 * - Circuit breaker protection
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

/* ============================== Env & constants ============================== */

const RAW_BASE = String(process.env.PRIVATE_API_BASE_URL || '').replace(/\/+$/, '');
const QUERY_TIMEOUT_MS = Number(process.env.QUERY_TIMEOUT_MS || 10_000);

const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS || 60);
const MAX_CACHE_ENTRIES = Number(process.env.MAX_CACHE_ENTRIES || 1000);

const CIRCUIT_BREAKER_THRESHOLD = Number(process.env.CIRCUIT_BREAKER_THRESHOLD || 3);
const CIRCUIT_BREAKER_COOLDOWN_MS = Number(process.env.CIRCUIT_BREAKER_COOLDOWN_MS || 60_000);

const GENERIC_ERROR_MESSAGE = String(process.env.GENERIC_ERROR_MESSAGE || '').trim()
  || 'Something went wrong. Please try again.';

// GPT Direct defaults
const GPT_DEFAULT_MAX_TOKENS = Number(process.env.GPT_DEFAULT_MAX_TOKENS || 600);
const GPT_DEFAULT_TEMPERATURE = Number(process.env.GPT_DEFAULT_TEMPERATURE || 0.85);

// GPT Merge settings
const GPT_MERGE_MAX_TOKENS = Number(process.env.GPT_MERGE_MAX_TOKENS || 800);
const GPT_MERGE_TEMPERATURE = Number(process.env.GPT_MERGE_TEMPERATURE || 0.75);

/* ============================== Types ============================== */

// Knowledge Base Response
interface KnowledgeBaseResponse {
  query: string;
  answer: string;
  matches: Array<{
    id: string;
    score: number;
    content: string;
    metadata: Record<string, any>;
  }>;
  totalMatches: number;
  source: string;
  timestamp: string;
}

// GPT Direct Response
interface GPTDirectResponse {
  query: string;
  answer: string;
  isRestricted: boolean;
  restrictionReason: string | null;
  model: string;
  tokensUsed: number;
  timestamp: string;
}

// Final combined response
interface CombinedChatResponse {
  answer: string;
  content: string;
  confidence: number;
  metadata: {
    knowledgeBase?: {
      success: boolean;
      matches?: any[];
      source?: string;
      error?: string;
    };
    gptDirect?: {
      success: boolean;
      model?: string;
      tokensUsed?: number;
      isRestricted?: boolean;
      error?: string;
    };
    merge?: {
      success: boolean;
      tokensUsed?: number;
      error?: string;
    };
    totalTokensUsed: number;
    processingTimeMs: number;
  };
}

/* ============================== Cache ============================== */
type CacheEntry = { value: CombinedChatResponse; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function getCache(key: string): CombinedChatResponse | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) { cache.delete(key); return null; }
  cache.delete(key);
  cache.set(key, hit);
  return hit.value;
}

function setCache(key: string, value: CombinedChatResponse, ttlSec = CACHE_TTL_SECONDS) {
  if (!ttlSec) return;
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
}

/* ============================== Circuit breaker ============================== */
type Breaker = { fails: number; until?: number };
const cb: Breaker = { fails: 0, until: undefined };

function breakerOpen(): boolean {
  return !!(cb.until && Date.now() < cb.until);
}
function breakerFail() {
  cb.fails += 1;
  if (cb.fails >= CIRCUIT_BREAKER_THRESHOLD) {
    cb.until = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS;
    cb.fails = 0;
  }
}
function breakerOk() {
  cb.fails = 0; cb.until = undefined;
}

/* ============================== Helpers ============================== */
function reqId(): string {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {}
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function logError(payload: Record<string, unknown>) {
  console.error(JSON.stringify({ level: 'error', route: '/api/chat', ...payload }));
}
function logInfo(payload: Record<string, unknown>) {
  console.log(JSON.stringify({ level: 'info', route: '/api/chat', ...payload }));
}

function normalizeMessage(s: string): string {
  return String(s || '').trim().replace(/\s+/g, ' ');
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

/* ============================== API Calls ============================== */

/**
 * Call Knowledge Base endpoint
 */
async function callKnowledgeBase(
  query: string,
  timeoutMs: number
): Promise<
  | { ok: true; data: KnowledgeBaseResponse; ms: number; error?: never }
  | { ok: false; error: string; ms: number; data?: never }
> {
  const started = Date.now();
  try {
    const url = `${RAW_BASE}/api/SpecializedQA/knowledge-base`;
    const r = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    }, timeoutMs);

    const ms = Date.now() - started;

    if (!r.ok) {
      let text = '';
      try { text = await r.text(); } catch {}
      return { ok: false, error: text || `HTTP ${r.status}`, ms };
    }

    const data = await r.json() as KnowledgeBaseResponse;
    return { ok: true, data, ms };
  } catch (e: any) {
    const ms = Date.now() - started;
    const msg = e?.name === 'AbortError' ? 'timeout' : (e?.message || 'fetch_error');
    return { ok: false, error: msg, ms };
  }
}

/**
 * Call GPT Direct endpoint
 */
async function callGPTDirect(
  query: string,
  maxTokens: number,
  temperature: number,
  timeoutMs: number
): Promise<{ ok: true; data: GPTDirectResponse; ms: number } | { ok: false; error: string; ms: number }> {
  const started = Date.now();
  try {
    const url = `${RAW_BASE}/api/SpecializedQA/gpt-direct`;
    const r = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, maxTokens, temperature })
    }, timeoutMs);

    const ms = Date.now() - started;

    if (!r.ok) {
      let text = '';
      try { text = await r.text(); } catch {}
      return { ok: false, error: text || `HTTP ${r.status}`, ms };
    }

    const data = await r.json() as GPTDirectResponse;
    return { ok: true, data, ms };
  } catch (e: any) {
    const ms = Date.now() - started;
    const msg = e?.name === 'AbortError' ? 'timeout' : (e?.message || 'fetch_error');
    return { ok: false, error: msg, ms };
  }
}

/**
 * Call GPT Merge endpoint (uses GPT Direct with special prompt)
 */
async function callGPTMerge(
  originalQuery: string,
  kbAnswer: string,
  gptAnswer: string,
  timeoutMs: number
): Promise<{ ok: true; data: GPTDirectResponse; ms: number } | { ok: false; error: string; ms: number }> {
  const mergingPrompt = `You are an AI assistant that merges two responses about the same query into one coherent, comprehensive answer.

**Original Query:** "${originalQuery}"

**Response 1 (Knowledge Base - Factual):**
${kbAnswer}

**Response 2 (AI Assistant - Conversational):**
${gptAnswer}

**Your Task:**
Merge these two responses intelligently into ONE comprehensive answer that:
1. Combines ALL information from BOTH responses
2. Removes repetition and redundancy
3. Fixes any contradictions or errors
4. Maintains a natural, conversational flow
5. Preserves ALL unique facts, details, and insights from both
6. Organizes information logically with proper structure

**CRITICAL:** Do NOT omit any important information from either response. Your goal is to create a richer, more complete answer by combining both, not to summarize or reduce content.

Provide the merged response in clean markdown format.`;

  return callGPTDirect(mergingPrompt, GPT_MERGE_MAX_TOKENS, GPT_MERGE_TEMPERATURE, timeoutMs);
}

/**
 * Main combined fetch logic
 */
async function fetchCombinedAnswer(
  query: string,
  timeoutMs: number
): Promise<CombinedChatResponse> {
  const startTime = Date.now();
  let totalTokens = 0;

  // Step 1: Parallel calls to KB and GPT Direct
  const [kbResult, gptResult] = await Promise.all([
    callKnowledgeBase(query, timeoutMs),
    callGPTDirect(query, GPT_DEFAULT_MAX_TOKENS, GPT_DEFAULT_TEMPERATURE, timeoutMs)
  ]);

  // Track tokens
  if (gptResult.ok) totalTokens += gptResult.data.tokensUsed;

  // Step 2: Check if we have at least one success
  if (!kbResult.ok && !gptResult.ok) {
    logError({
      branch: 'both_endpoints_failed',
      kb_error: kbResult.error,
      gpt_error: gptResult.error
    });
    throw new Error('Both endpoints failed');
  }

  // Step 3: Merge responses
  let finalAnswer = '';
  let mergeResult: { ok: boolean; data?: GPTDirectResponse; error?: string } | null = null;

  if (kbResult.ok && gptResult.ok) {
    // Both succeeded - merge them
    logInfo({
      branch: 'both_succeeded_merging',
      kb_ms: kbResult.ms,
      gpt_ms: gptResult.ms
    });

    mergeResult = await callGPTMerge(
      query,
      kbResult.data.answer,
      gptResult.data.answer,
      timeoutMs
    );

    if (mergeResult.ok) {
      finalAnswer = mergeResult.data.answer;
      totalTokens += mergeResult.data.tokensUsed;
      logInfo({ branch: 'merge_successful', merge_ms: mergeResult.ms });
    } else {
      // Merge failed - fallback to concatenation
      logError({ branch: 'merge_failed_fallback', error: mergeResult.error });
      finalAnswer = `${gptResult.data.answer}\n\n---\n\n**Additional Context from Knowledge Base:**\n\n${kbResult.data.answer}`;
    }
  } else if (gptResult.ok) {
    // Only GPT succeeded
    finalAnswer = gptResult.data.answer;
    logInfo({ branch: 'gpt_only', kb_error: kbResult.error });
  } else if (kbResult.ok) {
    // Only KB succeeded
    finalAnswer = kbResult.data.answer;
    logInfo({ branch: 'kb_only', gpt_error: gptResult.error });
  }

  const processingTimeMs = Date.now() - startTime;

  // Build response
  const response: CombinedChatResponse = {
    answer: finalAnswer,
    content: finalAnswer,
    confidence: 0.8, // Default confidence
    metadata: {
      knowledgeBase: kbResult.ok ? {
        success: true,
        matches: kbResult.data.matches,
        source: kbResult.data.source
      } : {
        success: false,
        error: kbResult.error
      },
      gptDirect: gptResult.ok ? {
        success: true,
        model: gptResult.data.model,
        tokensUsed: gptResult.data.tokensUsed,
        isRestricted: gptResult.data.isRestricted
      } : {
        success: false,
        error: gptResult.error
      },
      merge: mergeResult ? (mergeResult.ok ? {
        success: true,
        tokensUsed: mergeResult.data!.tokensUsed
      } : {
        success: false,
        error: mergeResult.error
      }) : undefined,
      totalTokensUsed: totalTokens,
      processingTimeMs
    }
  };

  return response;
}

/* ============================== Handler ============================== */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const request_id = reqId();
  const started_at = Date.now();

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!RAW_BASE) {
      logError({ request_id, branch: 'config_error', base_url_set: false });
      return res.status(200).json({
        answer: GENERIC_ERROR_MESSAGE,
        content: GENERIC_ERROR_MESSAGE,
        confidence: 0
      });
    }

    const { message } = (req.body || {}) as { message?: string };

    if (!message || !String(message).trim()) {
      logError({ request_id, branch: 'bad_request', msg: 'No message provided' });
      return res.status(200).json({
        answer: GENERIC_ERROR_MESSAGE,
        content: GENERIC_ERROR_MESSAGE,
        confidence: 0
      });
    }

    // Circuit breaker check
    if (breakerOpen()) {
      logInfo({ request_id, branch: 'cb_open', cb_until: cb.until });
      return res.status(200).json({
        answer: GENERIC_ERROR_MESSAGE,
        content: GENERIC_ERROR_MESSAGE,
        confidence: 0
      });
    }

    const normalized = normalizeMessage(message);
    const cacheKey = `combined::${normalized}`;

    // Check cache
    const cached = getCache(cacheKey);
    if (cached) {
      logInfo({ request_id, branch: 'cache_hit' });
      return res.status(200).json(cached);
    }

    // Fetch combined answer
    const response = await fetchCombinedAnswer(normalized, QUERY_TIMEOUT_MS);

    // Success - reset circuit breaker
    breakerOk();

    // Cache the response
    setCache(cacheKey, response);

    const total_ms = Date.now() - started_at;
    logInfo({
      request_id,
      branch: 'success',
      total_ms,
      kb_success: response.metadata.knowledgeBase?.success,
      gpt_success: response.metadata.gptDirect?.success,
      merge_success: response.metadata.merge?.success,
      total_tokens: response.metadata.totalTokensUsed
    });

    return res.status(200).json(response);

  } catch (e: any) {
    breakerFail();
    logError({
      request_id,
      branch: 'unhandled_error',
      msg: e?.message || 'Unhandled error'
    });
    return res.status(200).json({
      answer: GENERIC_ERROR_MESSAGE,
      content: GENERIC_ERROR_MESSAGE,
      confidence: 0
    });
  }
}