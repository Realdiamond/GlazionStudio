// /api/chat.ts — Parallel KB + Conversation, merge + dedupe, Conversation fallback.
// Returns ONLY { content }.
import type { VercelRequest, VercelResponse } from '@vercel/node';

/* ----------------------------- Env & Defaults ----------------------------- */
const RAW_BASE = (process.env.PRIVATE_API_BASE_URL || 'http://18.221.95.163/').replace(/\/+$/, '');
const KB_TIMEOUT_MS = Number(process.env.KB_TIMEOUT_MS || 10_000);
const CONV_TIMEOUT_MS = Number(process.env.CONV_TIMEOUT_MS || 10_000);
const CONV_CONFIDENCE_MIN = Number(process.env.CONV_CONFIDENCE_MIN || 0.6);
const MAX_MATCH_BULLETS = Number(process.env.MAX_MATCH_BULLETS || 6);

/* --------------------------------- Modes ---------------------------------- */
type Mode = 'short' | 'medium' | 'long';
function inferMode(q: string): Mode {
  const s = (q || '').toLowerCase();
  if (/\b(how|how to|guide|tutorial|technique|techniques|steps|process|build|make|recipe|schedule|troubleshoot|fix|prevent|best practices|ideas|examples|compare|vs|advantages|disadvantages|pros|cons|materials|tools)\b/.test(s)) {
    return 'long';
  }
  if (/\b(short|brief|tl;dr|summary|one line|in a sentence|quick)\b/.test(s)) return 'short';
  if (s.split(/\s+/).length <= 3) return 'medium';
  return 'medium';
}

/* ------------------------------- Sanitizers -------------------------------- */
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

// HARD FILTER: remove attribution/ads/links we must never show
function purgeProhibited(text: string): string {
  if (!text) return '';
  let s = text;

  // Kill any digitalfire URLs outright
  s = s.replace(/https?:\/\/(?:www\.)?digitalfire\.com[^\s)\]]*/gi, '');

  // Remove entire lines or phrases that leak source/ads/legal boilerplate
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

  // Clean empty bullets produced by removals
  s = s.replace(/^\s*[-•]\s*$/gm, '');

  // Collapse repeated blank lines
  s = s.replace(/\n{3,}/g, '\n\n').trim();
  return s;
}

/* -------------------------- Sentence & Dedupe utils ------------------------ */
function splitSentences(t: string): string[] {
  if (!t) return [];
  return t
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9(])/)
    .map(s => s.trim())
    .filter(Boolean);
}
function normalizeForSim(s: string): string {
  return s
    .toLowerCase()
    .replace(/[“”‘’"()[\]{}<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function tokens(s: string): string[] {
  return normalizeForSim(s).split(/[^a-z0-9]+/).filter(w => w.length > 2);
}
function set<T>(arr: T[]) { return new Set(arr); }
function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
}
function trigrams(s: string): Set<string> {
  const n = 3; const out: string[] = [];
  const str = normalizeForSim(s).replace(/[^a-z0-9 ]+/g, '');
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
function isStepLike(s: string): boolean {
  return /\b(step|then|next|finally|ensure|avoid|use|mix|wedge|center|pull|trim|dry|bisque|glaze|fire|cool|inspect|measure|program|hold|soak|load|unload|apply|wash|sand)\b/i.test(s);
}
function dedupeByMeaning(lines: string[]): string[] {
  const SIM_TOKENS = 0.80;
  const SIM_TRIGRAM = 0.85;

  const kept: string[] = [];
  const sigs: { tok?: Set<string>; tri?: Set<string>; score: number; raw: string }[] = [];

  for (const raw of lines) {
    const s = raw.trim();
    if (!s) continue;

    const tokSet = set(tokens(s));
    const triSet = trigrams(s);
    const pd = potteryDensityScore(s);

    let dup = false;
    for (const prev of sigs) {
      const jac = jaccard(tokSet, prev.tok!);
      if (jac >= SIM_TOKENS) { dup = true; 
        // Keep the stronger pottery sentence
        if (pd > prev.score) { prev.raw = s; prev.tok = tokSet; prev.tri = triSet; prev.score = pd; }
        break;
      }
      const triSim = jaccard(triSet, prev.tri!);
      if (triSim >= SIM_TRIGRAM) { dup = true;
        if (pd > prev.score) { prev.raw = s; prev.tok = tokSet; prev.tri = triSet; prev.score = pd; }
        break;
      }
    }
    if (!dup) {
      kept.push(s);
      sigs.push({ raw: s, tok: tokSet, tri: triSet, score: pd });
    }
  }
  // Return the possibly updated 'raw' strings from sigs to reflect replacements
  return sigs.map(x => x.raw);
}

/* --------------------------------- Fetching -------------------------------- */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

/* ------------------------------- Upstream calls ---------------------------- */
type KBRes = {
  answer: string; success?: boolean; matches?: any[]; matchCount?: number;
};
type ConvRes = {
  answer: string; success?: boolean; responseType?: number; confidence?: number;
};

async function askKB(question: string, topK?: number | string): Promise<KBRes | null> {
  const qs = new URLSearchParams({ question: String(question) });
  if (topK !== undefined && topK !== null) qs.set('topK', String(topK));
  const url = `${RAW_BASE}/api/Pottery/query?${qs.toString()}`;
  try {
    const r = await fetchWithTimeout(url, { method: 'GET', headers: { accept: 'application/json' } }, KB_TIMEOUT_MS);
    const text = await r.text();
    const json = JSON.parse(text);
    return {
      answer: String(json?.answer ?? ''),
      success: Boolean(json?.success),
      matches: Array.isArray(json?.matches) ? json.matches : [],
      matchCount: Number(json?.matchCount ?? 0),
    };
  } catch {
    return null;
  }
}

async function askConversation(question: string, userId?: string): Promise<ConvRes | null> {
  const qs = new URLSearchParams({ question: String(question) });
  if (userId) qs.set('userId', String(userId));
  const url = `${RAW_BASE}/api/Conversation/ask?${qs.toString()}`;
  try {
    const r = await fetchWithTimeout(url, { method: 'GET', headers: { accept: 'application/json' } }, CONV_TIMEOUT_MS);
    const text = await r.text();
    const json = JSON.parse(text);
    return {
      answer: String(json?.answer ?? ''),
      success: Boolean(json?.success),
      responseType: typeof json?.responseType === 'number' ? json.responseType : undefined,
      confidence: typeof json?.confidence === 'number' ? json.confidence : undefined,
    };
  } catch {
    return null;
  }
}

/* --------------------------- Strength/weakness rules ------------------------ */
const NOINFO_RX = /^no relevant pottery information found/i;
function kbStrong(kb: KBRes | null): boolean {
  if (!kb) return false;
  const ans = purgeProhibited(stripArtifacts(kb.answer || '')).trim();
  if (!ans || NOINFO_RX.test(ans)) return false;
  if (kb.success === false) return false;
  if (ans.length < 20 && (!kb.matches || kb.matches.length === 0)) return false;
  return true;
}
function convStrong(conv: ConvRes | null): boolean {
  if (!conv) return false;
  const ans = purgeProhibited(stripArtifacts(conv.answer || '')).trim();
  if (!ans) return false;
  if (conv.success === false) return false;
  // responseType: 1 = “proper answer” (per your sample); otherwise trust confidence
  if (typeof conv.responseType === 'number' && conv.responseType === 1) return true;
  if (typeof conv.confidence === 'number' && conv.confidence >= CONV_CONFIDENCE_MIN) return true;
  return false;
}

/* ----------------------------- Composition utils --------------------------- */
function pickSupportBullets(matches: any[], limit: number): string[] {
  const bullets: string[] = [];
  for (const m of (matches || [])) {
    const cands = [String(m?.lede || ''), String(m?.description || '')].filter(Boolean);
    for (const c of cands) {
      const ss = splitSentences(purgeProhibited(stripArtifacts(c)));
      for (const s of ss) {
        if (s.length < 20) continue;
        bullets.push(s);
        if (bullets.length >= limit) return bullets;
      }
    }
    if (bullets.length >= limit) break;
  }
  return bullets;
}
function titlesFromMatches(matches: any[]): string[] {
  const out: string[] = [];
  for (const m of (matches || [])) {
    const t = String(m?.title || '').trim();
    if (t) out.push(`**${t}**`);
    if (out.length >= 8) break;
  }
  return Array.from(new Set(out));
}
function composeShort(sentPool: string[]): string {
  return sentPool.slice(0, 2).join(' ');
}
function composeMedium(main: string, support: string[]): string {
  if (!support.length) return main;
  return `${main}\n\n${support.slice(0, MAX_MATCH_BULLETS).map(s => `- ${s}`).join('\n')}`;
}
function composeLong(question: string, sentPool: string[], support: string[], related: string[]): string {
  const procedural = /\b(how|how to|guide|tutorial|technique|techniques|steps|process|build|make|recipe|schedule|troubleshoot|fix|prevent|best practices)\b/i.test(question);
  const overview = sentPool[0] || '';
  const rest = sentPool.slice(1);

  const stepLike = rest.filter(isStepLike);
  const points = rest.filter(x => !isStepLike(x));

  const sections: string[] = [];
  if (overview) sections.push(`### **Overview**\n\n${overview}`);
  if (procedural && stepLike.length) sections.push(`### **Key Steps**\n\n${stepLike.map(s => `- ${s}`).join('\n')}`);
  if (points.length) sections.push(`${procedural ? '### **Notes & Parameters**' : '### **Key Points**'}\n\n${points.map(s => `- ${s}`).join('\n')}`);
  if (support.length) sections.push(`### **Extra Details**\n\n${support.slice(0, MAX_MATCH_BULLETS).map(s => `- ${s}`).join('\n')}`);
  if (related.length) sections.push(`### **Related Topics**\n\n${related.map(s => `- ${s}`).join('\n')}`);

  return sections.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* --------------------------------- Handler --------------------------------- */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { message, topK, userId } = (req.body || {}) as {
      message?: string;
      topK?: number | string;
      userId?: string;
    };
    if (!message) return res.status(400).json({ error: 'message is required' });

    const mode = inferMode(message);

    // Call BOTH endpoints in parallel
    const [kb, conv] = await Promise.all([
      askKB(message, topK),
      askConversation(message, userId)
    ]);

    const kbOK = kbStrong(kb);
    const convOK = convStrong(conv);

    // Prepare sources
    const kbAnswer = purgeProhibited(stripArtifacts(kb?.answer || '')).trim();
    const convAnswer = purgeProhibited(stripArtifacts(conv?.answer || '')).trim();

    // Decision tree
    if (kbOK && convOK) {
      // Merge + dedupe
      const mergedSentences = dedupeByMeaning([
        ...splitSentences(kbAnswer),
        ...splitSentences(convAnswer),
      ]);
      const support = pickSupportBullets(kb?.matches || [], MAX_MATCH_BULLETS);
      const related = titlesFromMatches(kb?.matches || []);

      let content = '';
      if (mode === 'short') {
        content = composeShort(mergedSentences);
      } else if (mode === 'medium') {
        content = composeMedium(composeShort(mergedSentences), support);
      } else {
        content = composeLong(message, mergedSentences, support, related);
      }
      content = purgeProhibited(stripArtifacts(content)).replace(/\n{3,}/g, '\n\n').trim();
      return res.status(200).json({ content });
    }

    if (kbOK && !convOK) {
      // Use KB only
      const sent = splitSentences(kbAnswer);
      const support = pickSupportBullets(kb?.matches || [], MAX_MATCH_BULLETS);
      const related = titlesFromMatches(kb?.matches || []);

      let content = '';
      if (mode === 'short') {
        content = composeShort(sent);
      } else if (mode === 'medium') {
        content = composeMedium(composeShort(sent), support);
      } else {
        content = composeLong(message, sent, support, related);
      }
      content = purgeProhibited(stripArtifacts(content)).replace(/\n{3,}/g, '\n\n').trim();
      return res.status(200).json({ content });
    }

    if (!kbOK && convOK) {
      // Use Conversation only
      const sent = splitSentences(convAnswer);
      let content = '';
      if (mode === 'short') {
        content = composeShort(sent);
      } else if (mode === 'medium') {
        content = composeMedium(composeShort(sent), []);
      } else {
        content = composeLong(message, sent, [], []);
      }
      content = purgeProhibited(stripArtifacts(content)).replace(/\n{3,}/g, '\n\n').trim();
      return res.status(200).json({ content });
    }

    // Both weak → return Conversation answer (sanitised), per your rule
    if (convAnswer) {
      return res.status(200).json({ content: convAnswer });
    }
    // Absolute last resort: a minimal nudge
    return res.status(200).json({ content: 'We couldn’t find enough on that topic. Try a related term like “cone 6 firing schedule” or “bisque firing steps”.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
