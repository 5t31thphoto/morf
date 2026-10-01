export const MAGIC = 0x46524f4d;
export const VERSION = 0x0200;
export const VOCAB_SLOTS = 4096;
export const HEADER_SIZE = 64;
export const NUMBER_TOKEN = 0xfffe;
export const DURATION_TOKEN = 0xfffd;
export const UNKNOWN_TOKEN = 0xffff;

export const FLAG_STOPWORD = 0x01;
export const FLAG_PIVOT = 0x02;
export const FLAG_NUMBER = 0x04;
export const FLAG_UNIT = 0x08;

export const KIND_INTENT = 4;
export const KIND_PROPERTY = 1;
export const KIND_DIRECTION = 3;

export const TOOL = {
  NONE: 0,
  SET_VOLUME: 1,
  ADJ_VOLUME: 2,
  SET_BRIGHT: 3,
  ADJ_BRIGHT: 4,
  LIGHTS: 5,
  PLAYPAUSE: 6,
  TIMER_SET: 7,
  TIMER_CANCEL: 8,
  QUERY: 9,
  MUTE: 10,
  NIGHT: 11,
  SPEAK: 12,
  TEACH: 13,
} as const;

export const TOOL_NAMES = [
  "none",
  "set_volume",
  "adj_volume",
  "set_bright",
  "adj_bright",
  "lights",
  "playpause",
  "timer_set",
  "timer_cancel",
  "query",
  "mute",
  "night",
  "speak",
  "teach",
] as const;

export const LAYER_NAME = ["L0 pattern", "L1 activation", "L2 scene"] as const;

export const NUMBER_WORDS: Record<string, number> = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
  twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, ninety: 90, hundred: 100,
  half: 50, max: 100, maximum: 100, full: 100, min: 0, minimum: 0,
  bit: 8, little: 8, lot: 25, way: 25, some: 12,
};

export const STOPWORDS = new Set([
  "a", "an", "the", "to", "for", "of", "please", "just", "my", "me",
  "in", "on", "at", "and", "or", "be", "is", "are", "it", "this", "that",
  "here", "there", "with", "from", "can", "you", "we", "i", "im",
]);

export const PIVOTS = new Set(["it", "this", "that", "them"]);

export const INTENT_CONFIDENCE_THRESHOLD = 0x1400;
export const AMBIGUITY_MARGIN_LIMIT = 0x0cc6;
export const Q15_ONE = 0x7fff;

export function murmur3(key: string, seed = 0x5eed): number {
  let h = seed >>> 0;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i) & 0xff;
    h = Math.imul(h, 0x5bd1e995) >>> 0;
    h ^= h >>> 15;
  }
  return h || 1;
}

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]!;
    for (let k = 0; k < 8; k++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function q15(f: number): number {
  const x = Math.round(Math.max(-1, Math.min(1, f)) * 32767);
  return Math.max(-0x8000, Math.min(0x7fff, x));
}

export function q15Mul(a: number, b: number): number {
  let r = (a * b) >> 15;
  if (r > 0x7fff) return 0x7fff;
  if (r < -0x8000) return -0x8000;
  return r;
}

export function q15AddSat(a: number, b: number): number {
  const r = a + b;
  if (r > 0x7fff) return 0x7fff;
  if (r < 0) return 0;
  return r;
}

export type Header = {
  magic: number;
  version: number;
  flags: number;
  vocabSize: number;
  nodeCount: number;
  edgeCount: number;
  intentCount: number;
  utteranceCount: number;
  patternCount: number;
  vocabOffset: number;
  nodesOffset: number;
  edgesOffset: number;
  intentsOffset: number;
  utterancesOffset: number;
  patternsOffset: number;
  stringsOffset: number;
  stringsSize: number;
  crc32: number;
};

export type VocabEntry = { hash: number; concept: number; flags: number };
export type NodeRec = { id: number; kind: number; edgeCount: number; firstEdge: number; bias: number };
export type EdgeRec = { target: number; weight: number };
export type IntentRec = {
  conceptId: number;
  toolId: number;
  slotMask: number;
  nameOff: number;
  nameLen: number;
  defaultUtt: number;
};
export type UttRec = { intentId: number; sceneMask: number; flags: number; strOff: number; strLen: number };
export type PatternRec = { intentId: number; tokens: number[] };

export type MorfImage = {
  bytes: Uint8Array;
  header: Header;
  vocab: VocabEntry[];
  nodes: NodeRec[];
  edges: EdgeRec[];
  intents: IntentRec[];
  utterances: UttRec[];
  patterns: PatternRec[];
  strings: Uint8Array;
};

export function readCString(strings: Uint8Array, off: number, len: number): string {
  const slice = strings.subarray(off, off + len);
  return new TextDecoder().decode(slice);
}

export function parseHeader(bytes: Uint8Array): Header {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    magic: v.getUint32(0, true),
    version: v.getUint16(4, true),
    flags: v.getUint16(6, true),
    vocabSize: v.getUint16(8, true),
    nodeCount: v.getUint16(10, true),
    edgeCount: v.getUint16(12, true),
    intentCount: v.getUint16(14, true),
    utteranceCount: v.getUint16(16, true),
    patternCount: v.getUint16(18, true),
    vocabOffset: v.getUint32(20, true),
    nodesOffset: v.getUint32(24, true),
    edgesOffset: v.getUint32(28, true),
    intentsOffset: v.getUint32(32, true),
    utterancesOffset: v.getUint32(36, true),
    patternsOffset: v.getUint32(40, true),
    stringsOffset: v.getUint32(44, true),
    stringsSize: v.getUint32(48, true),
    crc32: v.getUint32(52, true),
  };
}

export function parseImage(bytes: Uint8Array): MorfImage {
  const header = parseHeader(bytes);
  if (header.magic !== MAGIC) throw new Error("Not a MORF image");
  if (header.version !== VERSION) throw new Error(`Unsupported MORF version ${header.version.toString(16)}`);
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const vocab: VocabEntry[] = [];
  for (let i = 0; i < header.vocabSize; i++) {
    const o = header.vocabOffset + i * 8;
    vocab.push({
      hash: v.getUint32(o, true),
      concept: v.getUint16(o + 4, true),
      flags: bytes[o + 6]!,
    });
  }
  const nodes: NodeRec[] = [];
  for (let i = 0; i < header.nodeCount; i++) {
    const o = header.nodesOffset + i * 8;
    nodes.push({
      id: v.getUint16(o, true),
      kind: bytes[o + 2]!,
      edgeCount: bytes[o + 3]!,
      firstEdge: v.getUint16(o + 4, true),
      bias: v.getInt16(o + 6, true),
    });
  }
  const edges: EdgeRec[] = [];
  for (let i = 0; i < header.edgeCount; i++) {
    const o = header.edgesOffset + i * 4;
    edges.push({ target: v.getUint16(o, true), weight: v.getInt16(o + 2, true) });
  }
  const intents: IntentRec[] = [];
  for (let i = 0; i < header.intentCount; i++) {
    const o = header.intentsOffset + i * 12;
    intents.push({
      conceptId: v.getUint16(o, true),
      toolId: bytes[o + 2]!,
      slotMask: bytes[o + 3]!,
      nameOff: v.getUint16(o + 4, true),
      nameLen: v.getUint16(o + 6, true),
      defaultUtt: v.getUint16(o + 8, true),
    });
  }
  const utterances: UttRec[] = [];
  for (let i = 0; i < header.utteranceCount; i++) {
    const o = header.utterancesOffset + i * 8;
    utterances.push({
      intentId: v.getUint16(o, true),
      sceneMask: bytes[o + 2]!,
      flags: bytes[o + 3]!,
      strOff: v.getUint16(o + 4, true),
      strLen: v.getUint16(o + 6, true),
    });
  }
  const patterns: PatternRec[] = [];
  let p = header.patternsOffset;
  const pend = header.stringsOffset;
  for (let i = 0; i < header.patternCount && p + 4 <= pend; i++) {
    const intentId = v.getUint16(p, true);
    const count = bytes[p + 2]!;
    const tokens: number[] = [];
    for (let k = 0; k < count; k++) tokens.push(v.getUint16(p + 4 + k * 2, true));
    let rec = 4 + count * 2;
    if (rec % 4) rec += 4 - (rec % 4);
    patterns.push({ intentId, tokens });
    p += rec;
  }
  const strings = bytes.subarray(header.stringsOffset, header.stringsOffset + header.stringsSize);
  return { bytes, header, vocab, nodes, edges, intents, utterances, patterns, strings };
}
