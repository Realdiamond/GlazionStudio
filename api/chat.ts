// /api/chat.ts — Parallel merge (KB + Conversation), Markdown-preserving, semantic dedupe,
// Conversation fallback, link blocklist, soft length cap, tiny cache, circuit breaker.
// Returns ONLY { content }.

import type { VercelRequest, VercelResponse } from '@vercel/node';

/* ============================== Env & constants ============================== */

const RAW_BASE = (process.env.PRIVATE_API_BASE_URL || 'http://18.221.95.163/').replace(/\/+$/, '');
const KB_TIMEOUT_MS = Number(process.env.KB_TIMEOUT_MS || 10_000);
const CONV_TIMEOUT_MS = Number(process.env.CONV_TIMEOUT_MS || 10_000);
const CONV_CONFIDENCE_MIN = Number(process.env.CONV_CONFIDENCE_MIN || 0.6);

const KEEP_MARKDOWN = String(process.env.KEEP_MARKDOWN || '1') === '1';
const DEDUP_SEMANTIC = String(process.env.DEDUP_SEMANTIC || '1') === '1';

const MAX_OUTPUT_CHARS = Number(process.env.MAX_OUTPUT_CHARS || 4000);

const STRICT_LINK_BLOCKLIST = String(process.env.STRICT_LINK_BLOCKLIST || 'digitalfire.com')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS || 60);
const CIRCUIT_BREAKER_THRESHOLD = Number(process.env.CIRCUIT_BREAKER_THRESHOLD || 3);
const CIRCUIT_BREAKER_COOLDOWN_MS = Number(process.env.CIRCUIT_BREAKER_COOLDOWN_MS || 60_000);

/* ============================== Tiny in-memory cache ============================== */
// (serverless instances may be ephemeral; this still helps warm instances)
type CacheEntry = { content: string; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function getCache(key: string): string | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) { cache.delete(key); return null; }
  return hit.content;
}
function setCache(key: string, content: string, ttlSec = CACHE_TTL_SECONDS) {
  if (!ttlSec) return;
  cache.set(key, { content, expiresAt: Date.now() + ttlSec * 1000 });
}

/* ============================== Circuit breaker ============================== */
type Breaker = { fails: number; until?: number };
const cb: Record<'kb'|'conv', Breaker> = { kb: { fails: 0 }, conv: { fails: 0 }};

function breakerOpen(which: 'kb' | 'conv'): boolean {
  const b = cb[which];
  return !!(b.until && Date.now() < b.until);
}
function breakerFail(which: 'kb' | 'conv') {
  const b = cb[which];
  b.fails += 1;
  if (b.fails >= CIRCUIT_BREAKER_THRESHOLD) {
    b.until = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS;
    b.fails = 0;
  }
}
function breakerOk(which: 'kb' | 'conv') {
  const b = cb[which];
  b.fails = 0; b.until = undefined;
}

/* ============================== Sanitizers ============================== */

function stripArtifacts(t: string): string {
  if (!t) return '';
  let s = t
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00A0/g, ' ')
    .replace(/\*{3,}/g, '**')
    .trim();

  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1).trim();
  if (s.startsWith('**') && s.endsWith('**')) s = s.slice(2, -2).trim();
  s = s.replace(/^\*+/, '').replace(/\*+$/, '').trim();

  // Collapse repeated boilerplate lines
  s = s.replace(
    /(No relevant [^.]*? found\. Please try rephrasing your question\.)\s*\1+/gi,
    '$1'
  );
  return s;
}

function stripBlockedLinks(text: string): string {
  if (!text) return '';
  let s = text;
  for (const dom of STRICT_LINK_BLOCKLIST) {
    const rx = new RegExp(`https?:\\/\\/(?:www\\.)?${dom.replace(/\./g, '\\.')}[^\\s)\\]]*`, 'gi');
    s = s.replace(rx, '');
    // also remove “as noted on domain” type lines
    const lineRx = new RegExp(`^.*${dom.replace(/\./g, '\\.')}.*$`, 'gim');
    s = s.replace(lineRx, '');
  }
  // Remove boilerplate lines
  const patterns: RegExp[] = [
    /^\s*[-•]?\s*Buy me a coffee.*$/gim,
    /\bBuy me a coffee\b.*$/gim,
    /^\s*[-•]?\s*All Rights Reserved.*$/gim,
    /\bAll Rights Reserved\b.*$/gim,
    /^\s*[-•]?\s*Privacy Policy.*$/gim,
    /\bPrivacy Policy\b.*$/gim,
    /^\s*[-•]?\s*Related to:\s*.*$/gim,
    /\bRelated to:\s*[^\n]+/gim,
  ];
  for (const rx of patterns) s = s.replace(rx, '');
  // Clean empty bullets & extra blank lines
  s = s.replace(/^\s*[-•]\s*$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  return s;
}

function sanitizeOut(text: string): string {
  return stripBlockedLinks(stripArtifacts(text || ''));
}

/* ============================== Similarity utils ============================== */

function normalizeForSim(s: string): string {
  return s
    .toLowerCase()
    .replace(/`{3}[\s\S]*?`{3}/g, ' ') // strip code fences for similarity only
    .replace(/[`_*#>~\-+]+/g, ' ')     // strip markdown symbols
    .replace(/[“”‘’"()[\]{}<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function tokens(s: string): string[] {
  return normalizeForSim(s).split(/[^a-z0-9]+/).filter(w => w.length > 2);
}
function set<T>(arr: T[]): Set<T> { return new Set(arr); }
function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
}
function trigrams(s: string): Set<string> {
  const n = 3; const out: string[] = [];
  const str = normalizeForSim(s);
  for (let i = 0; i <= str.length - n; i++) out.push(str.slice(i, i + n));
  return set(out);
}
function potteryDensityScore(s: string): number {
  const k = ['glaze','glazes','flux','frit','feldspar','silica','alumina','cone','crazing','fit','thermal','expansion','oxidation','reduction','bisque','vitrify','sinter','kiln','fire','soak','hold','cool','schedule','recipe'];
  const t = tokens(s);
  if (!t.length) return 0;
  let hits = 0;
  for (const w of t) if (k.includes(w)) hits++;
  return hits / t.length;
}

/* ============================== Markdown block split ============================== */

type Block = { raw: string; kind: 'code'|'list'|'heading'|'paragraph'|'other' };

function splitMarkdownBlocks(text: string): Block[] {
  if (!text) return [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: Block[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // code fence
    if (/^\s*```/.test(line)) {
      const start = i;
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) i++;
      if (i < lines.length) i++; // include closing fence
      out.push({ raw: lines.slice(start, i).join('\n'), kind: 'code' });
      continue;
    }

    // heading
    if (/^\s*#{1,6}\s+/.test(line)) {
      out.push({ raw: line, kind: 'heading' });
      i++;
      continue;
    }

    // list (bulleted or numbered)
    if (/^\s*(?:[-*+]|\d+\.)\s+/.test(line)) {
      const start = i;
      i++;
      while (i < lines.length && /^\s*(?:[-*+]|\d+\.)\s+/.test(lines[i])) i++;
      out.push({ raw: lines.slice(start, i).join('\n'), kind: 'list' });
      continue;
    }

    // blank → skip/paragraph boundary
    if (/^\s*$/.test(line)) { i++; continue; }

    // paragraph: group until next blank or special block
    const start = i;
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^\s*```/.test(lines[i]) &&
      !/^\s*#{1,6}\s+/.test(lines[i]) &&
      !/^\s*(?:[-*+]|\d+\.)\s+/.test(lines[i])
    ) i++;
    out.push({ raw: lines.slice(start, i).join('\n'), kind: 'paragraph' });
  }
  return out;
}

/* ============================== Block-level dedupe ============================== */

function similar(a: string, b: string): boolean {
  const SIM_TOKENS = 0.8;
  const SIM_TRIGRAM = 0.85;
  const at = set(tokens(a)), bt = set(tokens(b));
  if (jaccard(at, bt) >= SIM_TOKENS) return true;
  if (jaccard(trigrams(a), trigrams(b)) >= SIM_TRIGRAM) return true;
  return false;
}

function dedupeBlocks(primary: Block[], secondary: Block[]): Block[] {
  if (!DEDUP_SEMANTIC) return [...primary, ...secondary];

  const kept: Block[] = [];
  const sigs: { text: string; density: number; idx: number }[] = [];

  const consider = (blk: Block, preferPrimary: boolean) => {
    const text = normalizeForSim(blk.raw);
    if (!text) return;
    const dens = potteryDensityScore(text);

    // duplicate check against existing
    for (let k = 0; k < sigs.length; k++) {
      const prev = sigs[k];
      if (similar(text, prev.text)) {
        // replace if denser OR preferPrimary beats secondary
        if (dens > prev.density || (preferPrimary && kept[prev.idx].raw !== blk.raw)) {
          kept[prev.idx] = blk;
          sigs[k] = { text, density: dens, idx: prev.idx };
        }
        return;
      }
    }
    const idx = kept.push(blk) - 1;
    sigs.push({ text, density: dens, idx });
  };

  for (const b of primary) consider(b, true);
  for (const b of secondary) consider(b, false);

  return kept;
}

/* ============================== Sentence-level tidy ============================== */

function splitSentences(text: string): string[] {
  if (!text) return [];
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9(])/)
    .map(s => s.trim())
    .filter(Boolean);
}

function dedupeSentences(paragraph: string): string {
  if (!DEDUP_SEMANTIC) return paragraph;
  const sims: string[] = [];
  const seen: { t: Set<string>; g: Set<string>; dens: number; raw: string }[] = [];

  for (const s of splitSentences(paragraph)) {
    const text = normalizeForSim(s);
    const t = set(tokens(text));
    const g = trigrams(text);
    const dens = potteryDensityScore(text);

    let dupAt = -1;
    for (let i = 0; i < seen.length; i++) {
      const prev = seen[i];
      if (jaccard(t, prev.t) >= 0.8 || jaccard(g, prev.g) >= 0.85) { dupAt = i; break; }
    }
    if (dupAt >= 0) {
      if (dens > seen[dupAt].dens) seen[dupAt] = { t, g, dens, raw: s };
    } else {
      seen.push({ t, g, dens, raw: s });
    }
  }
  return seen.map(x => x.raw).join(' ');
}

/* ============================== Fetch helpers ============================== */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

/* ============================== Upstream calls ============================== */
type KBRes = { answer: string; success?: boolean };
type ConvRes = { answer: string; success?: boolean; responseType?: number; confidence?: number };

async function askKB(question: string, topK?: number | string): Promise<KBRes | null> {
  if (breakerOpen('kb')) return null;
  const qs = new URLSearchParams({ question: String(question) });
  if (topK !== undefined && topK !== null) qs.set('topK', String(topK));
  const url = `${RAW_BASE}/api/Pottery/query?${qs.toString()}`;

  try {
    const r = await fetchWithTimeout(url, { method: 'GET', headers: { accept: 'application/json' } }, KB_TIMEOUT_MS);
    const json = JSON.parse(await r.text());
    const out: KBRes = { answer: String(json?.answer ?? ''), success: Boolean(json?.success) };
    breakerOk('kb'); return out;
  } catch (e) { breakerFail('kb'); return null; }
}

async function askConversation(question: string, userId?: string): Promise<ConvRes | null> {
  if (breakerOpen('conv')) return null;
  const qs = new URLSearchParams({ question: String(question) });
  if (userId) qs.set('userId', String(userId));
  const url = `${RAW_BASE}/api/Conversation/ask?${qs.toString()}`;

  try {
    const r = await fetchWithTimeout(url, { method: 'GET', headers: { accept: 'application/json' } }, CONV_TIMEOUT_MS);
    const json = JSON.parse(await r.text());
    const out: ConvRes = {
      answer: String(json?.answer ?? ''),
      success: Boolean(json?.success),
      responseType: typeof json?.responseType === 'number' ? json.responseType : undefined,
      confidence: typeof json?.confidence === 'number' ? json.confidence : undefined,
    };
    breakerOk('conv'); return out;
  } catch (e) { breakerFail('conv'); return null; }
}

/* ============================== Strength rules ============================== */

const NOINFO_RX = /^no relevant pottery information found/i;

function kbStrong(kb: KBRes | null): boolean {
  if (!kb) return false;
  const ans = sanitizeOut(kb.answer);
  if (!ans || NOINFO_RX.test(ans)) return false;
  if (kb.success === false) return false;
  if (ans.length < 20) return false;
  return true;
}
function convStrong(conv: ConvRes | null): boolean {
  if (!conv) return false;
  const ans = sanitizeOut(conv.answer);
  if (!ans) return false;
  if (conv.success === false) return false;
  if (typeof conv.responseType === 'number' && conv.responseType === 1) return true;
  if (typeof conv.confidence === 'number' && conv.confidence >= CONV_CONFIDENCE_MIN) return true;
  return false;
}

/* ============================== Merge logic ============================== */

function looksProceduralQuery(q: string): boolean {
  return /\b(how|why|steps?|fix|troubleshoot|prevent|which|should i|recommend|suggest|better|won't|cannot|keeps|not working)\b/i.test(q);
}

function choosePrimary(kbOK: boolean, convOK: boolean, question: string): 'kb'|'conv' {
  if (kbOK && convOK) {
    // prefer Conversation for procedural/why; KB for definitions/terms
    return looksProceduralQuery(question) ? 'conv' : 'kb';
  }
  if (convOK) return 'conv';
  if (kbOK) return 'kb';
  // both weak → still prefer Conversation per your rule
  return 'conv';
}

function mergeMarkdownAnswers(question: string, kbAns: string, convAns: string, kbOK: boolean, convOK: boolean): string {
  const primaryKind = choosePrimary(kbOK, convOK, question);
  const primaryText = primaryKind === 'kb' ? kbAns : convAns;
  const secondaryText = primaryKind === 'kb' ? convAns : kbAns;

  // Preserve Markdown as-is in blocks; compare with normalized versions only.
  const primBlocks = splitMarkdownBlocks(primaryText);
  const secBlocks  = splitMarkdownBlocks(secondaryText);

  const mergedBlocks = dedupeBlocks(primBlocks, secBlocks);

  // For paragraph blocks, dedupe sentences inside to tighten without losing meaning.
  const tightened = mergedBlocks.map(b => {
    if (!DEDUP_SEMANTIC) return b.raw;
    if (b.kind !== 'paragraph') return b.raw;
    return dedupeSentences(b.raw);
  });

  let merged = tightened.join('\n\n').trim();

  // Sanitise output (keep Markdown; strip links/boilerplate)
  merged = sanitizeOut(merged);

  // Soft cap
  if (MAX_OUTPUT_CHARS && merged.length > MAX_OUTPUT_CHARS) {
    // drop trailing blocks without cutting inside code/list blocks
    const blocks = splitMarkdownBlocks(merged);
    const kept: string[] = [];
    let total = 0;
    for (const b of blocks) {
      const s = b.raw;
      if (total + s.length + 2 > MAX_OUTPUT_CHARS) break;
      kept.push(s); total += s.length + 2;
    }
    merged = kept.join('\n\n').trim();
  }
  return merged;
}

/* ============================== Handler ============================== */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { message, topK, userId } = (req.body || {}) as {
      message?: string;
      topK?: number | string;
      userId?: string;
    };
    if (!message) return res.status(400).json({ error: 'message is required' });

    // Cache check
    const cacheKey = `${message}::${topK || ''}::${userId || ''}`;
    const cached = getCache(cacheKey);
    if (cached) return res.status(200).json({ content: cached });

    const t0 = Date.now();

    // Call BOTH endpoints in parallel (unless breaker open)
    const [kb, conv] = await Promise.all([
      askKB(message, topK),
      askConversation(message, userId),
    ]);

    const kbAns  = sanitizeOut(kb?.answer || '');
    const convAns = sanitizeOut(conv?.answer || '');

    const kbOK = kbStrong(kb);
    const convOK = convStrong(conv);

    let content = '';

    if (kbOK && convOK) {
      content = mergeMarkdownAnswers(message, kbAns, convAns, kbOK, convOK);
      console.log('[chat] branch=merge ok kb+conv', { kbOK, convOK, ms: Date.now() - t0 });
    } else if (kbOK) {
      content = kbAns;
      console.log('[chat] branch=kb_only', { ms: Date.now() - t0 });
    } else if (convOK) {
      content = convAns;
      console.log('[chat] branch=conv_only', { ms: Date.now() - t0 });
    } else {
      // Both weak → Conversation fallback (sanitised), per your rule
      content = convAns || kbAns || 'No clear answer available right now.';
      console.log('[chat] branch=conv_fallback', { ms: Date.now() - t0 });
    }

    // Keep Markdown if present from upstream (we never add our own formatting)
    if (!KEEP_MARKDOWN) {
      // If ever disabled, we could strip—but your spec keeps it on.
    }

    // Store in cache
    setCache(cacheKey, content);

    return res.status(200).json({ content });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
