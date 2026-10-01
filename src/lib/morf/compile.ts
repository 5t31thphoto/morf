import {
  FLAG_NUMBER,
  FLAG_PIVOT,
  FLAG_STOPWORD,
  FLAG_UNIT,
  HEADER_SIZE,
  MAGIC,
  NUMBER_WORDS,
  NUMBER_TOKEN,
  DURATION_TOKEN,
  PIVOTS,
  Q15_ONE,
  STOPWORDS,
  VERSION,
  VOCAB_SLOTS,
  crc32,
  murmur3,
  q15,
} from "./format";

export type Ontology = {
  version: number;
  concepts: { id: string; kind: string }[];
  intents: { id: string; tool: number; slot_mask: number; phrases: string[] }[];
  utterances: Record<string, string[]>;
  vocab_extra: string[];
  word_to_concept: Record<string, string>;
  examples: { intent: string; text: string }[];
  number_words: Record<string, number>;
  stopwords: string[];
  pivots: string[];
  scenes: string[];
  tools: string[];
  relative: Record<string, number>;
};

const KIND: Record<string, number> = {
  concept: 0, property: 1, action: 2, direction: 3, intent: 4, scene: 5, tool: 6,
};

const PROP_TAG: Record<string, number> = {
  volume: 1, brightness: 2, lights: 3, timer: 4, music: 5, time: 4,
};
const DIR_TAG: Record<string, number> = { increase: 1, decrease: -1, setpoint: 2 };

function conceptBias(id: string, kind: string): number {
  if (kind === "property") return PROP_TAG[id] ?? 0;
  if (kind === "direction") return DIR_TAG[id] ?? 0;
  return 0;
}

function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replaceAll("{n}", " 0 ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function isNumWord(w: string) {
  return /^\d+$/.test(w) || w in NUMBER_WORDS;
}

function packU16(n: number): [number, number] {
  return [n & 0xff, (n >> 8) & 0xff];
}
function packI16(n: number): [number, number] {
  const v = n < 0 ? n + 65536 : n;
  return [v & 0xff, (v >> 8) & 0xff];
}
function packU32(n: number): [number, number, number, number] {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
}

export type CompileMeta = {
  bytes: number;
  crc32: string;
  nodes: number;
  edges: number;
  intents: string[];
  intentCount: number;
  utterances: number;
  patterns: number;
  vocabOccupied: number;
  vocabSlots: number;
  strings: number;
};

export function compileOntology(ont: Ontology): { blob: Uint8Array; meta: CompileMeta } {
  const stringBuf: number[] = [];
  const stringIndex = new Map<string, { off: number; len: number }>();
  const intern = (s: string) => {
    const hit = stringIndex.get(s);
    if (hit) return hit;
    const b = new TextEncoder().encode(s);
    const rec = { off: stringBuf.length, len: b.length };
    stringBuf.push(...b, 0);
    stringIndex.set(s, rec);
    return rec;
  };

  const conceptIds = new Map<string, number>();
  const nodes: { id: number; name: string; kind: number; bias: number }[] = [
    { id: 0, name: "", kind: 0, bias: 0 },
  ];
  intern("");
  for (const c of ont.concepts) {
    const id = nodes.length;
    conceptIds.set(c.id, id);
    nodes.push({ id, name: c.id, kind: KIND[c.kind] ?? 0, bias: conceptBias(c.id, c.kind) });
    intern(c.id);
  }

  type IntentRec = {
    name: string;
    conceptId: number;
    tool: number;
    slotMask: number;
    nameOff: number;
    nameLen: number;
    defaultUtt: number;
  };
  const intentRecs: IntentRec[] = [];
  for (const it of ont.intents) {
    if (!conceptIds.has(it.id)) {
      const id = nodes.length;
      conceptIds.set(it.id, id);
      nodes.push({ id, name: it.id, kind: 4, bias: 0 });
      intern(it.id);
    }
    const nm = intern(it.id);
    intentRecs.push({
      name: it.id,
      conceptId: conceptIds.get(it.id)!,
      tool: it.tool,
      slotMask: it.slot_mask,
      nameOff: nm.off,
      nameLen: nm.len,
      defaultUtt: 0,
    });
  }
  if (!conceptIds.has("unknown")) {
    const id = nodes.length;
    conceptIds.set("unknown", id);
    nodes.push({ id, name: "unknown", kind: 4, bias: 0 });
    intern("unknown");
  }

  const wordToConcept: Record<string, string> = { ...ont.word_to_concept };
  for (const w of ont.stopwords ?? []) wordToConcept[w] ??= "";
  for (const w of Object.keys(ont.number_words ?? {})) wordToConcept[w] ??= "number";
  for (const w of ont.vocab_extra ?? []) wordToConcept[w] ??= wordToConcept[w] ?? "";
  for (const it of ont.intents) {
    for (const ph of it.phrases) {
      for (const w of tokenizeWords(ph)) {
        if (!(w in wordToConcept)) wordToConcept[w] = "";
      }
    }
  }

  type VocabItem = { w: string; cid: number; flags: number };
  const vocabItems: VocabItem[] = [];
  for (const w of Object.keys(wordToConcept).sort()) {
    let flags = 0;
    if (STOPWORDS.has(w)) flags |= FLAG_STOPWORD;
    if (PIVOTS.has(w)) flags |= FLAG_PIVOT;
    if (isNumWord(w)) flags |= FLAG_NUMBER;
    if (["minutes", "minute", "seconds", "second", "hours", "hour"].includes(w)) flags |= FLAG_UNIT;
    const cname = wordToConcept[w]!;
    const cid = cname ? (conceptIds.get(cname) ?? 0) : 0;
    intern(w);
    vocabItems.push({ w, cid, flags });
  }

  const table: { hash: number; cid: number; flags: number }[] = Array.from({ length: VOCAB_SLOTS }, () => ({
    hash: 0, cid: 0, flags: 0,
  }));
  let occupied = 0;
  for (const item of vocabItems) {
    const h = murmur3(item.w);
    let idx = h % VOCAB_SLOTS;
    for (let p = 0; p < VOCAB_SLOTS; p++) {
      if (table[idx]!.hash === 0 || table[idx]!.hash === h) {
        if (table[idx]!.hash === 0) occupied++;
        table[idx] = { hash: h, cid: item.cid, flags: item.flags };
        break;
      }
      idx = (idx + 1) % VOCAB_SLOTS;
    }
  }

  function lookupWord(w: string): { tid: number; cid: number; flags: number } {
    const h = murmur3(w);
    let idx = h % VOCAB_SLOTS;
    for (let p = 0; p < VOCAB_SLOTS; p++) {
      const e = table[idx]!;
      if (e.hash === 0) return { tid: 0xffff, cid: 0, flags: 0 };
      if (e.hash === h) return { tid: idx, cid: e.cid, flags: e.flags };
      idx = (idx + 1) % VOCAB_SLOTS;
    }
    return { tid: 0xffff, cid: 0, flags: 0 };
  }

  const edgeMap = new Map<number, Map<number, number>>();
  const addEdge = (src: number, dst: number, w: number) => {
    if (!src || !dst || src === dst) return;
    if (!edgeMap.has(src)) edgeMap.set(src, new Map());
    const m = edgeMap.get(src)!;
    m.set(dst, Math.min(Q15_ONE, (m.get(dst) ?? 0) + w));
  };

  const patterns: { intentId: number; tokens: number[] }[] = [];
  for (const ex of ont.examples ?? []) {
    const intentCid = conceptIds.get(ex.intent) ?? 0;
    const toks: number[] = [];
    const conceptsHit: number[] = [];
    for (const w of tokenizeWords(ex.text)) {
      if (isNumWord(w) && !STOPWORDS.has(w)) {
        toks.push(NUMBER_TOKEN);
        conceptsHit.push(conceptIds.get("number") ?? 0);
        continue;
      }
      const { tid, cid, flags } = lookupWord(w);
      if (flags & FLAG_STOPWORD) continue;
      if (flags & FLAG_UNIT) {
        toks.push(DURATION_TOKEN);
        conceptsHit.push(conceptIds.get("duration") ?? 0);
        continue;
      }
      if (tid === 0xffff) continue;
      toks.push(tid);
      if (cid) conceptsHit.push(cid);
    }
    if (!toks.length) continue;
    patterns.push({ intentId: intentCid, tokens: toks.slice(0, 12) });
    for (const cid of conceptsHit) {
      addEdge(cid, intentCid, q15(0.18));
      addEdge(intentCid, cid, q15(0.12));
    }
    for (let i = 0; i < conceptsHit.length - 1; i++) addEdge(conceptsHit[i]!, conceptsHit[i + 1]!, q15(0.06));
  }

  const assoc: [string, string, number][] = [
    ["volume", "loud", 0.4], ["volume", "quiet", 0.4], ["volume", "music", 0.3],
    ["brightness", "bright", 0.4], ["brightness", "dark", 0.4],
    ["lights", "dark", 0.25], ["timer", "duration", 0.4],
  ];
  for (const [a, b, w] of assoc) {
    const ia = conceptIds.get(a), ib = conceptIds.get(b);
    if (ia && ib) {
      addEdge(ia, ib, q15(w));
      addEdge(ib, ia, q15(w));
    }
  }

  const packedEdges: { dst: number; wt: number }[] = [];
  const csrIndex: number[] = [];
  const csrCount: number[] = [];
  for (let src = 0; src < nodes.length; src++) {
    csrIndex[src] = packedEdges.length;
    const dests = [...(edgeMap.get(src)?.entries() ?? [])].sort((a, b) => b[1] - a[1]).slice(0, 8);
    csrCount[src] = dests.length;
    for (const [dst, wt] of dests) packedEdges.push({ dst, wt });
  }

  const utterances: { intentId: number; sceneMask: number; flags: number; off: number; len: number }[] = [];
  for (const [intentName, lines] of Object.entries(ont.utterances ?? {})) {
    const icid = conceptIds.get(intentName) ?? 0;
    for (const line of lines) {
      const s = intern(line);
      utterances.push({ intentId: icid, sceneMask: 0xff, flags: 0, off: s.off, len: s.len });
    }
  }
  const firstUtt = new Map<number, number>();
  utterances.forEach((u, i) => {
    if (!firstUtt.has(u.intentId)) firstUtt.set(u.intentId, i);
  });
  for (const rec of intentRecs) rec.defaultUtt = firstUtt.get(rec.conceptId) ?? 0;

  const vocabBlob: number[] = [];
  for (const e of table) {
    vocabBlob.push(...packU32(e.hash), ...packU16(e.cid), e.flags & 0xff, 0);
  }
  const nodesBlob: number[] = [];
  nodes.forEach((n, i) => {
    nodesBlob.push(...packU16(n.id), n.kind, csrCount[i]! & 0xff, ...packU16(csrIndex[i]!), ...packI16(n.bias));
  });
  const edgesBlob: number[] = [];
  for (const e of packedEdges) edgesBlob.push(...packU16(e.dst), ...packI16(e.wt));
  const intentsBlob: number[] = [];
  for (const rec of intentRecs) {
    intentsBlob.push(
      ...packU16(rec.conceptId), rec.tool & 0xff, rec.slotMask & 0xff,
      ...packU16(rec.nameOff), ...packU16(rec.nameLen), ...packU16(rec.defaultUtt), ...packU16(0),
    );
  }
  const uttBlob: number[] = [];
  for (const u of utterances) {
    uttBlob.push(...packU16(u.intentId), u.sceneMask, u.flags, ...packU16(u.off), ...packU16(u.len));
  }
  const patBlob: number[] = [];
  for (const p of patterns) {
    const toks = p.tokens.slice(0, 12);
    let rec = [...packU16(p.intentId), toks.length, 0];
    for (const t of toks) rec.push(...packU16(t));
    while (rec.length % 4) rec.push(0);
    patBlob.push(...rec);
  }
  let strings = stringBuf.slice();
  while (strings.length % 4) strings.push(0);

  let off = HEADER_SIZE;
  const vocabOff = off; off += vocabBlob.length;
  const nodesOff = off; off += nodesBlob.length;
  const edgesOff = off; off += edgesBlob.length;
  const intentsOff = off; off += intentsBlob.length;
  const uttOff = off; off += uttBlob.length;
  const patOff = off; off += patBlob.length;
  const strOff = off;
  const strSize = strings.length;

  const header = new Uint8Array(64);
  const hv = new DataView(header.buffer);
  hv.setUint32(0, MAGIC, true);
  hv.setUint16(4, VERSION, true);
  hv.setUint16(6, 0, true);
  hv.setUint16(8, VOCAB_SLOTS, true);
  hv.setUint16(10, nodes.length, true);
  hv.setUint16(12, packedEdges.length, true);
  hv.setUint16(14, intentRecs.length, true);
  hv.setUint16(16, utterances.length, true);
  hv.setUint16(18, patterns.length, true);
  hv.setUint32(20, vocabOff, true);
  hv.setUint32(24, nodesOff, true);
  hv.setUint32(28, edgesOff, true);
  hv.setUint32(32, intentsOff, true);
  hv.setUint32(36, uttOff, true);
  hv.setUint32(40, patOff, true);
  hv.setUint32(44, strOff, true);
  hv.setUint32(48, strSize, true);
  hv.setUint32(52, 0, true);

  const payload = Uint8Array.from([...vocabBlob, ...nodesBlob, ...edgesBlob, ...intentsBlob, ...uttBlob, ...patBlob, ...strings]);
  const whole = new Uint8Array(64 + payload.length);
  whole.set(header, 0);
  whole.set(payload, 64);
  const digest = crc32(whole);
  const out = new Uint8Array(whole);
  new DataView(out.buffer).setUint32(52, digest, true);

  return {
    blob: out,
    meta: {
      bytes: out.length,
      crc32: `0x${digest.toString(16).toUpperCase().padStart(8, "0")}`,
      nodes: nodes.length,
      edges: packedEdges.length,
      intents: intentRecs.map((r) => r.name),
      intentCount: intentRecs.length,
      utterances: utterances.length,
      patterns: patterns.length,
      vocabOccupied: occupied,
      vocabSlots: VOCAB_SLOTS,
      strings: strSize,
    },
  };
}

export function blobToC(blob: Uint8Array, symbol = "morf_ontology_blob"): string {
  const lines = [
    "/* Auto-generated by MORF foundry — do not edit. */",
    "#include <stdint.h>",
    `const uint8_t ${symbol}[] = {`,
  ];
  for (let i = 0; i < blob.length; i += 16) {
    const row = [...blob.subarray(i, i + 16)].map((b) => `0x${b.toString(16).toUpperCase().padStart(2, "0")}`);
    lines.push("  " + row.join(", ") + ",");
  }
  lines.push("};");
  lines.push(`const uint32_t ${symbol}_len = ${blob.length};`);
  lines.push("");
  return lines.join("\n");
}

export function downloadBytes(filename: string, data: Uint8Array, mime = "application/octet-stream") {
  const blob = new Blob([new Uint8Array(data)], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(filename: string, text: string, mime = "text/plain") {
  downloadBytes(filename, new TextEncoder().encode(text), mime);
}
