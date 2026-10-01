import { create } from "zustand";
import seedJson from "../../../ontology/seed.json";
import { compileOntology, type Ontology } from "./compile";
import { createRuntime, type MorfRuntime, type ProcessResult } from "./engine";
import { parseImage, type MorfImage } from "./format";
import { GOLDEN } from "./eval";

export type Tab = "bench" | "train" | "image" | "firmware";

export type ChatMsg = {
  id: string;
  role: "user" | "morf" | "sys";
  text: string;
  result?: ProcessResult;
};

type EvalRow = { text: string; expect: string; got: string; pass: boolean };

type State = {
  tab: Tab;
  ready: boolean;
  error: string | null;
  runtime: MorfRuntime | null;
  image: MorfImage | null;
  ontology: Ontology | null;
  messages: ChatMsg[];
  last: ProcessResult | null;
  evalRows: EvalRow[] | null;
  compiling: boolean;
  expanding: boolean;
  setTab: (t: Tab) => void;
  boot: () => Promise<void>;
  speak: (text: string) => void;
  resetDevice: () => void;
  addExample: (intent: string, text: string) => void;
  removeExample: (index: number) => void;
  addPhrases: (intent: string, phrases: string[]) => void;
  recompile: () => void;
  runEval: () => void;
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function fromOntology(ontology: Ontology) {
  const { blob } = compileOntology(ontology);
  const image = parseImage(blob);
  const runtime = createRuntime(image);
  return { ontology, image, runtime };
}

const seed = seedJson as Ontology;

function initialClient() {
  try {
    const { ontology, image, runtime } = fromOntology(seed);
    return {
      ready: true as const,
      error: null as string | null,
      ontology,
      image,
      runtime,
      messages: [
        {
          id: "boot",
          role: "sys" as const,
          text: `Image ${image.bytes.length} B · ${image.header.intentCount} intents · ${image.header.patternCount} patterns · crc 0x${image.header.crc32.toString(16)}`,
        },
      ],
    };
  } catch (e) {
    return {
      ready: false as const,
      error: e instanceof Error ? e.message : "boot failed",
      ontology: null,
      image: null,
      runtime: null,
      messages: [] as ChatMsg[],
    };
  }
}

const seeded = initialClient();

export const useMorf = create<State>((set, get) => ({
  tab: "bench",
  ready: seeded.ready,
  error: seeded.error,
  runtime: seeded.runtime,
  image: seeded.image,
  ontology: seeded.ontology,
  messages: seeded.messages,
  last: null,
  evalRows: null,
  compiling: false,
  expanding: false,
  setTab: (tab) => set({ tab }),

  boot: async () => {
    if (get().ready && get().runtime) return;
    try {
      const [binRes, seedRes] = await Promise.all([
        fetch("/ontology/morf.bin"),
        fetch("/ontology/seed.json"),
      ]);
      if (!binRes.ok) throw new Error("Missing packed image /ontology/morf.bin");
      const bytes = new Uint8Array(await binRes.arrayBuffer());
      const image = parseImage(bytes);
      const ontology = (await seedRes.json()) as Ontology;
      const runtime = createRuntime(image);
      set({
        ready: true,
        image,
        ontology,
        runtime,
        error: null,
        messages: [
          {
            id: uid(),
            role: "sys" as const,
            text: `Image ${image.bytes.length} B · ${image.header.intentCount} intents · ${image.header.patternCount} patterns · crc 0x${image.header.crc32.toString(16)}`,
          },
        ],
      });
    } catch (e) {
      if (get().ready) return;
      set({ error: e instanceof Error ? e.message : "boot failed", ready: false });
    }
  },

  speak: (text) => {
    const t = text.trim();
    if (!t) return;
    const { runtime } = get();
    if (!runtime) return;
    const result = runtime.process(t);
    const userMsg: ChatMsg = { id: uid(), role: "user", text: t };
    const morfMsg: ChatMsg = { id: uid(), role: "morf", text: result.response, result };
    set((s) => ({
      last: result,
      messages: [...s.messages, userMsg, morfMsg].slice(-80),
    }));
  },

  resetDevice: () => {
    get().runtime?.resetDevice();
    set({ last: null });
  },

  addExample: (intent, text) => {
    const { ontology } = get();
    if (!ontology || !text.trim()) return;
    const next = {
      ...ontology,
      examples: [...ontology.examples, { intent, text: text.trim() }],
      intents: ontology.intents.map((it) =>
        it.id === intent && !it.phrases.includes(text.trim())
          ? { ...it, phrases: [...it.phrases, text.trim()] }
          : it,
      ),
    };
    set({ ontology: next });
  },

  removeExample: (index) => {
    const { ontology } = get();
    if (!ontology) return;
    set({ ontology: { ...ontology, examples: ontology.examples.filter((_, i) => i !== index) } });
  },

  addPhrases: (intent, phrases) => {
    const { ontology } = get();
    if (!ontology) return;
    const extra = phrases.filter(Boolean);
    set({
      ontology: {
        ...ontology,
        intents: ontology.intents.map((it) =>
          it.id === intent
            ? { ...it, phrases: [...new Set([...it.phrases, ...extra])] }
            : it,
        ),
        examples: [
          ...ontology.examples,
          ...extra.map((text) => ({ intent, text })),
        ],
      },
    });
  },

  recompile: () => {
    const { ontology } = get();
    if (!ontology) return;
    set({ compiling: true, error: null });
    try {
      const { blob } = compileOntology(ontology);
      const image = parseImage(blob);
      const runtime = createRuntime(image);
      set({
        compiling: false,
        image,
        runtime,
        last: null,
        evalRows: null,
        messages: [
          {
            id: uid(),
            role: "sys" as const,
            text: `Recompiled ${blob.length} B · ${image.header.patternCount} patterns · crc 0x${image.header.crc32.toString(16)}`,
          },
        ],
      });
    } catch (e) {
      set({ compiling: false, error: e instanceof Error ? e.message : "compile failed" });
    }
  },

  runEval: () => {
    const { runtime } = get();
    if (!runtime) return;
    runtime.resetDevice();
    const rows = GOLDEN.map((g) => {
      runtime.resetDevice();
      const r = runtime.process(g.text);
      return { text: g.text, expect: g.intent, got: r.intentName || "(none)", pass: r.intentName === g.intent };
    });
    set({ evalRows: rows });
  },
}));
