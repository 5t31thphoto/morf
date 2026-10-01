import { i as __toESM } from "../_runtime.mjs";
import { b as require_jsx_runtime, q as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { a as RotateCcw, c as Download, d as Box, f as Binary, i as Send, l as Cpu, o as Radio, p as Activity, r as Terminal, s as Mic, t as Upload, u as Cable } from "../_libs/lucide-react.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { t as create } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-vX9HemjK.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var Button = (0, import_react.forwardRef)(function Button({ className, variant = "primary", ...props }, ref) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		ref,
		className: cn("inline-flex h-11 items-center justify-center gap-2 rounded-sm px-4 text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40", {
			primary: "bg-fg text-bg hover:bg-fg/90",
			ghost: "bg-transparent text-fg hover:bg-raised",
			outline: "border border-line bg-transparent text-fg hover:bg-raised",
			danger: "bg-fault/15 text-fault hover:bg-fault/25"
		}[variant], className),
		...props
	});
});
var MAGIC = 1179799373;
var VOCAB_SLOTS = 4096;
var NUMBER_TOKEN = 65534;
var DURATION_TOKEN = 65533;
var TOOL = {
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
	TEACH: 13
};
var TOOL_NAMES = [
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
	"teach"
];
var NUMBER_WORDS = {
	zero: 0,
	oh: 0,
	one: 1,
	two: 2,
	three: 3,
	four: 4,
	five: 5,
	six: 6,
	seven: 7,
	eight: 8,
	nine: 9,
	ten: 10,
	eleven: 11,
	twelve: 12,
	thirteen: 13,
	fourteen: 14,
	fifteen: 15,
	sixteen: 16,
	seventeen: 17,
	eighteen: 18,
	nineteen: 19,
	twenty: 20,
	thirty: 30,
	forty: 40,
	fifty: 50,
	sixty: 60,
	ninety: 90,
	hundred: 100,
	half: 50,
	max: 100,
	maximum: 100,
	full: 100,
	min: 0,
	minimum: 0,
	bit: 8,
	little: 8,
	lot: 25,
	way: 25,
	some: 12
};
var STOPWORDS = /* @__PURE__ */ new Set([
	"a",
	"an",
	"the",
	"to",
	"for",
	"of",
	"please",
	"just",
	"my",
	"me",
	"in",
	"on",
	"at",
	"and",
	"or",
	"be",
	"is",
	"are",
	"it",
	"this",
	"that",
	"here",
	"there",
	"with",
	"from",
	"can",
	"you",
	"we",
	"i",
	"im"
]);
var PIVOTS = /* @__PURE__ */ new Set([
	"it",
	"this",
	"that",
	"them"
]);
var Q15_ONE = 32767;
function murmur3(key, seed = 24301) {
	let h = seed >>> 0;
	for (let i = 0; i < key.length; i++) {
		h ^= key.charCodeAt(i) & 255;
		h = Math.imul(h, 1540483477) >>> 0;
		h ^= h >>> 15;
	}
	return h || 1;
}
function crc32(data) {
	let crc = 4294967295;
	for (let i = 0; i < data.length; i++) {
		crc ^= data[i];
		for (let k = 0; k < 8; k++) crc = crc >>> 1 ^ (crc & 1 ? 3988292384 : 0);
	}
	return (crc ^ 4294967295) >>> 0;
}
function q15(f) {
	const x = Math.round(Math.max(-1, Math.min(1, f)) * 32767);
	return Math.max(-32768, Math.min(32767, x));
}
function q15Mul(a, b) {
	let r = a * b >> 15;
	if (r > 32767) return 32767;
	if (r < -32768) return -32768;
	return r;
}
function q15AddSat(a, b) {
	const r = a + b;
	if (r > 32767) return 32767;
	if (r < 0) return 0;
	return r;
}
function readCString(strings, off, len) {
	const slice = strings.subarray(off, off + len);
	return new TextDecoder().decode(slice);
}
function parseHeader(bytes) {
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
		crc32: v.getUint32(52, true)
	};
}
function parseImage(bytes) {
	const header = parseHeader(bytes);
	if (header.magic !== 1179799373) throw new Error("Not a MORF image");
	if (header.version !== 512) throw new Error(`Unsupported MORF version ${header.version.toString(16)}`);
	const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const vocab = [];
	for (let i = 0; i < header.vocabSize; i++) {
		const o = header.vocabOffset + i * 8;
		vocab.push({
			hash: v.getUint32(o, true),
			concept: v.getUint16(o + 4, true),
			flags: bytes[o + 6]
		});
	}
	const nodes = [];
	for (let i = 0; i < header.nodeCount; i++) {
		const o = header.nodesOffset + i * 8;
		nodes.push({
			id: v.getUint16(o, true),
			kind: bytes[o + 2],
			edgeCount: bytes[o + 3],
			firstEdge: v.getUint16(o + 4, true),
			bias: v.getInt16(o + 6, true)
		});
	}
	const edges = [];
	for (let i = 0; i < header.edgeCount; i++) {
		const o = header.edgesOffset + i * 4;
		edges.push({
			target: v.getUint16(o, true),
			weight: v.getInt16(o + 2, true)
		});
	}
	const intents = [];
	for (let i = 0; i < header.intentCount; i++) {
		const o = header.intentsOffset + i * 12;
		intents.push({
			conceptId: v.getUint16(o, true),
			toolId: bytes[o + 2],
			slotMask: bytes[o + 3],
			nameOff: v.getUint16(o + 4, true),
			nameLen: v.getUint16(o + 6, true),
			defaultUtt: v.getUint16(o + 8, true)
		});
	}
	const utterances = [];
	for (let i = 0; i < header.utteranceCount; i++) {
		const o = header.utterancesOffset + i * 8;
		utterances.push({
			intentId: v.getUint16(o, true),
			sceneMask: bytes[o + 2],
			flags: bytes[o + 3],
			strOff: v.getUint16(o + 4, true),
			strLen: v.getUint16(o + 6, true)
		});
	}
	const patterns = [];
	let p = header.patternsOffset;
	const pend = header.stringsOffset;
	for (let i = 0; i < header.patternCount && p + 4 <= pend; i++) {
		const intentId = v.getUint16(p, true);
		const count = bytes[p + 2];
		const tokens = [];
		for (let k = 0; k < count; k++) tokens.push(v.getUint16(p + 4 + k * 2, true));
		let rec = 4 + count * 2;
		if (rec % 4) rec += 4 - rec % 4;
		patterns.push({
			intentId,
			tokens
		});
		p += rec;
	}
	return {
		bytes,
		header,
		vocab,
		nodes,
		edges,
		intents,
		utterances,
		patterns,
		strings: bytes.subarray(header.stringsOffset, header.stringsOffset + header.stringsSize)
	};
}
var KIND = {
	concept: 0,
	property: 1,
	action: 2,
	direction: 3,
	intent: 4,
	scene: 5,
	tool: 6
};
var PROP_TAG = {
	volume: 1,
	brightness: 2,
	lights: 3,
	timer: 4,
	music: 5,
	time: 4
};
var DIR_TAG = {
	increase: 1,
	decrease: -1,
	setpoint: 2
};
function conceptBias(id, kind) {
	if (kind === "property") return PROP_TAG[id] ?? 0;
	if (kind === "direction") return DIR_TAG[id] ?? 0;
	return 0;
}
function tokenizeWords$1(text) {
	return text.toLowerCase().replaceAll("{n}", " 0 ").replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
}
function isNumWord(w) {
	return /^\d+$/.test(w) || w in NUMBER_WORDS;
}
function packU16(n) {
	return [n & 255, n >> 8 & 255];
}
function packI16(n) {
	const v = n < 0 ? n + 65536 : n;
	return [v & 255, v >> 8 & 255];
}
function packU32(n) {
	return [
		n & 255,
		n >> 8 & 255,
		n >> 16 & 255,
		n >>> 24 & 255
	];
}
function compileOntology(ont) {
	const stringBuf = [];
	const stringIndex = /* @__PURE__ */ new Map();
	const intern = (s) => {
		const hit = stringIndex.get(s);
		if (hit) return hit;
		const b = new TextEncoder().encode(s);
		const rec = {
			off: stringBuf.length,
			len: b.length
		};
		stringBuf.push(...b, 0);
		stringIndex.set(s, rec);
		return rec;
	};
	const conceptIds = /* @__PURE__ */ new Map();
	const nodes = [{
		id: 0,
		name: "",
		kind: 0,
		bias: 0
	}];
	intern("");
	for (const c of ont.concepts) {
		const id = nodes.length;
		conceptIds.set(c.id, id);
		nodes.push({
			id,
			name: c.id,
			kind: KIND[c.kind] ?? 0,
			bias: conceptBias(c.id, c.kind)
		});
		intern(c.id);
	}
	const intentRecs = [];
	for (const it of ont.intents) {
		if (!conceptIds.has(it.id)) {
			const id = nodes.length;
			conceptIds.set(it.id, id);
			nodes.push({
				id,
				name: it.id,
				kind: 4,
				bias: 0
			});
			intern(it.id);
		}
		const nm = intern(it.id);
		intentRecs.push({
			name: it.id,
			conceptId: conceptIds.get(it.id),
			tool: it.tool,
			slotMask: it.slot_mask,
			nameOff: nm.off,
			nameLen: nm.len,
			defaultUtt: 0
		});
	}
	if (!conceptIds.has("unknown")) {
		const id = nodes.length;
		conceptIds.set("unknown", id);
		nodes.push({
			id,
			name: "unknown",
			kind: 4,
			bias: 0
		});
		intern("unknown");
	}
	const wordToConcept = { ...ont.word_to_concept };
	for (const w of ont.stopwords ?? []) wordToConcept[w] ??= "";
	for (const w of Object.keys(ont.number_words ?? {})) wordToConcept[w] ??= "number";
	for (const w of ont.vocab_extra ?? []) wordToConcept[w] ??= wordToConcept[w] ?? "";
	for (const it of ont.intents) for (const ph of it.phrases) for (const w of tokenizeWords$1(ph)) if (!(w in wordToConcept)) wordToConcept[w] = "";
	const vocabItems = [];
	for (const w of Object.keys(wordToConcept).sort()) {
		let flags = 0;
		if (STOPWORDS.has(w)) flags |= 1;
		if (PIVOTS.has(w)) flags |= 2;
		if (isNumWord(w)) flags |= 4;
		if ([
			"minutes",
			"minute",
			"seconds",
			"second",
			"hours",
			"hour"
		].includes(w)) flags |= 8;
		const cname = wordToConcept[w];
		const cid = cname ? conceptIds.get(cname) ?? 0 : 0;
		intern(w);
		vocabItems.push({
			w,
			cid,
			flags
		});
	}
	const table = Array.from({ length: VOCAB_SLOTS }, () => ({
		hash: 0,
		cid: 0,
		flags: 0
	}));
	let occupied = 0;
	for (const item of vocabItems) {
		const h = murmur3(item.w);
		let idx = h % VOCAB_SLOTS;
		for (let p = 0; p < VOCAB_SLOTS; p++) {
			if (table[idx].hash === 0 || table[idx].hash === h) {
				if (table[idx].hash === 0) occupied++;
				table[idx] = {
					hash: h,
					cid: item.cid,
					flags: item.flags
				};
				break;
			}
			idx = (idx + 1) % VOCAB_SLOTS;
		}
	}
	function lookupWord(w) {
		const h = murmur3(w);
		let idx = h % VOCAB_SLOTS;
		for (let p = 0; p < VOCAB_SLOTS; p++) {
			const e = table[idx];
			if (e.hash === 0) return {
				tid: 65535,
				cid: 0,
				flags: 0
			};
			if (e.hash === h) return {
				tid: idx,
				cid: e.cid,
				flags: e.flags
			};
			idx = (idx + 1) % VOCAB_SLOTS;
		}
		return {
			tid: 65535,
			cid: 0,
			flags: 0
		};
	}
	const edgeMap = /* @__PURE__ */ new Map();
	const addEdge = (src, dst, w) => {
		if (!src || !dst || src === dst) return;
		if (!edgeMap.has(src)) edgeMap.set(src, /* @__PURE__ */ new Map());
		const m = edgeMap.get(src);
		m.set(dst, Math.min(Q15_ONE, (m.get(dst) ?? 0) + w));
	};
	const patterns = [];
	for (const ex of ont.examples ?? []) {
		const intentCid = conceptIds.get(ex.intent) ?? 0;
		const toks = [];
		const conceptsHit = [];
		for (const w of tokenizeWords$1(ex.text)) {
			if (isNumWord(w) && !STOPWORDS.has(w)) {
				toks.push(NUMBER_TOKEN);
				conceptsHit.push(conceptIds.get("number") ?? 0);
				continue;
			}
			const { tid, cid, flags } = lookupWord(w);
			if (flags & 1) continue;
			if (flags & 8) {
				toks.push(DURATION_TOKEN);
				conceptsHit.push(conceptIds.get("duration") ?? 0);
				continue;
			}
			if (tid === 65535) continue;
			toks.push(tid);
			if (cid) conceptsHit.push(cid);
		}
		if (!toks.length) continue;
		patterns.push({
			intentId: intentCid,
			tokens: toks.slice(0, 12)
		});
		for (const cid of conceptsHit) {
			addEdge(cid, intentCid, q15(.18));
			addEdge(intentCid, cid, q15(.12));
		}
		for (let i = 0; i < conceptsHit.length - 1; i++) addEdge(conceptsHit[i], conceptsHit[i + 1], q15(.06));
	}
	for (const [a, b, w] of [
		[
			"volume",
			"loud",
			.4
		],
		[
			"volume",
			"quiet",
			.4
		],
		[
			"volume",
			"music",
			.3
		],
		[
			"brightness",
			"bright",
			.4
		],
		[
			"brightness",
			"dark",
			.4
		],
		[
			"lights",
			"dark",
			.25
		],
		[
			"timer",
			"duration",
			.4
		]
	]) {
		const ia = conceptIds.get(a), ib = conceptIds.get(b);
		if (ia && ib) {
			addEdge(ia, ib, q15(w));
			addEdge(ib, ia, q15(w));
		}
	}
	const packedEdges = [];
	const csrIndex = [];
	const csrCount = [];
	for (let src = 0; src < nodes.length; src++) {
		csrIndex[src] = packedEdges.length;
		const dests = [...edgeMap.get(src)?.entries() ?? []].sort((a, b) => b[1] - a[1]).slice(0, 8);
		csrCount[src] = dests.length;
		for (const [dst, wt] of dests) packedEdges.push({
			dst,
			wt
		});
	}
	const utterances = [];
	for (const [intentName, lines] of Object.entries(ont.utterances ?? {})) {
		const icid = conceptIds.get(intentName) ?? 0;
		for (const line of lines) {
			const s = intern(line);
			utterances.push({
				intentId: icid,
				sceneMask: 255,
				flags: 0,
				off: s.off,
				len: s.len
			});
		}
	}
	const firstUtt = /* @__PURE__ */ new Map();
	utterances.forEach((u, i) => {
		if (!firstUtt.has(u.intentId)) firstUtt.set(u.intentId, i);
	});
	for (const rec of intentRecs) rec.defaultUtt = firstUtt.get(rec.conceptId) ?? 0;
	const vocabBlob = [];
	for (const e of table) vocabBlob.push(...packU32(e.hash), ...packU16(e.cid), e.flags & 255, 0);
	const nodesBlob = [];
	nodes.forEach((n, i) => {
		nodesBlob.push(...packU16(n.id), n.kind, csrCount[i] & 255, ...packU16(csrIndex[i]), ...packI16(n.bias));
	});
	const edgesBlob = [];
	for (const e of packedEdges) edgesBlob.push(...packU16(e.dst), ...packI16(e.wt));
	const intentsBlob = [];
	for (const rec of intentRecs) intentsBlob.push(...packU16(rec.conceptId), rec.tool & 255, rec.slotMask & 255, ...packU16(rec.nameOff), ...packU16(rec.nameLen), ...packU16(rec.defaultUtt), ...packU16(0));
	const uttBlob = [];
	for (const u of utterances) uttBlob.push(...packU16(u.intentId), u.sceneMask, u.flags, ...packU16(u.off), ...packU16(u.len));
	const patBlob = [];
	for (const p of patterns) {
		const toks = p.tokens.slice(0, 12);
		let rec = [
			...packU16(p.intentId),
			toks.length,
			0
		];
		for (const t of toks) rec.push(...packU16(t));
		while (rec.length % 4) rec.push(0);
		patBlob.push(...rec);
	}
	let strings = stringBuf.slice();
	while (strings.length % 4) strings.push(0);
	let off = 64;
	const vocabOff = off;
	off += vocabBlob.length;
	const nodesOff = off;
	off += nodesBlob.length;
	const edgesOff = off;
	off += edgesBlob.length;
	const intentsOff = off;
	off += intentsBlob.length;
	const uttOff = off;
	off += uttBlob.length;
	const patOff = off;
	off += patBlob.length;
	const strOff = off;
	const strSize = strings.length;
	const header = /* @__PURE__ */ new Uint8Array(64);
	const hv = new DataView(header.buffer);
	hv.setUint32(0, MAGIC, true);
	hv.setUint16(4, 512, true);
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
	const payload = Uint8Array.from([
		...vocabBlob,
		...nodesBlob,
		...edgesBlob,
		...intentsBlob,
		...uttBlob,
		...patBlob,
		...strings
	]);
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
			strings: strSize
		}
	};
}
function blobToC(blob, symbol = "morf_ontology_blob") {
	const lines = [
		"/* Auto-generated by MORF foundry — do not edit. */",
		"#include <stdint.h>",
		`const uint8_t ${symbol}[] = {`
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
function downloadBytes(filename, data, mime = "application/octet-stream") {
	const blob = new Blob([new Uint8Array(data)], { type: mime });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}
function downloadText(filename, text, mime = "text/plain") {
	downloadBytes(filename, new TextEncoder().encode(text), mime);
}
function u16(n) {
	return [n & 255, n >> 8 & 255];
}
function u32(n) {
	return [
		n & 255,
		n >> 8 & 255,
		n >> 16 & 255,
		n >>> 24 & 255
	];
}
/** Uncompressed ZIP (STORE). Deterministic, no extra fields. */
function zipStore(files) {
	const locals = [];
	const central = [];
	for (const f of files) {
		const name = new TextEncoder().encode(f.name.replaceAll("\\", "/"));
		const data = f.data;
		const crc = crc32(data);
		const offset = locals.length;
		locals.push(...u32(67324752), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0));
		locals.push(...name, ...data);
		central.push(...u32(33639248), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset));
		central.push(...name);
	}
	const cdOff = locals.length;
	const eocd = [
		...u32(101010256),
		...u16(0),
		...u16(0),
		...u16(files.length),
		...u16(files.length),
		...u32(central.length),
		...u32(cdOff),
		...u16(0)
	];
	return Uint8Array.from([
		...locals,
		...central,
		...eocd
	]);
}
async function fetchBytes(url) {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Missing ${url}`);
	return new Uint8Array(await res.arrayBuffer());
}
async function packFirmwareZip(opts) {
	const manifest = await (await fetch("/firmware-src/manifest.json")).json();
	const entries = [];
	const encoder = new TextEncoder();
	for (const rel of manifest.files) {
		if (rel.endsWith("morf_ontology_blob.c") || rel.endsWith("morf.bin")) continue;
		const data = await fetchBytes("/firmware-src/" + rel);
		entries.push({
			name: "morf-firmware/" + rel,
			data
		});
	}
	const csrc = encoder.encode(blobToC(opts.blob));
	entries.push({
		name: "morf-firmware/src/morf_ontology_blob.c",
		data: csrc
	});
	entries.push({
		name: "morf-firmware/data/morf_ontology_blob.c",
		data: csrc
	});
	entries.push({
		name: "morf-firmware/data/morf.bin",
		data: opts.blob
	});
	if (opts.seed) entries.push({
		name: "morf-firmware/ontology/seed.json",
		data: encoder.encode(opts.seed)
	});
	entries.sort((a, b) => a.name.localeCompare(b.name));
	return zipStore(entries);
}
var PROP = {
	NONE: 0,
	VOLUME: 1,
	BRIGHT: 2,
	LIGHTS: 3,
	TIMER: 4,
	MUSIC: 5
};
function clamp(v, lo, hi) {
	return Math.max(lo, Math.min(hi, v));
}
function tokenizeWords(text) {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
}
function createRuntime(image) {
	const graph = image.nodes.map((n) => ({
		id: n.id,
		kind: n.kind,
		tag: n.bias,
		activation: 0,
		edges: Array.from({ length: n.edgeCount }, (_, i) => {
			const e = image.edges[n.firstEdge + i];
			return {
				target: e.target,
				weight: e.weight
			};
		})
	}));
	const device = {
		volume: 40,
		brightness: 70,
		lights: 1,
		muted: 0,
		musicPlaying: 0,
		night: 0,
		timerMs: 0,
		timerRunning: 0,
		lastTarget: 0,
		lastIntent: 0,
		scene: 0,
		pendingIntent: 0
	};
	function intentName(id) {
		const it = image.intents.find((x) => x.conceptId === id);
		if (!it) return "";
		return readCString(image.strings, it.nameOff, it.nameLen);
	}
	function lookup(word) {
		const h = murmur3(word);
		let idx = h % image.header.vocabSize;
		for (let p = 0; p < 64; p++) {
			const e = image.vocab[idx];
			if (e.hash === 0) return null;
			if (e.hash === h) return {
				token: idx,
				concept: e.concept,
				flags: e.flags
			};
			idx = (idx + 1) % image.header.vocabSize;
		}
		return null;
	}
	function tokenize(text) {
		const out = [];
		for (const w of tokenizeWords(text)) {
			if (/^\d+$/.test(w)) {
				out.push({
					token: NUMBER_TOKEN,
					value: clamp(parseInt(w, 10), 0, 1e4),
					flags: 4,
					conceptId: 0,
					word: w
				});
				continue;
			}
			if (w in NUMBER_WORDS) {
				out.push({
					token: NUMBER_TOKEN,
					value: NUMBER_WORDS[w],
					flags: 4,
					conceptId: 0,
					word: w
				});
				continue;
			}
			const hit = lookup(w);
			if (!hit) continue;
			if (hit.flags & 8) {
				const mul = w.startsWith("m") && w.includes("in") ? 60 : w.startsWith("h") ? 3600 : 1;
				out.push({
					token: DURATION_TOKEN,
					value: mul,
					flags: 8,
					conceptId: hit.concept,
					word: w
				});
				continue;
			}
			out.push({
				token: hit.token,
				value: 0,
				flags: hit.flags,
				conceptId: hit.concept,
				word: w
			});
		}
		return out;
	}
	function reset() {
		for (const n of graph) n.activation = 0;
	}
	function inject(concept, charge) {
		if (!concept || concept >= graph.length) return;
		graph[concept].activation = q15AddSat(graph[concept].activation, charge);
	}
	function sweep() {
		const snapshot = graph.map((n) => n.activation);
		for (let i = 0; i < graph.length; i++) {
			const src = snapshot[i];
			if (src < 1024) continue;
			for (const e of graph[i].edges) {
				if (e.target >= graph.length) continue;
				graph[e.target].activation = q15AddSat(graph[e.target].activation, q15Mul(src, e.weight));
			}
		}
	}
	function resolveIntents() {
		let top = 0, ta = 0, runner = 0, ra = 0;
		const acts = [];
		for (const n of graph) {
			if (n.kind !== 4) continue;
			const name = intentName(n.id) || `#${n.id}`;
			if (n.activation > 0) acts.push({
				name,
				value: n.activation
			});
			if (n.activation > ta) {
				ra = ta;
				runner = top;
				ta = n.activation;
				top = n.id;
			} else if (n.activation > ra) {
				ra = n.activation;
				runner = n.id;
			}
		}
		acts.sort((a, b) => b.value - a.value);
		return {
			top,
			ta,
			runner,
			ra,
			acts: acts.slice(0, 8)
		};
	}
	function matchPatterns(toks) {
		const seq = toks.filter((t) => !(t.flags & 1)).map((t) => t.token);
		let hits = 0;
		let found = 0;
		for (const p of image.patterns) {
			if (p.tokens.length !== seq.length || seq.length === 0) continue;
			let ok = true;
			for (let i = 0; i < seq.length; i++) if (p.tokens[i] !== seq[i]) {
				ok = false;
				break;
			}
			if (ok) {
				found = p.intentId;
				hits++;
			}
		}
		return {
			hits,
			intent: found
		};
	}
	function propertyFromName(name) {
		if (name.includes("volume") || name === "mute" || name === "unmute") return PROP.VOLUME;
		if (name.includes("bright")) return PROP.BRIGHT;
		if (name.includes("light")) return PROP.LIGHTS;
		if (name.includes("timer")) return PROP.TIMER;
		if (name === "play" || name === "pause" || name === "skip") return PROP.MUSIC;
		if (name.includes("night") || name.includes("day")) return PROP.BRIGHT;
		return PROP.NONE;
	}
	function directionFromName(name) {
		if (name.includes("_up") || name === "unmute") return 1;
		if (name.includes("_down") || name === "mute") return -1;
		return 0;
	}
	function pickUtterance(intent) {
		const pool = image.utterances.filter((u) => u.intentId === intent);
		if (!pool.length) return "Okay.";
		const u = pool[(device.volume * 17 + intent * 13) % pool.length];
		let s = readCString(image.strings, u.strOff, u.strLen);
		s = s.replaceAll("{volume}", String(device.volume));
		s = s.replaceAll("{brightness}", String(device.brightness));
		s = s.replaceAll("{lights}", device.lights ? "on" : "off");
		s = s.replaceAll("{duration}", String(Math.floor(device.timerMs / 1e3)));
		s = s.replaceAll("{remaining}", String(Math.floor(device.timerMs / 1e3)));
		return s;
	}
	function applyTool(r) {
		const delta = r.number > 0 ? r.number : 10;
		switch (r.toolId) {
			case TOOL.SET_VOLUME:
				device.volume = clamp(r.number > 0 ? r.number : device.volume, 0, 100);
				device.muted = 0;
				device.lastTarget = PROP.VOLUME;
				break;
			case TOOL.ADJ_VOLUME:
				device.volume = clamp(device.volume + (r.direction < 0 ? -delta : delta), 0, 100);
				device.muted = 0;
				device.lastTarget = PROP.VOLUME;
				break;
			case TOOL.SET_BRIGHT:
				device.brightness = clamp(r.number > 0 ? r.number : device.brightness, 0, 100);
				if (device.brightness > 0) device.lights = 1;
				device.lastTarget = PROP.BRIGHT;
				break;
			case TOOL.ADJ_BRIGHT:
				device.brightness = clamp(device.brightness + (r.direction < 0 ? -delta : delta), 0, 100);
				if (device.brightness > 0) device.lights = 1;
				device.lastTarget = PROP.BRIGHT;
				break;
			case TOOL.LIGHTS:
				if (r.direction < 0 || r.intentName.includes("off")) device.lights = 0;
				else if (r.intentName.includes("toggle")) device.lights = device.lights ? 0 : 1;
				else device.lights = 1;
				if (device.lights && device.brightness === 0) device.brightness = 40;
				device.lastTarget = PROP.LIGHTS;
				break;
			case TOOL.PLAYPAUSE:
				if (r.intentName.includes("pause")) device.musicPlaying = 0;
				else if (!r.intentName.includes("skip")) device.musicPlaying = 1;
				device.lastTarget = PROP.MUSIC;
				break;
			case TOOL.TIMER_SET: {
				const sec = r.durationS > 0 ? r.durationS : r.number > 0 ? r.number * 60 : 60;
				device.timerMs = sec * 1e3;
				device.timerRunning = 1;
				r.durationS = sec;
				device.lastTarget = PROP.TIMER;
				break;
			}
			case TOOL.TIMER_CANCEL:
				device.timerRunning = 0;
				device.timerMs = 0;
				break;
			case TOOL.MUTE:
				if (r.intentName.includes("unmute")) {
					device.muted = 0;
					if (device.volume === 0) device.volume = 20;
				} else device.muted = 1;
				break;
			case TOOL.NIGHT: if (r.intentName.includes("day")) {
				device.night = 0;
				device.brightness = 80;
				device.lights = 1;
				device.scene = 1;
			} else {
				device.night = 1;
				device.brightness = 12;
				device.volume = clamp(device.volume, 0, 20);
				device.scene = 7;
			}
		}
	}
	function parseSlots(toks, intentNameStr) {
		let number = 0;
		let durationS = 0;
		let pending = -1;
		let property = propertyFromName(intentNameStr);
		let direction = directionFromName(intentNameStr);
		let sawPivot = false;
		for (const t of toks) {
			if (t.flags & 2) sawPivot = true;
			if (t.token === 65534) {
				pending = t.value;
				if (!number) number = t.value;
			} else if (t.token === 65533) {
				const mul = t.value > 0 ? t.value : 1;
				durationS = clamp((pending >= 0 ? pending : number > 0 ? number : 1) * mul, 1, 36e3);
				pending = -1;
			} else if (t.conceptId && t.conceptId < graph.length) {
				const node = graph[t.conceptId];
				if (node.kind === 1 && node.tag > 0) property = node.tag;
				if (node.kind === 3) {
					if (node.tag > 0) direction = node.tag === 2 ? 0 : 1;
					else if (node.tag < 0) direction = -1;
				}
			}
		}
		if (sawPivot && device.lastTarget) property = device.lastTarget;
		return {
			number,
			durationS,
			direction,
			property,
			sawPivot
		};
	}
	function remapAdj(prop, dir) {
		const want = prop === PROP.VOLUME ? dir < 0 ? "volume_down" : "volume_up" : prop === PROP.BRIGHT ? dir < 0 ? "bright_down" : "bright_up" : prop === PROP.LIGHTS ? dir < 0 ? "lights_off" : "lights_on" : prop === PROP.MUSIC ? dir < 0 ? "pause" : "play" : "";
		if (!want) return 0;
		return image.intents.find((x) => readCString(image.strings, x.nameOff, x.nameLen) === want)?.conceptId ?? 0;
	}
	function bindIntent(toks, r) {
		const slots = parseSlots(toks, r.intentName);
		r.number = slots.number;
		r.durationS = slots.durationS;
		r.direction = slots.direction;
		r.property = slots.property;
		if ((r.intentName === "deny" || r.intentName === "cancel") && device.pendingIntent) {
			device.pendingIntent = 0;
			r.toolId = 0;
			r.intentId = 0;
			return {
				wait: true,
				response: "Cancelled."
			};
		}
		if (r.intentName === "confirm" && device.pendingIntent) {
			const held = device.pendingIntent;
			device.pendingIntent = 0;
			r.intentId = held;
			r.intentName = intentName(held);
			r.toolId = image.intents.find((x) => x.conceptId === held)?.toolId ?? 0;
			const again = parseSlots(toks, r.intentName);
			r.number = again.number;
			r.durationS = again.durationS;
			r.direction = again.direction;
			r.property = again.property;
		}
		if (!r.intentId && device.pendingIntent && (r.number > 0 || r.durationS > 0)) {
			const held = device.pendingIntent;
			r.intentId = held;
			r.intentName = intentName(held);
			r.toolId = image.intents.find((x) => x.conceptId === held)?.toolId ?? 0;
			r.layer = 2;
			device.pendingIntent = 0;
		}
		if (r.intentId && device.lastTarget && slots.sawPivot) {
			const cur = propertyFromName(r.intentName);
			if (cur && cur !== device.lastTarget) {
				const alt = remapAdj(device.lastTarget, r.direction || directionFromName(r.intentName));
				if (alt) {
					r.intentId = alt;
					r.intentName = intentName(alt);
					r.toolId = image.intents.find((x) => x.conceptId === alt)?.toolId ?? 0;
					r.property = device.lastTarget;
					r.layer = 2;
				}
			}
		}
		const mask = image.intents.find((x) => x.conceptId === r.intentId)?.slotMask ?? 0;
		if (r.intentId && (r.toolId === TOOL.SET_VOLUME || r.toolId === TOOL.SET_BRIGHT) && r.number <= 0) {
			device.pendingIntent = r.intentId;
			r.needClarify = true;
			return {
				wait: true,
				response: r.toolId === TOOL.SET_VOLUME ? "What volume?" : "What brightness?"
			};
		}
		if (r.intentId && r.toolId === TOOL.TIMER_SET && r.durationS <= 0 && r.number <= 0 && mask & 16) {
			device.pendingIntent = r.intentId;
			r.needClarify = true;
			return {
				wait: true,
				response: "For how long?"
			};
		}
		return { wait: false };
	}
	function process(text) {
		reset();
		const tokens = tokenize(text);
		for (const t of tokens) {
			if (t.flags & 1) continue;
			if (t.conceptId) inject(t.conceptId, 16384);
		}
		sweep();
		sweep();
		const pat = matchPatterns(tokens);
		const { top, ta, runner, ra, acts } = resolveIntents();
		let chosen = 0;
		let layer = 1;
		let ambiguous = false;
		let needClarify = false;
		let conf = ta;
		if (pat.hits === 1 && pat.intent) {
			chosen = pat.intent;
			layer = 0;
			conf = 28672;
		} else if (pat.hits > 1 && pat.intent) {
			chosen = pat.intent;
			layer = 0;
			ambiguous = true;
			conf = 20480;
		} else {
			chosen = top;
			if (ta < 5120) chosen = 0;
			else if (ta > 0 && ta - ra < 3270) {
				ambiguous = true;
				if (device.lastTarget !== PROP.VOLUME && device.lastTarget !== PROP.BRIGHT) needClarify = true;
			}
		}
		const name = chosen ? intentName(chosen) : "";
		const toolId = image.intents.find((x) => x.conceptId === chosen)?.toolId ?? 0;
		const bound = {
			intentId: chosen,
			intentName: name,
			toolId,
			layer,
			number: 0,
			durationS: 0,
			direction: 0,
			property: 0,
			needClarify
		};
		const ctx = bindIntent(tokens, bound);
		chosen = bound.intentId;
		needClarify = bound.needClarify;
		layer = bound.layer;
		const resultBase = {
			raw: text,
			intentId: chosen,
			intentName: bound.intentName,
			toolId: bound.toolId,
			toolName: TOOL_NAMES[bound.toolId] ?? "none",
			layer,
			ambiguous,
			needClarify,
			confidence: conf,
			number: bound.number,
			durationS: bound.durationS,
			direction: bound.direction,
			property: bound.property,
			tokens,
			topIntent: intentName(top),
			runnerIntent: intentName(runner),
			topActivation: ta,
			runnerActivation: ra,
			activations: acts
		};
		function sceneFor(r) {
			if (r.needClarify || !r.intentId) {
				device.scene = device.scene === 6 ? 2 : 6;
				return;
			}
			if (r.toolId === TOOL.NIGHT) device.scene = device.night ? 7 : 1;
			else if (r.toolId === TOOL.SPEAK) device.scene = r.intentName.includes("smalltalk") || r.intentName.includes("greet") ? 0 : 1;
			else if (r.toolId !== TOOL.NONE) device.scene = 1;
		}
		if (ctx.wait) {
			sceneFor({
				needClarify: true,
				intentId: chosen,
				toolId: bound.toolId,
				intentName: bound.intentName
			});
			return {
				...resultBase,
				response: ctx.response ?? "Volume or brightness?",
				device: { ...device }
			};
		}
		if (needClarify && chosen) {
			device.scene = 6;
			return {
				...resultBase,
				response: "Volume or brightness?",
				device: { ...device }
			};
		}
		if (!chosen) {
			sceneFor({
				needClarify: true,
				intentId: 0,
				toolId: 0,
				intentName: ""
			});
			return {
				...resultBase,
				response: "Sorry, I didn't get that.",
				device: { ...device }
			};
		}
		applyTool({
			toolId: bound.toolId,
			intentName: bound.intentName,
			number: bound.number,
			durationS: bound.durationS,
			direction: bound.direction
		});
		const response = pickUtterance(chosen);
		device.lastIntent = chosen;
		sceneFor({
			needClarify: false,
			intentId: chosen,
			toolId: bound.toolId,
			intentName: bound.intentName
		});
		return {
			...resultBase,
			durationS: device.lastTarget === PROP.TIMER ? Math.floor(device.timerMs / 1e3) : bound.durationS,
			response,
			device: { ...device }
		};
	}
	return {
		image,
		device,
		process,
		tokenize,
		resetDevice() {
			device.volume = 40;
			device.brightness = 70;
			device.lights = 1;
			device.muted = 0;
			device.musicPlaying = 0;
			device.night = 0;
			device.timerMs = 0;
			device.timerRunning = 0;
			device.lastTarget = 0;
			device.lastIntent = 0;
			device.scene = 0;
			device.pendingIntent = 0;
		}
	};
}
var GOLDEN = [
	{
		text: "hello",
		intent: "greet"
	},
	{
		text: "hey",
		intent: "greet"
	},
	{
		text: "thanks",
		intent: "thanks"
	},
	{
		text: "who are you",
		intent: "identity"
	},
	{
		text: "what can you do",
		intent: "help"
	},
	{
		text: "turn the music down",
		intent: "volume_down"
	},
	{
		text: "turn it down",
		intent: "volume_down"
	},
	{
		text: "too loud",
		intent: "volume_down"
	},
	{
		text: "volume up",
		intent: "volume_up"
	},
	{
		text: "louder",
		intent: "volume_up"
	},
	{
		text: "set volume to 30",
		intent: "volume_set"
	},
	{
		text: "what is the volume",
		intent: "volume_query"
	},
	{
		text: "mute",
		intent: "mute"
	},
	{
		text: "raise the brightness",
		intent: "bright_up"
	},
	{
		text: "make it darker",
		intent: "bright_down"
	},
	{
		text: "dim",
		intent: "bright_down"
	},
	{
		text: "lights off",
		intent: "lights_off"
	},
	{
		text: "turn the lights on",
		intent: "lights_on"
	},
	{
		text: "kill the lights",
		intent: "lights_off"
	},
	{
		text: "play music",
		intent: "play"
	},
	{
		text: "pause",
		intent: "pause"
	},
	{
		text: "set a timer for 3 minutes",
		intent: "timer_set"
	},
	{
		text: "cancel timer",
		intent: "timer_cancel"
	},
	{
		text: "night mode",
		intent: "night_mode"
	},
	{
		text: "status",
		intent: "status"
	},
	{
		text: "goodbye",
		intent: "farewell"
	}
];
function uid() {
	return Math.random().toString(36).slice(2, 9);
}
var useMorf = create((set, get) => ({
	tab: "bench",
	ready: false,
	error: null,
	runtime: null,
	image: null,
	ontology: null,
	messages: [],
	last: null,
	evalRows: null,
	compiling: false,
	expanding: false,
	setTab: (tab) => set({ tab }),
	boot: async () => {
		try {
			const [binRes, seedRes] = await Promise.all([fetch("/ontology/morf.bin"), fetch("/ontology/seed.json")]);
			if (!binRes.ok) throw new Error("Missing packed image /ontology/morf.bin");
			const image = parseImage(new Uint8Array(await binRes.arrayBuffer()));
			set({
				ready: true,
				image,
				ontology: await seedRes.json(),
				runtime: createRuntime(image),
				error: null,
				messages: [{
					id: uid(),
					role: "sys",
					text: `Image ${image.bytes.length} B · ${image.header.intentCount} intents · ${image.header.patternCount} patterns · crc 0x${image.header.crc32.toString(16)}`
				}]
			});
		} catch (e) {
			set({
				error: e instanceof Error ? e.message : "boot failed",
				ready: false
			});
		}
	},
	speak: (text) => {
		const t = text.trim();
		if (!t) return;
		const { runtime } = get();
		if (!runtime) return;
		const result = runtime.process(t);
		const userMsg = {
			id: uid(),
			role: "user",
			text: t
		};
		const morfMsg = {
			id: uid(),
			role: "morf",
			text: result.response,
			result
		};
		set((s) => ({
			last: result,
			messages: [
				...s.messages,
				userMsg,
				morfMsg
			].slice(-80)
		}));
	},
	resetDevice: () => {
		get().runtime?.resetDevice();
		set({ last: null });
	},
	addExample: (intent, text) => {
		const { ontology } = get();
		if (!ontology || !text.trim()) return;
		set({ ontology: {
			...ontology,
			examples: [...ontology.examples, {
				intent,
				text: text.trim()
			}],
			intents: ontology.intents.map((it) => it.id === intent && !it.phrases.includes(text.trim()) ? {
				...it,
				phrases: [...it.phrases, text.trim()]
			} : it)
		} });
	},
	removeExample: (index) => {
		const { ontology } = get();
		if (!ontology) return;
		set({ ontology: {
			...ontology,
			examples: ontology.examples.filter((_, i) => i !== index)
		} });
	},
	addPhrases: (intent, phrases) => {
		const { ontology } = get();
		if (!ontology) return;
		const extra = phrases.filter(Boolean);
		set({ ontology: {
			...ontology,
			intents: ontology.intents.map((it) => it.id === intent ? {
				...it,
				phrases: [.../* @__PURE__ */ new Set([...it.phrases, ...extra])]
			} : it),
			examples: [...ontology.examples, ...extra.map((text) => ({
				intent,
				text
			}))]
		} });
	},
	recompile: () => {
		const { ontology } = get();
		if (!ontology) return;
		set({
			compiling: true,
			error: null
		});
		try {
			const { blob } = compileOntology(ontology);
			const image = parseImage(blob);
			set({
				compiling: false,
				image,
				runtime: createRuntime(image),
				last: null,
				evalRows: null,
				messages: [{
					id: uid(),
					role: "sys",
					text: `Recompiled ${blob.length} B · ${image.header.patternCount} patterns · crc 0x${image.header.crc32.toString(16)}`
				}]
			});
		} catch (e) {
			set({
				compiling: false,
				error: e instanceof Error ? e.message : "compile failed"
			});
		}
	},
	runEval: () => {
		const { runtime } = get();
		if (!runtime) return;
		runtime.resetDevice();
		set({ evalRows: GOLDEN.map((g) => {
			runtime.resetDevice();
			const r = runtime.process(g.text);
			return {
				text: g.text,
				expect: g.intent,
				got: r.intentName || "(none)",
				pass: r.intentName === g.intent
			};
		}) });
	}
}));
function FirmwarePanel() {
	const image = useMorf((s) => s.image);
	const ontology = useMorf((s) => s.ontology);
	const [packing, setPacking] = (0, import_react.useState)(false);
	const [packMsg, setPackMsg] = (0, import_react.useState)(null);
	async function downloadTrained() {
		if (!image) return;
		setPacking(true);
		setPackMsg(null);
		try {
			const zip = await packFirmwareZip({
				blob: image.bytes,
				seed: ontology ? JSON.stringify(ontology, null, 2) : void 0
			});
			downloadBytes("morf-firmware.zip", zip, "application/zip");
			setPackMsg(`Packed ${zip.length} B with the current ${image.bytes.length} B language image.`);
		} catch (e) {
			setPackMsg(e instanceof Error ? e.message : "Pack failed");
		} finally {
			setPacking(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4 lg:grid-cols-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-lg border border-line bg-surface p-5 shadow-panel",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, { className: "size-4 text-phosphor" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-lg font-medium tracking-tight",
							children: "Flash pack"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Real PlatformIO firmware for M5Stack CoreS3 and generic ESP32-S3. Core 0 owns I2S DMA + USB. Core 1 runs the lockless NLU graph. Train here, then pack the blob into the same tree you flash."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								onClick: () => void downloadTrained(),
								disabled: packing || !image,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "size-4" }),
									" ",
									packing ? "Packing…" : "Download trained firmware"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
								href: "/morf-firmware.zip",
								download: true,
								className: "inline-flex h-11 items-center gap-2 rounded-sm border border-line px-4 text-sm font-medium text-fg hover:bg-raised",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "size-4" }), " Seed pack"]
							}),
							image && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								onClick: () => downloadBytes("morf_ontology_blob.c", new TextEncoder().encode(blobToC(image.bytes)), "text/plain"),
								children: "blob.c only"
							})
						]
					}),
					packMsg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted",
						children: packMsg
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
						className: "mt-6 space-y-3 text-sm text-fg",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-phosphor",
								children: "1."
							}), " Unzip. Open the folder in PlatformIO."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-mono text-phosphor",
								children: "2."
							}), " Plug CoreS3 over USB-C. Hold reset if the port does not appear."] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-phosphor",
									children: "3."
								}),
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
									className: "rounded-sm bg-inset px-1.5 py-0.5 font-mono text-xs",
									children: "pio run -e m5stack-cores3 -t upload"
								})
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-phosphor",
									children: "4."
								}),
								" Monitor at 115200 or connect below. Type",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-xs",
									children: "turn the music down"
								}),
								"."
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-phosphor",
									children: "5."
								}),
								" Teach a voice one-shot:",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-xs",
									children: "/teach-voice turn the music down"
								}),
								" then speak it."
							] })
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-lg border border-line bg-surface p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3 flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radio, { className: "size-4 text-phosphor" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-lg font-medium tracking-tight",
							children: "CoreS3 acoustic"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Dual-mic ES7210, 16 kHz I2S DMA frames on Core 0. Energy VAD, 16-band envelope, DTW against taught templates. A match injects the bound phrase into the Core 1 engine — same NLU as USB CDC. Generic boards use INMP441 on GPIO 4/5/6."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
						className: "mt-4 w-full font-mono text-xs",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: [
							["I2S MCLK", "GPIO 0"],
							["I2S BCLK", "GPIO 34"],
							["I2S LRCK", "GPIO 33"],
							["I2S DIN (mic)", "GPIO 14"],
							["I2S DOUT (spk)", "GPIO 13"],
							["I2C SDA/SCL", "GPIO 12 / 11"],
							["ES7210", "0x40"],
							["Inference core", "1 · lockless SPSC"]
						].map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-t border-line",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "py-2 text-muted",
								children: k
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "py-2 text-right text-fg",
								children: v
							})]
						}, k)) })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SerialConsole, {})
		]
	});
}
function SerialConsole() {
	const [log, setLog] = (0, import_react.useState)("USB CDC at 115200 — same channel the firmware reads.");
	const [draft, setDraft] = (0, import_react.useState)("turn the music down");
	const [connected, setConnected] = (0, import_react.useState)(false);
	const portRef = (0, import_react.useRef)(null);
	const writerRef = (0, import_react.useRef)(null);
	const runRef = (0, import_react.useRef)(false);
	const scroller = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
	}, [log]);
	function append(line) {
		setLog((s) => (s + "\n" + line).slice(-8e3));
	}
	async function connect() {
		const nav = navigator;
		if (!nav.serial) {
			append("Web Serial is not available in this browser.");
			return;
		}
		try {
			const port = await nav.serial.requestPort();
			await port.open({ baudRate: 115200 });
			portRef.current = port;
			runRef.current = true;
			setConnected(true);
			if (port.writable) writerRef.current = port.writable.getWriter();
			append("Connected.");
			if (port.readable) {
				const reader = port.readable.getReader();
				const dec = new TextDecoder();
				(async () => {
					try {
						while (runRef.current) {
							const { value, done } = await reader.read();
							if (done) break;
							if (value) append(dec.decode(value).replace(/\r/g, "").trimEnd());
						}
					} catch (e) {
						append(e instanceof Error ? e.message : "serial read ended");
					} finally {
						reader.releaseLock();
					}
				})();
			}
		} catch (e) {
			append(e instanceof Error ? e.message : "connect failed");
		}
	}
	async function disconnect() {
		runRef.current = false;
		try {
			writerRef.current?.releaseLock();
			writerRef.current = null;
			await portRef.current?.close();
		} catch {}
		portRef.current = null;
		setConnected(false);
		append("Disconnected.");
	}
	async function send() {
		const t = draft.trim();
		if (!t || !writerRef.current) return;
		const bytes = new TextEncoder().encode(t + "\n");
		await writerRef.current.write(bytes);
		append("> " + t);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-lg border border-line bg-surface p-5 shadow-panel lg:col-span-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-3 flex flex-wrap items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cable, { className: "size-4 text-phosphor" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-medium tracking-tight",
						children: "Board console"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex gap-2",
					children: connected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: () => void disconnect(),
						children: "Disconnect"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						onClick: () => void connect(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "size-4" }), " Connect ESP32-S3"]
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-3 text-sm text-muted",
				children: "Talk to a flashed board over USB CDC from this tab. The host bench above is the same engine without the chip."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				ref: scroller,
				className: "h-48 overflow-auto rounded-md bg-inset p-3 font-mono text-[11px] leading-5 text-metal",
				children: log
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "mt-3 flex gap-2",
				onSubmit: (e) => {
					e.preventDefault();
					send();
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: draft,
					onChange: (e) => setDraft(e.target.value),
					disabled: !connected,
					className: "h-11 min-w-0 flex-1 rounded-sm border border-line bg-inset px-3 text-sm text-fg outline-none focus:border-phosphor-dim",
					placeholder: "Utterance to the board"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					disabled: !connected,
					children: "Send"
				})]
			})
		]
	});
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var expandIntentPhrases = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("db3aef3d13e1cec2ae4b3436488828b8b0b96d8aa68df725ebbb36cabebccd53"));
var TABS = [
	{
		id: "bench",
		label: "Bench",
		icon: Terminal
	},
	{
		id: "train",
		label: "Train",
		icon: Activity
	},
	{
		id: "image",
		label: "Image",
		icon: Binary
	},
	{
		id: "firmware",
		label: "Firmware",
		icon: Cpu
	}
];
var PROMPTS = [
	"turn the music down",
	"raise the brightness",
	"set volume to 30",
	"lights off",
	"set a timer for 3 minutes",
	"who are you",
	"too loud",
	"night mode",
	"what can you do"
];
var SCENES = [
	"idle",
	"task",
	"frustrated",
	"playful",
	"low",
	"confirm",
	"clarify",
	"night"
];
function Lab() {
	const boot = useMorf((s) => s.boot);
	const ready = useMorf((s) => s.ready);
	const error = useMorf((s) => s.error);
	const tab = useMorf((s) => s.tab);
	(0, import_react.useEffect)(() => {
		boot();
	}, [boot]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-dvh flex-col bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4 pb-8 pt-4 md:px-6",
			children: [error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-4 rounded-md border border-fault/40 bg-fault/10 px-4 py-3 text-sm text-fault",
				children: error
			}), !ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-sm text-muted",
				children: "Loading packed image…"
			}) : tab === "bench" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bench, {}) : tab === "train" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Train, {}) : tab === "image" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImageView, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FirmwarePanel, {})]
		})]
	});
}
function Header() {
	const tab = useMorf((s) => s.tab);
	const setTab = useMorf((s) => s.setTab);
	const image = useMorf((s) => s.image);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
		className: "border-b border-line bg-surface",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-4 md:flex-row md:items-end md:justify-between md:px-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-mono text-[11px] tracking-[0.22em] text-phosphor uppercase",
					children: "ESP32-S3 · M5Stack CoreS3"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-1 font-sans text-3xl font-medium tracking-[-0.04em] text-fg md:text-4xl",
					children: "MORF"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 max-w-xl text-sm text-muted",
					children: "Mixture of Rational Forms — train the ontology, pack a flash image, run the same engine the board runs."
				})
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col items-start gap-2 md:items-end",
				children: [image && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "font-mono text-[11px] text-subtle tabular-nums",
					children: [
						image.bytes.length,
						" B · ",
						image.header.patternCount,
						" patterns · ",
						image.header.intentCount,
						" intents"
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
					className: "flex flex-wrap gap-1 rounded-md bg-inset p-1",
					children: TABS.map((t) => {
						const Icon = t.icon;
						const on = tab === t.id;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setTab(t.id),
							className: cn("inline-flex h-10 items-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors duration-150", on ? "bg-raised text-fg" : "text-muted hover:text-fg"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
								className: "size-3.5",
								strokeWidth: 1.75
							}), t.label]
						}, t.id);
					})
				})]
			})]
		})
	});
}
function Bench() {
	const speak = useMorf((s) => s.speak);
	const messages = useMorf((s) => s.messages);
	const last = useMorf((s) => s.last);
	const runtime = useMorf((s) => s.runtime);
	const resetDevice = useMorf((s) => s.resetDevice);
	const runEval = useMorf((s) => s.runEval);
	const evalRows = useMorf((s) => s.evalRows);
	const [draft, setDraft] = (0, import_react.useState)("");
	const scroller = (0, import_react.useRef)(null);
	const device = runtime?.device;
	(0, import_react.useEffect)(() => {
		scroller.current?.scrollTo({
			top: scroller.current.scrollHeight,
			behavior: "smooth"
		});
	}, [messages.length]);
	function send(text) {
		const t = (text ?? draft).trim();
		if (!t) return;
		speak(t);
		setDraft("");
	}
	function listen() {
		const w = window;
		const SR = w.webkitSpeechRecognition ?? w.SpeechRecognition;
		if (!SR) return;
		const rec = new SR();
		rec.lang = "en-US";
		rec.onresult = (ev) => {
			const t = ev.results[0]?.[0]?.transcript;
			if (t) send(t);
		};
		rec.start();
	}
	const pass = evalRows ? evalRows.filter((r) => r.pass).length : null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "flex min-h-0 flex-col rounded-lg border border-line bg-surface p-3 shadow-panel md:p-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-3 flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm font-medium",
						children: "Host bench — same packed image as firmware"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "ghost",
							className: "h-9 px-3 text-xs",
							onClick: resetDevice,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-3.5" }), " Reset"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							className: "h-9 px-3 text-xs",
							onClick: runEval,
							children: "Run gold set"
						})]
					})]
				}),
				pass !== null && evalRows && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-mono text-xs text-phosphor tabular-nums",
						children: [
							pass,
							"/",
							evalRows.length,
							" gold intents matched"
						]
					}), evalRows.some((r) => !r.pass) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-1 max-h-20 overflow-y-auto font-mono text-[10px] text-fault",
						children: evalRows.filter((r) => !r.pass).map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
							r.text,
							" → ",
							r.got,
							" (want ",
							r.expect,
							")"
						] }, r.text))
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					ref: scroller,
					className: "min-h-[280px] flex-1 space-y-3 overflow-y-auto rounded-md bg-inset p-3",
					children: messages.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: cn("flex", m.role === "user" ? "justify-end" : "justify-start"),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: cn("max-w-[90%] rounded-md px-3 py-2 text-sm", m.role === "user" && "bg-raised text-fg", m.role === "morf" && "border border-phosphor-dim bg-bg text-fg", m.role === "sys" && "font-mono text-xs text-subtle"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: m.text }), m.result && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 font-mono text-[10px] tracking-wide text-muted uppercase",
								children: [
									m.result.intentName || "none",
									" · ",
									m.result.layer === 0 ? "L0" : m.result.layer === 2 ? "L2" : "L1",
									" · tool ",
									m.result.toolName
								]
							})]
						})
					}, m.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 flex flex-wrap gap-1.5",
					children: PROMPTS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => send(p),
						className: "h-8 rounded-sm border border-line bg-bg px-2.5 font-mono text-[11px] text-muted hover:text-fg",
						children: p
					}, p))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "mt-3 flex gap-2",
					onSubmit: (e) => {
						e.preventDefault();
						send();
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: draft,
							onChange: (e) => setDraft(e.target.value),
							placeholder: "Utterance — USB CDC on the board, here on the host",
							className: "h-11 min-w-0 flex-1 rounded-sm border border-line bg-inset px-3 text-sm text-fg outline-none ring-phosphor/0 transition focus:border-phosphor-dim focus:ring-2 focus:ring-phosphor/20"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "outline",
							className: "w-11 px-0",
							onClick: listen,
							"aria-label": "Microphone",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: "size-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							className: "w-11 px-0",
							"aria-label": "Send",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "size-4" })
						})
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "flex flex-col gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DevicePanel, {
				volume: device?.volume ?? 0,
				brightness: device?.brightness ?? 0,
				lights: device?.lights ?? 0,
				muted: device?.muted ?? 0,
				scene: device?.scene ?? 0,
				night: device?.night ?? 0,
				timer: device?.timerRunning ? Math.floor((device.timerMs ?? 0) / 1e3) : 0,
				last: last?.intentName ?? ""
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TraceCard, {})]
		})]
	});
}
function DevicePanel({ volume, brightness, lights, muted, scene, night, timer, last }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-line bg-surface p-4 shadow-panel",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-3 flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-sm font-medium",
				children: "CoreS3 I/O"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-mono text-[10px] tracking-wider text-phosphor uppercase",
				children: lights ? "panel on" : "panel off"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto w-full max-w-[260px] rounded-xl border border-line-strong bg-inset p-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative overflow-hidden rounded-md bg-bg",
					style: {
						aspectRatio: "4 / 3",
						filter: lights ? `brightness(${.45 + brightness / 180})` : "brightness(0.25)"
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "phosphor-scan pointer-events-none absolute inset-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex h-full flex-col items-center justify-center gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-10",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "size-2.5 rounded-full bg-phosphor",
									style: { opacity: night ? .25 : .9 }
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "size-2.5 rounded-full bg-phosphor",
									style: { opacity: night ? .25 : .9 }
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "h-px w-12 bg-phosphor",
								style: { transform: last ? "scaleX(1.1)" : "scaleX(0.7)" }
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-[10px] tracking-[0.2em] text-phosphor uppercase",
								children: last || "idle"
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
						label: "volume",
						value: muted ? 0 : volume
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meter, {
						label: "brightness",
						value: lights ? brightness : 0
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-3 font-mono text-[10px] text-subtle uppercase tracking-wider",
					children: [
						"scene ",
						SCENES[scene] ?? scene,
						timer ? ` · timer ${timer}s` : "",
						muted ? " · muted" : ""
					]
				})
			]
		})]
	});
}
function Meter({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-1 flex justify-between font-mono text-[10px] text-muted uppercase",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "tabular-nums text-fg",
			children: value
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "h-1.5 overflow-hidden rounded-full bg-raised",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "meter-fill h-full bg-phosphor",
			style: { width: `${value}%` }
		})
	})] });
}
function TraceCard() {
	const last = useMorf((s) => s.last);
	if (!last) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "rounded-lg border border-line bg-surface p-4 text-sm text-muted",
		children: "Send an utterance to watch L0 pattern match, L1 spreading activation, slot parse, and tool dispatch."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-line bg-surface p-4 shadow-panel",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "mb-3 text-sm font-medium",
				children: "Cascade"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
				className: "space-y-2 font-mono text-[11px]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layer, {
						n: "L0",
						title: "pattern DFA",
						on: last.layer === 0,
						detail: last.layer === 0 ? last.intentName : "miss"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layer, {
						n: "L1",
						title: "associative sweep",
						on: last.layer === 1,
						detail: `q15 ${last.topActivation}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layer, {
						n: "L2",
						title: "context slots",
						on: last.layer === 2 || last.number > 0 || last.durationS > 0,
						detail: `n=${last.number} dur=${last.durationS}s p=${last.property}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layer, {
						n: "L3",
						title: "tool automaton",
						on: last.toolId > 0,
						detail: last.toolName
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 flex flex-wrap gap-1",
				children: last.tokens.map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "rounded-sm bg-inset px-1.5 py-0.5 font-mono text-[10px] text-muted",
					children: t.word ?? t.token
				}, i))
			}),
			last.activations.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 space-y-1",
				children: last.activations.slice(0, 5).map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "w-24 truncate font-mono text-[10px] text-muted",
						children: a.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-1 flex-1 rounded-full bg-raised",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full bg-phosphor/80",
							style: { width: `${Math.min(100, a.value / 32767 * 100 * 4)}%` }
						})
					})]
				}, a.name))
			})
		]
	});
}
function Layer({ n, title, on, detail }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		className: "flex items-baseline justify-between gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: cn("tracking-wider uppercase", on ? "text-phosphor" : "text-subtle"),
			children: [
				n,
				" ",
				title
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-muted",
			children: detail
		})]
	});
}
function Train() {
	const ontology = useMorf((s) => s.ontology);
	const addExample = useMorf((s) => s.addExample);
	const addPhrases = useMorf((s) => s.addPhrases);
	const recompile = useMorf((s) => s.recompile);
	const compiling = useMorf((s) => s.compiling);
	const [intent, setIntent] = (0, import_react.useState)("volume_down");
	const [phrase, setPhrase] = (0, import_react.useState)("");
	const [expandMsg, setExpandMsg] = (0, import_react.useState)(null);
	const [expanding, setExpanding] = (0, import_react.useState)(false);
	const current = ontology?.intents.find((i) => i.id === intent);
	async function expand() {
		if (!current) return;
		setExpanding(true);
		setExpandMsg(null);
		const r = await expandIntentPhrases({ data: {
			intent,
			phrases: current.phrases
		} });
		setExpanding(false);
		if (!r.ok) {
			setExpandMsg(r.error);
			return;
		}
		addPhrases(intent, r.phrases);
		setExpandMsg(`Added ${r.phrases.length} paraphrases. Recompile to pack them.`);
	}
	if (!ontology) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "rounded-lg border border-line bg-surface p-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mb-2 text-sm font-medium",
				children: "Intents"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "max-h-[520px] space-y-0.5 overflow-y-auto",
				children: ontology.intents.map((it) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setIntent(it.id),
					className: cn("flex h-9 w-full items-center justify-between rounded-sm px-2 text-left text-sm", it.id === intent ? "bg-raised text-fg" : "text-muted hover:text-fg"),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono text-xs",
						children: it.id
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[10px] text-subtle",
						children: it.phrases.length
					})]
				}) }, it.id))
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "rounded-lg border border-line bg-surface p-4 shadow-panel",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-medium tracking-tight",
						children: intent
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-mono text-[11px] text-muted",
						children: [
							"tool ",
							TOOL_NAMES[current?.tool ?? 0],
							" · ",
							current?.phrases.length ?? 0,
							" phrases"
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: () => void expand(),
							disabled: expanding,
							children: "Expand with Grok"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: recompile,
							disabled: compiling,
							children: "Compile image"
						})]
					})]
				}),
				expandMsg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: expandMsg
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "mt-4 flex gap-2",
					onSubmit: (e) => {
						e.preventDefault();
						addExample(intent, phrase);
						setPhrase("");
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: phrase,
						onChange: (e) => setPhrase(e.target.value),
						placeholder: "Add a training phrase",
						className: "h-11 min-w-0 flex-1 rounded-sm border border-line bg-inset px-3 text-sm outline-none focus:border-phosphor-dim"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						children: "Add"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-4 columns-1 gap-2 sm:columns-2",
					children: current?.phrases.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
						className: "mb-1 break-inside-avoid rounded-sm bg-inset px-2 py-1.5 font-mono text-xs text-muted",
						children: p
					}, p))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-6 max-w-2xl text-sm text-muted",
					children: "Training is compile-time Hebbian: each phrase becomes an L0 token pattern and strengthens concept→intent edges. No gradients. Download the trained firmware pack after compile — it is the same bytes the chip runs."
				})
			]
		})]
	});
}
function ImageView() {
	const image = useMorf((s) => s.image);
	const recompile = useMorf((s) => s.recompile);
	if (!image) return null;
	const hex = (0, import_react.useMemo)(() => {
		const n = Math.min(image.bytes.length, 192);
		const rows = [];
		for (let i = 0; i < n; i += 16) {
			const slice = [...image.bytes.subarray(i, i + 16)];
			const hexb = slice.map((b) => b.toString(16).padStart(2, "0")).join(" ");
			const ascii = slice.map((b) => b >= 32 && b < 127 ? String.fromCharCode(b) : ".").join("");
			rows.push(`${i.toString(16).padStart(4, "0")}  ${hexb.padEnd(47, " ")}  ${ascii}`);
		}
		return rows.join("\n");
	}, [image]);
	const h = image.header;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "rounded-lg border border-line bg-surface p-4 shadow-panel",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-3 flex flex-wrap items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-sm font-medium",
						children: "Packed flash image"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "outline",
								onClick: () => downloadBytes("morf.bin", image.bytes),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "size-3.5" }), " morf.bin"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								onClick: () => downloadText("morf_ontology_blob.c", blobToC(image.bytes), "text/plain"),
								children: "blob.c"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								onClick: recompile,
								children: "Rebuild"
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
					className: "overflow-x-auto rounded-md bg-inset p-3 font-mono text-[11px] leading-5 text-metal",
					children: hex
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 font-mono text-[10px] text-subtle",
					children: "Header 64 B · magic MORF · drop blob.c into firmware/src and reflash."
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "rounded-lg border border-line bg-surface p-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "mb-3 text-sm font-medium",
				children: "Layout"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "space-y-1.5 font-mono text-[11px]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "magic",
						v: "0x46524F4D"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "version",
						v: `0x${h.version.toString(16)}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "bytes",
						v: String(image.bytes.length)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "crc32",
						v: `0x${h.crc32.toString(16)}`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "vocab",
						v: `${h.vocabSize} slots`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "nodes",
						v: String(h.nodeCount)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "edges",
						v: String(h.edgeCount)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "intents",
						v: String(h.intentCount)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "patterns",
						v: String(h.patternCount)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "utterances",
						v: String(h.utteranceCount)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
						k: "strings",
						v: `${h.stringsSize} B`
					})
				]
			})]
		})]
	});
}
function Row({ k, v }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex justify-between gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
			className: "text-subtle",
			children: k
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
			className: "text-fg tabular-nums",
			children: v
		})]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lab, {});
}
//#endregion
export { Home as component };
