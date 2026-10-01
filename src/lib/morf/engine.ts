import {
  AMBIGUITY_MARGIN_LIMIT,
  DURATION_TOKEN,
  FLAG_PIVOT,
  FLAG_STOPWORD,
  FLAG_UNIT,
  INTENT_CONFIDENCE_THRESHOLD,
  KIND_DIRECTION,
  KIND_INTENT,
  KIND_PROPERTY,
  NUMBER_TOKEN,
  NUMBER_WORDS,
  TOOL,
  TOOL_NAMES,
  murmur3,
  parseImage,
  q15AddSat,
  q15Mul,
  readCString,
  type MorfImage,
} from "./format";

export type MorfToken = { token: number; value: number; flags: number; conceptId: number; word?: string };

export type DeviceState = {
  volume: number;
  brightness: number;
  lights: number;
  muted: number;
  musicPlaying: number;
  night: number;
  timerMs: number;
  timerRunning: number;
  lastTarget: number;
  lastIntent: number;
  scene: number;
  pendingIntent: number;
};

export type ProcessResult = {
  raw: string;
  intentId: number;
  intentName: string;
  toolId: number;
  toolName: string;
  layer: number;
  ambiguous: boolean;
  needClarify: boolean;
  confidence: number;
  number: number;
  durationS: number;
  direction: number;
  property: number;
  response: string;
  tokens: MorfToken[];
  topIntent: string;
  runnerIntent: string;
  topActivation: number;
  runnerActivation: number;
  activations: { name: string; value: number }[];
  device: DeviceState;
};

const PROP = { NONE: 0, VOLUME: 1, BRIGHT: 2, LIGHTS: 3, TIMER: 4, MUSIC: 5 };

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function createRuntime(image: MorfImage) {
  const graph = image.nodes.map((n) => ({
    id: n.id,
    kind: n.kind,
    tag: n.bias,
    activation: 0,
    edges: Array.from({ length: n.edgeCount }, (_, i) => {
      const e = image.edges[n.firstEdge + i]!;
      return { target: e.target, weight: e.weight };
    }),
  }));

  const device: DeviceState = {
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
    pendingIntent: 0,
  };

  function intentName(id: number): string {
    const it = image.intents.find((x) => x.conceptId === id);
    if (!it) return "";
    return readCString(image.strings, it.nameOff, it.nameLen);
  }

  function lookup(word: string): { token: number; concept: number; flags: number } | null {
    const h = murmur3(word);
    let idx = h % image.header.vocabSize;
    for (let p = 0; p < 64; p++) {
      const e = image.vocab[idx]!;
      if (e.hash === 0) return null;
      if (e.hash === h) return { token: idx, concept: e.concept, flags: e.flags };
      idx = (idx + 1) % image.header.vocabSize;
    }
    return null;
  }

  function tokenize(text: string): MorfToken[] {
    const out: MorfToken[] = [];
    for (const w of tokenizeWords(text)) {
      if (/^\d+$/.test(w)) {
        out.push({ token: NUMBER_TOKEN, value: clamp(parseInt(w, 10), 0, 10000), flags: 4, conceptId: 0, word: w });
        continue;
      }
      if (w in NUMBER_WORDS) {
        out.push({ token: NUMBER_TOKEN, value: NUMBER_WORDS[w]!, flags: 4, conceptId: 0, word: w });
        continue;
      }
      const hit = lookup(w);
      if (!hit) continue;
      if (hit.flags & FLAG_UNIT) {
        const mul = w.startsWith("m") && w.includes("in") ? 60 : w.startsWith("h") ? 3600 : 1;
        out.push({ token: DURATION_TOKEN, value: mul, flags: FLAG_UNIT, conceptId: hit.concept, word: w });
        continue;
      }
      out.push({ token: hit.token, value: 0, flags: hit.flags, conceptId: hit.concept, word: w });
    }
    return out;
  }

  function reset() {
    for (const n of graph) n.activation = 0;
  }

  function inject(concept: number, charge: number) {
    if (!concept || concept >= graph.length) return;
    graph[concept]!.activation = q15AddSat(graph[concept]!.activation, charge);
  }

  function sweep() {
    const snapshot = graph.map((n) => n.activation);
    for (let i = 0; i < graph.length; i++) {
      const src = snapshot[i]!;
      if (src < 0x0400) continue;
      for (const e of graph[i]!.edges) {
        if (e.target >= graph.length) continue;
        graph[e.target]!.activation = q15AddSat(graph[e.target]!.activation, q15Mul(src, e.weight));
      }
    }
  }

  function resolveIntents() {
    let top = 0, ta = 0, runner = 0, ra = 0;
    const acts: { name: string; value: number }[] = [];
    for (const n of graph) {
      if (n.kind !== KIND_INTENT) continue;
      const name = intentName(n.id) || `#${n.id}`;
      if (n.activation > 0) acts.push({ name, value: n.activation });
      if (n.activation > ta) {
        ra = ta; runner = top;
        ta = n.activation; top = n.id;
      } else if (n.activation > ra) {
        ra = n.activation; runner = n.id;
      }
    }
    acts.sort((a, b) => b.value - a.value);
    return { top, ta, runner, ra, acts: acts.slice(0, 8) };
  }

  function matchPatterns(toks: MorfToken[]): { hits: number; intent: number } {
    const seq = toks.filter((t) => !(t.flags & FLAG_STOPWORD)).map((t) => t.token);
    let hits = 0;
    let found = 0;
    for (const p of image.patterns) {
      if (p.tokens.length !== seq.length || seq.length === 0) continue;
      let ok = true;
      for (let i = 0; i < seq.length; i++) if (p.tokens[i] !== seq[i]) { ok = false; break; }
      if (ok) {
        found = p.intentId;
        hits++;
      }
    }
    return { hits, intent: found };
  }

  function propertyFromName(name: string): number {
    if (name.includes("volume") || name === "mute" || name === "unmute") return PROP.VOLUME;
    if (name.includes("bright")) return PROP.BRIGHT;
    if (name.includes("light")) return PROP.LIGHTS;
    if (name.includes("timer")) return PROP.TIMER;
    if (name === "play" || name === "pause" || name === "skip") return PROP.MUSIC;
    if (name.includes("night") || name.includes("day")) return PROP.BRIGHT;
    return PROP.NONE;
  }

  function directionFromName(name: string): number {
    if (name.includes("_up") || name === "unmute") return 1;
    if (name.includes("_down") || name === "mute") return -1;
    return 0;
  }

  function pickUtterance(intent: number): string {
    const pool = image.utterances.filter((u) => u.intentId === intent);
    if (!pool.length) return "Okay.";
    const u = pool[(device.volume * 17 + intent * 13) % pool.length]!;
    let s = readCString(image.strings, u.strOff, u.strLen);
    s = s.replaceAll("{volume}", String(device.volume));
    s = s.replaceAll("{brightness}", String(device.brightness));
    s = s.replaceAll("{lights}", device.lights ? "on" : "off");
    s = s.replaceAll("{duration}", String(Math.floor(device.timerMs / 1000)));
    s = s.replaceAll("{remaining}", String(Math.floor(device.timerMs / 1000)));
    return s;
  }

  function applyTool(r: { toolId: number; intentName: string; number: number; durationS: number; direction: number }) {
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
        device.timerMs = sec * 1000;
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
      case TOOL.NIGHT:
        if (r.intentName.includes("day")) {
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
        break;
      default:
        break;
    }
  }

  function parseSlots(toks: MorfToken[], intentNameStr: string) {
    let number = 0;
    let durationS = 0;
    let pending = -1;
    let property = propertyFromName(intentNameStr);
    let direction = directionFromName(intentNameStr);
    let sawPivot = false;
    for (const t of toks) {
      if (t.flags & FLAG_PIVOT) sawPivot = true;
      if (t.token === NUMBER_TOKEN) {
        pending = t.value;
        if (!number) number = t.value;
      } else if (t.token === DURATION_TOKEN) {
        const mul = t.value > 0 ? t.value : 1;
        const base = pending >= 0 ? pending : number > 0 ? number : 1;
        durationS = clamp(base * mul, 1, 36000);
        pending = -1;
      } else if (t.conceptId && t.conceptId < graph.length) {
        const node = graph[t.conceptId]!;
        if (node.kind === KIND_PROPERTY && node.tag > 0) property = node.tag;
        if (node.kind === KIND_DIRECTION) {
          if (node.tag > 0) direction = node.tag === 2 ? 0 : 1;
          else if (node.tag < 0) direction = -1;
        }
      }
    }
    if (sawPivot && device.lastTarget) property = device.lastTarget;
    return { number, durationS, direction, property, sawPivot };
  }

  function remapAdj(prop: number, dir: number): number {
    const want =
      prop === PROP.VOLUME ? (dir < 0 ? "volume_down" : "volume_up")
      : prop === PROP.BRIGHT ? (dir < 0 ? "bright_down" : "bright_up")
      : prop === PROP.LIGHTS ? (dir < 0 ? "lights_off" : "lights_on")
      : prop === PROP.MUSIC ? (dir < 0 ? "pause" : "play")
      : "";
    if (!want) return 0;
    return image.intents.find((x) => readCString(image.strings, x.nameOff, x.nameLen) === want)?.conceptId ?? 0;
  }

  function bindIntent(toks: MorfToken[], r: {
    intentId: number; intentName: string; toolId: number; layer: number;
    number: number; durationS: number; direction: number; property: number;
    needClarify: boolean; response?: string;
  }) {
    const slots = parseSlots(toks, r.intentName);
    r.number = slots.number;
    r.durationS = slots.durationS;
    r.direction = slots.direction;
    r.property = slots.property;

    if ((r.intentName === "deny" || r.intentName === "cancel") && device.pendingIntent) {
      device.pendingIntent = 0;
      r.toolId = 0;
      r.intentId = 0;
      return { wait: true as const, response: "Cancelled." };
    }
    if (r.intentName === "confirm" && device.pendingIntent) {
      const held = device.pendingIntent;
      device.pendingIntent = 0;
      r.intentId = held;
      r.intentName = intentName(held);
      r.toolId = image.intents.find((x) => x.conceptId === held)?.toolId ?? 0;
      const again = parseSlots(toks, r.intentName);
      r.number = again.number; r.durationS = again.durationS;
      r.direction = again.direction; r.property = again.property;
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

    const it = image.intents.find((x) => x.conceptId === r.intentId);
    const mask = it?.slotMask ?? 0;
    if (r.intentId && (r.toolId === TOOL.SET_VOLUME || r.toolId === TOOL.SET_BRIGHT) && r.number <= 0) {
      device.pendingIntent = r.intentId;
      r.needClarify = true;
      return { wait: true as const, response: r.toolId === TOOL.SET_VOLUME ? "What volume?" : "What brightness?" };
    }
    if (r.intentId && r.toolId === TOOL.TIMER_SET && r.durationS <= 0 && r.number <= 0 && (mask & 16)) {
      device.pendingIntent = r.intentId;
      r.needClarify = true;
      return { wait: true as const, response: "For how long?" };
    }
    return { wait: false as const };
  }

  function process(text: string): ProcessResult {
    reset();
    const tokens = tokenize(text);
    for (const t of tokens) {
      if (t.flags & FLAG_STOPWORD) continue;
      if (t.conceptId) inject(t.conceptId, 0x4000);
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
      conf = 0x7000;
    } else if (pat.hits > 1 && pat.intent) {
      chosen = pat.intent;
      layer = 0;
      ambiguous = true;
      conf = 0x5000;
    } else {
      chosen = top;
      if (ta < INTENT_CONFIDENCE_THRESHOLD) chosen = 0;
      else if (ta > 0 && ta - ra < AMBIGUITY_MARGIN_LIMIT) {
        ambiguous = true;
        if (device.lastTarget !== PROP.VOLUME && device.lastTarget !== PROP.BRIGHT) needClarify = true;
      }
    }

    const name = chosen ? intentName(chosen) : "";
    const it = image.intents.find((x) => x.conceptId === chosen);
    const toolId = it?.toolId ?? 0;
    const bound = {
      intentId: chosen,
      intentName: name,
      toolId,
      layer,
      number: 0,
      durationS: 0,
      direction: 0,
      property: 0,
      needClarify,
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
      activations: acts,
    };

    function sceneFor(r: { needClarify: boolean; intentId: number; toolId: number; intentName: string }) {
      if (r.needClarify || !r.intentId) {
        device.scene = device.scene === 6 ? 2 : 6;
        return;
      }
      if (r.toolId === TOOL.NIGHT) device.scene = device.night ? 7 : 1;
      else if (r.toolId === TOOL.SPEAK) device.scene = r.intentName.includes("smalltalk") || r.intentName.includes("greet") ? 0 : 1;
      else if (r.toolId !== TOOL.NONE) device.scene = 1;
    }

    if (ctx.wait) {
      sceneFor({ needClarify: true, intentId: chosen, toolId: bound.toolId, intentName: bound.intentName });
      return { ...resultBase, response: ctx.response ?? "Volume or brightness?", device: { ...device } };
    }
    if (needClarify && chosen) {
      device.scene = 6;
      return { ...resultBase, response: "Volume or brightness?", device: { ...device } };
    }
    if (!chosen) {
      sceneFor({ needClarify: true, intentId: 0, toolId: 0, intentName: "" });
      return { ...resultBase, response: "Sorry, I didn't get that.", device: { ...device } };
    }

    applyTool({ toolId: bound.toolId, intentName: bound.intentName, number: bound.number, durationS: bound.durationS, direction: bound.direction });
    const response = pickUtterance(chosen);
    device.lastIntent = chosen;
    sceneFor({ needClarify: false, intentId: chosen, toolId: bound.toolId, intentName: bound.intentName });

    return { ...resultBase, durationS: device.lastTarget === PROP.TIMER ? Math.floor(device.timerMs / 1000) : bound.durationS, response, device: { ...device } };
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
    },
  };
}

export type MorfRuntime = ReturnType<typeof createRuntime>;

export async function loadPackedImage(url = "/ontology/morf.bin"): Promise<MorfImage> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load MORF image (${res.status})`);
  const buf = new Uint8Array(await res.arrayBuffer());
  return parseImage(buf);
}
