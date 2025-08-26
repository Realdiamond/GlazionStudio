// /api/chat.ts — Smart KB-first router with conversational short-circuit.
// Returns ONLY { content }.
import type { VercelRequest, VercelResponse } from '@vercel/node';

const BASE_URL = (process.env.PRIVATE_API_BASE_URL || 'http://glazeon.somee.com').replace(/\/+$/, '');
const KB_TIMEOUT_MS = 10_000;
const CONV_TIMEOUT_MS = 10_000;

/* -------------------- Intent: short / medium / long -------------------- */
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

/* --------------------------- Text utilities --------------------------- */
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

function splitSentences(t: string): string[] {
  if (!t) return [];
  return t.replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9(])/)
    .map(s => s.trim())
    .filter(Boolean);
}
function dedupeSentences(lines: string[]): string[] {
  const seen = new Set<string>(), out: string[] = [];
  for (const s of lines) {
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}
function looksLikeNoInfo(s: string): boolean {
  return /^no relevant .* found/i.test(s || '');
}
function applyThhHeadings(text: string): string {
  return (text || '').replace(/\bThh\b\s*([^\n.]+)\.?/g, (_, h) => `\n\n### **${String(h).trim()}**\n\n`);
}
function bulletify(list: string[]): string {
  return list.map(s => `- ${s}`).join('\n');
}

/* ----------------------- Composition (by mode) ------------------------ */
function composeShort(answer: string): string {
  return purgeProhibited(stripArtifacts(answer));
}
function composeMedium(answer: string, matches: any[]): string {
  const base = purgeProhibited(stripArtifacts(answer));
  const picked: string[] = [];

  // sanitize matches before using
  const cleanMatches = (matches || []).map(m => ({
    ...m,
    lede: purgeProhibited(stripArtifacts(String(m?.lede || ''))),
    description: purgeProhibited(stripArtifacts(String(m?.description || '')))
  }));

  for (const m of cleanMatches) {
    for (const field of [m?.lede, m?.description]) {
      const ss = dedupeSentences(splitSentences(String(field || '')));
      for (const s of ss) {
        if (s.length < 20) continue;
        picked.push(s);
        if (picked.length >= 6) break;
      }
      if (picked.length >= 6) break;
    }
    if (picked.length >= 6) break;
  }

  if (!picked.length) return base;
  return `${base}\n\n${bulletify(picked)}`;
}
function composeLong(question: string, answer: string, matches: any[]): string {
  const procedural = /\b(how|how to|guide|tutorial|technique|techniques|steps|process|build|make|recipe|schedule|troubleshoot|fix|prevent|best practices)\b/i.test(question);
  const base = purgeProhibited(stripArtifacts(answer));

  const cleanMatches = (matches || []).map(m => ({
    ...m,
    title: purgeProhibited(stripArtifacts(String(m?.title || ''))),
    lede: purgeProhibited(stripArtifacts(String(m?.lede || ''))),
    description: purgeProhibited(stripArtifacts(String(m?.description || '')))
  }));

  const overview = base || (splitSentences(cleanMatches?.[0]?.description || '').shift() || '');
  const stepLike: string[] = [];
  const keyPoints: string[] = [];

  const pushSentences = (text?: string) => {
    const ss = dedupeSentences(splitSentences(String(text || '')));
    for (const s of ss) {
      if (s.length < 20) continue;
      if (/\b(step|then|next|finally|ensure|avoid|use|mix|wedge|center|pull|trim|dry|bisque|glaze|fire|cool|inspect|measure|program|hold|soak|load)\b/i.test(s)) stepLike.push(s);
      else keyPoints.push(s);
    }
  };

  pushSentences(base);

  const elaborations: string[] = [];
  for (const m of cleanMatches) {
    const title = m?.title || '';
    if (title) elaborations.push(`**${title}**`);
    if (m?.lede) pushSentences(m.lede);
    if (m?.description) pushSentences(m.description);
  }

  const deStep = dedupeSentences(stepLike);
  const dePoints = dedupeSentences(keyPoints);
  const deElabs = dedupeSentences(elaborations);

  let out: string[] = [];
  if (overview) out.push(`### **Overview**\n\n${overview}`);
  if (procedural && deStep.length) out.push(`### **Key Steps**\n\n${bulletify(deStep)}`);
  if (!procedural && dePoints.length) out.push(`### **Key Points**\n\n${bulletify(dePoints)}`);
  else if (procedural && dePoints.length) out.push(`### **Notes & Parameters**\n\n${bulletify(dePoints)}`);
  if (deElabs.length) out.push(`### **Related Topics**\n\n${bulletify(deElabs)}`);

  let result = out.join('\n\n');
  result = applyThhHeadings(result).replace(/\n{3,}/g, '\n\n').trim();
  return result || base;
}

/* ------------------------------ Fetch utils --------------------------- */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

/* ---------------------------- Upstream calls -------------------------- */
async function askKB(baseUrl: string, question: string, topK?: string | number) {
  const qs = new URLSearchParams({ question: String(question), ...(topK ? { topK: String(topK) } : {}) }).toString();
  const url = `${baseUrl}/api/Pottery/query?${qs}`;
  const r = await fetchWithTimeout(url, { method: 'GET', headers: { accept: 'application/json' } }, KB_TIMEOUT_MS);
  const text = await r.text();
  let json: any; try { json = JSON.parse(text); } catch { json = text; }
  if (!r.ok) throw new Error((json && (json.error || json.message)) || text || 'KB upstream error');
  return {
    answer: typeof json === 'object' ? (json?.answer ?? '') : (typeof json === 'string' ? json : ''),
    matches: (typeof json === 'object' && Array.isArray(json?.matches)) ? json.matches : []
  };
}
async function askConversation(baseUrl: string, question: string, userId?: string) {
  const params = new URLSearchParams({ question: String(question) });
  if (userId) params.set('userId', String(userId));
  const url = `${baseUrl}/api/Conversation/ask?${params.toString()}`;
  const r = await fetchWithTimeout(url, { method: 'GET', headers: { accept: 'application/json' } }, CONV_TIMEOUT_MS);
  const text = await r.text();
  let json: any; try { json = JSON.parse(text); } catch { json = { answer: text }; }
  if (!r.ok) throw new Error(json?.error || text || 'Conversation upstream error');
  return {
    answer: purgeProhibited(stripArtifacts(json?.answer || '')),
    confidence: typeof json?.confidence === 'number' ? json.confidence : undefined
  };
}

/* ---------------------------- Routing helpers ------------------------- */
function isConversationalSmallTalk(msg: string): boolean {
  const s = (msg || '').toLowerCase().trim();
  if (s.length > 40) return false;
  return /\b(hi|hello|hey|yo|sup|how are you|what's up|continue|explain more|talk|chat)\b/.test(s);
}
function shouldGoConversationFirst(q: string): boolean {
  const s = (q || '').toLowerCase();
  if (/\b(why did|what went wrong|keeps|kept|won't|cannot|can['’]?t|problem|issue|crack(ed)?|warp(ed)?|pinholes?|crawling|blister(s|ing)?|not working)\b/.test(s)) return true;
  if (/\b(what should i|which should i|recommend|suggest|choose|pick|better for me|my studio|my kiln|my clay)\b/.test(s)) return true;
  if (/\b(set ?up|plan|budget|buy|purchase|starter kit|getting started|first time)\b/.test(s)) return true;
  return false;
}
function kbLooksWeak(answer: string, matches: any[]): boolean {
  const a = purgeProhibited(stripArtifacts(answer || '')).trim();
  if (!a) return true;
  if (looksLikeNoInfo(a)) return true;
  if (a.length < 20 && (!matches || matches.length === 0)) return true;
  return false;
}

/* ------------------------------ Handler ------------------------------- */
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

    // 0) Small-talk or strong conversational phrasing → Conversation first
    if (isConversationalSmallTalk(message) || shouldGoConversationFirst(message)) {
      const conv = await askConversation(BASE_URL, message, userId).catch(() => null);
      if (conv?.answer) return res.status(200).json({ content: conv.answer });

      // fallback to KB if conversation is down
      const kb = await askKB(BASE_URL, message, topK).catch(() => null);
      if (kb) {
        const weak = kbLooksWeak(kb.answer, kb.matches);
        let content = '';
        if (!weak) {
          if (mode === 'short') content = composeShort(kb.answer);
          else if (mode === 'medium') content = composeMedium(kb.answer, kb.matches);
          else content = composeLong(message, kb.answer, kb.matches);
          return res.status(200).json({ content: applyThhHeadings(content).replace(/\n{3,}/g, '\n\n').trim() });
        }
      }
      return res.status(200).json({ content: 'We couldn’t find enough on that topic. Try a related term like “cone 6 firing schedule” or “bisque firing steps”.' });
    }

    // 1) KB-first path
    let kb: { answer: string; matches: any[] } | null = null;
    try {
      kb = await askKB(BASE_URL, message, topK);
    } catch (e) {
      // KB failed → Conversation once
      const conv = await askConversation(BASE_URL, message, userId).catch(() => null);
      if (conv?.answer) return res.status(200).json({ content: conv.answer });
      return res.status(502).json({ error: (e as Error)?.message || 'Upstream error' });
    }

    const baseAnswer = purgeProhibited(stripArtifacts(kb.answer || ''));
    const matches = Array.isArray(kb.matches) ? kb.matches : [];

    // 2) Confidence gate → fallback to Conversation if weak
    if (kbLooksWeak(baseAnswer, matches)) {
      const conv = await askConversation(BASE_URL, message, userId).catch(() => null);
      const convAnswer = purgeProhibited(stripArtifacts(conv?.answer || ''));
      if (convAnswer) return res.status(200).json({ content: convAnswer });

      // salvage from matches or nudge
      let content = '';
      if (mode === 'medium' || mode === 'long') {
        content = composeMedium('', matches)
          || 'We couldn’t find enough on that. Try a related term like “cone 6 firing schedule”, “oxidation vs reduction”, or “bisque firing steps”.';
      } else {
        content = 'We couldn’t find enough on that topic. Try rephrasing your question.';
      }
      return res.status(200).json({ content });
    }

    // 3) Compose from KB (use sanitized fields)
    let content = '';
    if (mode === 'short') content = composeShort(baseAnswer);
    else if (mode === 'medium') content = composeMedium(baseAnswer, matches);
    else content = composeLong(message, baseAnswer, matches);

    // 4) Final polish + final scrub (double safety)
    content = purgeProhibited(applyThhHeadings(content)).replace(/\n{3,}/g, '\n\n').trim();
    return res.status(200).json({ content });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
