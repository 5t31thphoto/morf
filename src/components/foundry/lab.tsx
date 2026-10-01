import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Binary,
  Cpu,
  Download,
  Mic,
  RotateCcw,
  Send,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FirmwarePanel } from "@/components/foundry/firmware-panel";
import { blobToC, downloadBytes, downloadText } from "@/lib/morf/compile";
import { TOOL_NAMES } from "@/lib/morf/format";
import { useMorf, type Tab } from "@/lib/morf/store";
import { expandIntentPhrases } from "@/lib/morf/expand";
import { cn } from "@/lib/utils";

const TABS: { id: Tab; label: string; icon: typeof Cpu }[] = [
  { id: "bench", label: "Bench", icon: Terminal },
  { id: "train", label: "Train", icon: Activity },
  { id: "image", label: "Image", icon: Binary },
  { id: "firmware", label: "Firmware", icon: Cpu },
];

const PROMPTS = [
  "turn the music down",
  "raise the brightness",
  "set volume to 30",
  "lights off",
  "set a timer for 3 minutes",
  "who are you",
  "too loud",
  "night mode",
  "what can you do",
];

const SCENES = ["idle", "task", "frustrated", "playful", "low", "confirm", "clarify", "night"];

export function Lab() {
  const boot = useMorf((s) => s.boot);
  const ready = useMorf((s) => s.ready);
  const error = useMorf((s) => s.error);
  const tab = useMorf((s) => s.tab);

  useEffect(() => {
    void boot();
  }, [boot]);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <Header />
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4 pb-8 pt-4 md:px-6">
        {error && (
          <p className="mb-4 rounded-md border border-fault/40 bg-fault/10 px-4 py-3 text-sm text-fault">{error}</p>
        )}
        {!ready ? (
          <p className="font-mono text-sm text-muted">Loading packed image…</p>
        ) : tab === "bench" ? (
          <Bench />
        ) : tab === "train" ? (
          <Train />
        ) : tab === "image" ? (
          <ImageView />
        ) : (
          <FirmwarePanel />
        )}
      </main>
    </div>
  );
}

function Header() {
  const tab = useMorf((s) => s.tab);
  const setTab = useMorf((s) => s.setTab);
  const image = useMorf((s) => s.image);
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-4 md:flex-row md:items-end md:justify-between md:px-6">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] text-phosphor uppercase">ESP32-S3 · M5Stack CoreS3</p>
          <h1 className="mt-1 font-sans text-3xl font-medium tracking-[-0.04em] text-fg md:text-4xl">MORF</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Mixture of Rational Forms — train the ontology, pack a flash image, run the same engine the board runs.
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          {image && (
            <p className="font-mono text-[11px] text-subtle tabular-nums">
              {image.bytes.length} B · {image.header.patternCount} patterns · {image.header.intentCount} intents
            </p>
          )}
          <nav className="flex flex-wrap gap-1 rounded-md bg-inset p-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const on = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors duration-150",
                    on ? "bg-raised text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  <Icon className="size-3.5" strokeWidth={1.75} />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

function Bench() {
  const speak = useMorf((s) => s.speak);
  const messages = useMorf((s) => s.messages);
  const last = useMorf((s) => s.last);
  const runtime = useMorf((s) => s.runtime);
  const resetDevice = useMorf((s) => s.resetDevice);
  const runEval = useMorf((s) => s.runEval);
  const evalRows = useMorf((s) => s.evalRows);
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const device = runtime?.device;

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  function send(text?: string) {
    const t = (text ?? draft).trim();
    if (!t) return;
    speak(t);
    setDraft("");
  }

  function listen() {
    const w = window as unknown as {
      webkitSpeechRecognition?: new () => { lang: string; start: () => void; onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null };
      SpeechRecognition?: new () => { lang: string; start: () => void; onresult: ((ev: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null };
    };
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

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="flex min-h-0 flex-col rounded-lg border border-line bg-surface p-3 shadow-panel md:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Host bench — same packed image as firmware</h2>
          <div className="flex gap-1">
            <Button variant="ghost" className="h-9 px-3 text-xs" onClick={resetDevice}>
              <RotateCcw className="size-3.5" /> Reset
            </Button>
            <Button variant="outline" className="h-9 px-3 text-xs" onClick={runEval}>
              Run gold set
            </Button>
          </div>
        </div>
        {pass !== null && evalRows && (
          <div className="mb-2">
            <p className="font-mono text-xs text-phosphor tabular-nums">
              {pass}/{evalRows.length} gold intents matched
            </p>
            {evalRows.some((r) => !r.pass) && (
              <ul className="mt-1 max-h-20 overflow-y-auto font-mono text-[10px] text-fault">
                {evalRows.filter((r) => !r.pass).map((r) => (
                  <li key={r.text}>{r.text} → {r.got} (want {r.expect})</li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div ref={scroller} className="min-h-[280px] flex-1 space-y-3 overflow-y-auto rounded-md bg-inset p-3">
          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[90%] rounded-md px-3 py-2 text-sm",
                  m.role === "user" && "bg-raised text-fg",
                  m.role === "morf" && "border border-phosphor-dim bg-bg text-fg",
                  m.role === "sys" && "font-mono text-xs text-subtle",
                )}
              >
                <p>{m.text}</p>
                {m.result && (
                  <p className="mt-1 font-mono text-[10px] tracking-wide text-muted uppercase">
                    {m.result.intentName || "none"} · {m.result.layer === 0 ? "L0" : m.result.layer === 2 ? "L2" : "L1"} · tool {m.result.toolName}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              className="h-8 rounded-sm border border-line bg-bg px-2.5 font-mono text-[11px] text-muted hover:text-fg"
            >
              {p}
            </button>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Utterance — USB CDC on the board, here on the host"
            className="h-11 min-w-0 flex-1 rounded-sm border border-line bg-inset px-3 text-sm text-fg outline-none ring-phosphor/0 transition focus:border-phosphor-dim focus:ring-2 focus:ring-phosphor/20"
          />
          <Button type="button" variant="outline" className="w-11 px-0" onClick={listen} aria-label="Microphone">
            <Mic className="size-4" />
          </Button>
          <Button type="submit" className="w-11 px-0" aria-label="Send">
            <Send className="size-4" />
          </Button>
        </form>
      </section>

      <aside className="flex flex-col gap-4">
        <DevicePanel
          volume={device?.volume ?? 0}
          brightness={device?.brightness ?? 0}
          lights={device?.lights ?? 0}
          muted={device?.muted ?? 0}
          scene={device?.scene ?? 0}
          night={device?.night ?? 0}
          timer={device?.timerRunning ? Math.floor((device.timerMs ?? 0) / 1000) : 0}
          last={last?.intentName ?? ""}
        />
        <TraceCard />
      </aside>
    </div>
  );
}

function DevicePanel({
  volume, brightness, lights, muted, scene, night, timer, last,
}: {
  volume: number; brightness: number; lights: number; muted: number;
  scene: number; night: number; timer: number; last: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-panel">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium">CoreS3 I/O</h3>
        <span className="font-mono text-[10px] tracking-wider text-phosphor uppercase">
          {lights ? "panel on" : "panel off"}
        </span>
      </div>
      <div className="mx-auto w-full max-w-[260px] rounded-xl border border-line-strong bg-inset p-3">
        <div
          className="relative overflow-hidden rounded-md bg-bg"
          style={{
            aspectRatio: "4 / 3",
            filter: lights ? `brightness(${0.45 + brightness / 180})` : "brightness(0.25)",
          }}
        >
          <div className="phosphor-scan pointer-events-none absolute inset-0" />
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <div className="flex gap-10">
              <span className="size-2.5 rounded-full bg-phosphor" style={{ opacity: night ? 0.25 : 0.9 }} />
              <span className="size-2.5 rounded-full bg-phosphor" style={{ opacity: night ? 0.25 : 0.9 }} />
            </div>
            <span className="h-px w-12 bg-phosphor" style={{ transform: last ? "scaleX(1.1)" : "scaleX(0.7)" }} />
            <p className="font-mono text-[10px] tracking-[0.2em] text-phosphor uppercase">{last || "idle"}</p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <Meter label="volume" value={muted ? 0 : volume} />
          <Meter label="brightness" value={lights ? brightness : 0} />
        </div>
        <p className="mt-3 font-mono text-[10px] text-subtle uppercase tracking-wider">
          scene {SCENES[scene] ?? scene}
          {timer ? ` · timer ${timer}s` : ""}
          {muted ? " · muted" : ""}
        </p>
      </div>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between font-mono text-[10px] text-muted uppercase">
        <span>{label}</span>
        <span className="tabular-nums text-fg">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-raised">
        <div className="meter-fill h-full bg-phosphor" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function TraceCard() {
  const last = useMorf((s) => s.last);
  if (!last) {
    return (
      <div className="rounded-lg border border-line bg-surface p-4 text-sm text-muted">
        Send an utterance to watch L0 pattern match, L1 spreading activation, slot parse, and tool dispatch.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-panel">
      <h3 className="mb-3 text-sm font-medium">Cascade</h3>
      <ol className="space-y-2 font-mono text-[11px]">
        <Layer n="L0" title="pattern DFA" on={last.layer === 0} detail={last.layer === 0 ? last.intentName : "miss"} />
        <Layer n="L1" title="associative sweep" on={last.layer === 1} detail={`q15 ${last.topActivation}`} />
        <Layer n="L2" title="context slots" on={last.layer === 2 || last.number > 0 || last.durationS > 0} detail={`n=${last.number} dur=${last.durationS}s p=${last.property}`} />
        <Layer n="L3" title="tool automaton" on={last.toolId > 0} detail={last.toolName} />
      </ol>
      <div className="mt-3 flex flex-wrap gap-1">
        {last.tokens.map((t, i) => (
          <span key={i} className="rounded-sm bg-inset px-1.5 py-0.5 font-mono text-[10px] text-muted">
            {t.word ?? t.token}
          </span>
        ))}
      </div>
      {last.activations.length > 0 && (
        <ul className="mt-3 space-y-1">
          {last.activations.slice(0, 5).map((a) => (
            <li key={a.name} className="flex items-center gap-2">
              <span className="w-24 truncate font-mono text-[10px] text-muted">{a.name}</span>
              <div className="h-1 flex-1 rounded-full bg-raised">
                <div className="h-full bg-phosphor/80" style={{ width: `${Math.min(100, (a.value / 32767) * 100 * 4)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Layer({ n, title, on, detail }: { n: string; title: string; on: boolean; detail: string }) {
  return (
    <li className="flex items-baseline justify-between gap-2">
      <span className={cn("tracking-wider uppercase", on ? "text-phosphor" : "text-subtle")}>
        {n} {title}
      </span>
      <span className="text-muted">{detail}</span>
    </li>
  );
}

function Train() {
  const ontology = useMorf((s) => s.ontology);
  const addExample = useMorf((s) => s.addExample);
  const addPhrases = useMorf((s) => s.addPhrases);
  const recompile = useMorf((s) => s.recompile);
  const compiling = useMorf((s) => s.compiling);
  const [intent, setIntent] = useState("volume_down");
  const [phrase, setPhrase] = useState("");
  const [expandMsg, setExpandMsg] = useState<string | null>(null);
  const [expanding, setExpanding] = useState(false);

  const current = ontology?.intents.find((i) => i.id === intent);

  async function expand() {
    if (!current) return;
    setExpanding(true);
    setExpandMsg(null);
    const r = await expandIntentPhrases({ data: { intent, phrases: current.phrases } });
    setExpanding(false);
    if (!r.ok) {
      setExpandMsg(r.error);
      return;
    }
    addPhrases(intent, r.phrases);
    setExpandMsg(`Added ${r.phrases.length} paraphrases. Recompile to pack them.`);
  }

  if (!ontology) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-lg border border-line bg-surface p-3">
        <h2 className="mb-2 text-sm font-medium">Intents</h2>
        <ul className="max-h-[520px] space-y-0.5 overflow-y-auto">
          {ontology.intents.map((it) => (
            <li key={it.id}>
              <button
                onClick={() => setIntent(it.id)}
                className={cn(
                  "flex h-9 w-full items-center justify-between rounded-sm px-2 text-left text-sm",
                  it.id === intent ? "bg-raised text-fg" : "text-muted hover:text-fg",
                )}
              >
                <span className="font-mono text-xs">{it.id}</span>
                <span className="text-[10px] text-subtle">{it.phrases.length}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="rounded-lg border border-line bg-surface p-4 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-medium tracking-tight">{intent}</h2>
            <p className="font-mono text-[11px] text-muted">
              tool {TOOL_NAMES[current?.tool ?? 0]} · {current?.phrases.length ?? 0} phrases
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void expand()} disabled={expanding}>
              Expand with Grok
            </Button>
            <Button onClick={recompile} disabled={compiling}>
              Compile image
            </Button>
          </div>
        </div>
        {expandMsg && <p className="mt-2 text-sm text-muted">{expandMsg}</p>}
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addExample(intent, phrase);
            setPhrase("");
          }}
        >
          <input
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="Add a training phrase"
            className="h-11 min-w-0 flex-1 rounded-sm border border-line bg-inset px-3 text-sm outline-none focus:border-phosphor-dim"
          />
          <Button type="submit">Add</Button>
        </form>
        <ul className="mt-4 columns-1 gap-2 sm:columns-2">
          {current?.phrases.map((p) => (
            <li key={p} className="mb-1 break-inside-avoid rounded-sm bg-inset px-2 py-1.5 font-mono text-xs text-muted">
              {p}
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-2xl text-sm text-muted">
          Training is compile-time Hebbian: each phrase becomes an L0 token pattern and strengthens concept→intent
          edges. No gradients. Download the trained firmware pack after compile — it is the same bytes the chip runs.
        </p>
      </section>
    </div>
  );
}

function ImageView() {
  const image = useMorf((s) => s.image);
  const recompile = useMorf((s) => s.recompile);
  if (!image) return null;
  const hex = useMemo(() => {
    const n = Math.min(image.bytes.length, 192);
    const rows: string[] = [];
    for (let i = 0; i < n; i += 16) {
      const slice = [...image.bytes.subarray(i, i + 16)];
      const hexb = slice.map((b) => b.toString(16).padStart(2, "0")).join(" ");
      const ascii = slice.map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : ".")).join("");
      rows.push(`${i.toString(16).padStart(4, "0")}  ${hexb.padEnd(47, " ")}  ${ascii}`);
    }
    return rows.join("\n");
  }, [image]);

  const h = image.header;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-lg border border-line bg-surface p-4 shadow-panel">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Packed flash image</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => downloadBytes("morf.bin", image.bytes)}
            >
              <Download className="size-3.5" /> morf.bin
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadText("morf_ontology_blob.c", blobToC(image.bytes), "text/plain")}
            >
              blob.c
            </Button>
            <Button onClick={recompile}>Rebuild</Button>
          </div>
        </div>
        <pre className="overflow-x-auto rounded-md bg-inset p-3 font-mono text-[11px] leading-5 text-metal">{hex}</pre>
        <p className="mt-2 font-mono text-[10px] text-subtle">
          Header 64 B · magic MORF · drop blob.c into firmware/src and reflash.
        </p>
      </section>
      <aside className="rounded-lg border border-line bg-surface p-4">
        <h3 className="mb-3 text-sm font-medium">Layout</h3>
        <dl className="space-y-1.5 font-mono text-[11px]">
          <Row k="magic" v="0x46524F4D" />
          <Row k="version" v={`0x${h.version.toString(16)}`} />
          <Row k="bytes" v={String(image.bytes.length)} />
          <Row k="crc32" v={`0x${h.crc32.toString(16)}`} />
          <Row k="vocab" v={`${h.vocabSize} slots`} />
          <Row k="nodes" v={String(h.nodeCount)} />
          <Row k="edges" v={String(h.edgeCount)} />
          <Row k="intents" v={String(h.intentCount)} />
          <Row k="patterns" v={String(h.patternCount)} />
          <Row k="utterances" v={String(h.utteranceCount)} />
          <Row k="strings" v={`${h.stringsSize} B`} />
        </dl>
      </aside>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-subtle">{k}</dt>
      <dd className="text-fg tabular-nums">{v}</dd>
    </div>
  );
}
