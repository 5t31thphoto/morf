import { useEffect, useRef, useState } from "react";
import { Box, Cable, Download, Radio, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { blobToC, downloadBytes } from "@/lib/morf/compile";
import { packFirmwareZip } from "@/lib/morf/pack-firmware";
import { useMorf } from "@/lib/morf/store";

type SerialPortLike = {
  open: (opts: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
};

export function FirmwarePanel() {
  const image = useMorf((s) => s.image);
  const ontology = useMorf((s) => s.ontology);
  const [packing, setPacking] = useState(false);
  const [packMsg, setPackMsg] = useState<string | null>(null);

  async function downloadTrained() {
    if (!image) return;
    setPacking(true);
    setPackMsg(null);
    try {
      const zip = await packFirmwareZip({
        blob: image.bytes,
        seed: ontology ? JSON.stringify(ontology, null, 2) : undefined,
      });
      downloadBytes("morf-firmware.zip", zip, "application/zip");
      setPackMsg(`Packed ${zip.length} B with the current ${image.bytes.length} B language image.`);
    } catch (e) {
      setPackMsg(e instanceof Error ? e.message : "Pack failed");
    } finally {
      setPacking(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border border-line bg-surface p-5 shadow-panel">
        <div className="mb-3 flex items-center gap-2">
          <Box className="size-4 text-phosphor" />
          <h2 className="text-lg font-medium tracking-tight">Flash pack</h2>
        </div>
        <p className="text-sm text-muted">
          Real PlatformIO firmware for M5Stack CoreS3 and generic ESP32-S3. Core 0 owns I2S DMA + USB.
          Core 1 runs the lockless NLU graph. Train here, then pack the blob into the same tree you flash.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => void downloadTrained()} disabled={packing || !image}>
            <Download className="size-4" /> {packing ? "Packing…" : "Download trained firmware"}
          </Button>
          <a
            href="/morf-firmware.zip"
            download
            className="inline-flex h-11 items-center gap-2 rounded-sm border border-line px-4 text-sm font-medium text-fg hover:bg-raised"
          >
            <Download className="size-4" /> Seed pack
          </a>
          {image && (
            <Button
              variant="outline"
              onClick={() => downloadBytes("morf_ontology_blob.c", new TextEncoder().encode(blobToC(image.bytes)), "text/plain")}
            >
              blob.c only
            </Button>
          )}
        </div>
        {packMsg && <p className="mt-2 text-sm text-muted">{packMsg}</p>}
        <ol className="mt-6 space-y-3 text-sm text-fg">
          <li><span className="font-mono text-phosphor">1.</span> Unzip. Open the folder in PlatformIO.</li>
          <li><span className="font-mono text-phosphor">2.</span> Plug CoreS3 over USB-C. Hold reset if the port does not appear.</li>
          <li>
            <span className="font-mono text-phosphor">3.</span>{" "}
            <code className="rounded-sm bg-inset px-1.5 py-0.5 font-mono text-xs">pio run -e m5stack-cores3 -t upload</code>
          </li>
          <li>
            <span className="font-mono text-phosphor">4.</span> Monitor at 115200 or connect below. Type{" "}
            <span className="font-mono text-xs">turn the music down</span>.
          </li>
          <li>
            <span className="font-mono text-phosphor">5.</span> Teach a voice one-shot:{" "}
            <span className="font-mono text-xs">/teach-voice turn the music down</span> then speak it.
          </li>
        </ol>
      </section>
      <section className="rounded-lg border border-line bg-surface p-5">
        <div className="mb-3 flex items-center gap-2">
          <Radio className="size-4 text-phosphor" />
          <h2 className="text-lg font-medium tracking-tight">CoreS3 acoustic</h2>
        </div>
        <p className="text-sm text-muted">
          Dual-mic ES7210, 16 kHz I2S DMA frames on Core 0. Energy VAD, 16-band envelope, DTW against taught
          templates. A match injects the bound phrase into the Core 1 engine — same NLU as USB CDC. Generic
          boards use INMP441 on GPIO 4/5/6.
        </p>
        <table className="mt-4 w-full font-mono text-xs">
          <tbody>
            {[
              ["I2S MCLK", "GPIO 0"],
              ["I2S BCLK", "GPIO 34"],
              ["I2S LRCK", "GPIO 33"],
              ["I2S DIN (mic)", "GPIO 14"],
              ["I2S DOUT (spk)", "GPIO 13"],
              ["I2C SDA/SCL", "GPIO 12 / 11"],
              ["ES7210", "0x40"],
              ["Inference core", "1 · lockless SPSC"],
            ].map(([k, v]) => (
              <tr key={k} className="border-t border-line">
                <td className="py-2 text-muted">{k}</td>
                <td className="py-2 text-right text-fg">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <SerialConsole />
    </div>
  );
}

function SerialConsole() {
  const [log, setLog] = useState<string>("USB CDC at 115200 — same channel the firmware reads.");
  const [draft, setDraft] = useState("turn the music down");
  const [connected, setConnected] = useState(false);
  const portRef = useRef<SerialPortLike | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);
  const runRef = useRef(false);
  const scroller = useRef<HTMLPreElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [log]);

  function append(line: string) {
    setLog((s) => (s + "\n" + line).slice(-8000));
  }

  async function connect() {
    const nav = navigator as Navigator & {
      serial?: { requestPort: () => Promise<SerialPortLike> };
    };
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
        void (async () => {
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
    } catch {
      /* already closed */
    }
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

  return (
    <section className="rounded-lg border border-line bg-surface p-5 shadow-panel lg:col-span-2">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Cable className="size-4 text-phosphor" />
          <h2 className="text-lg font-medium tracking-tight">Board console</h2>
        </div>
        <div className="flex gap-2">
          {connected ? (
            <Button variant="outline" onClick={() => void disconnect()}>
              Disconnect
            </Button>
          ) : (
            <Button variant="outline" onClick={() => void connect()}>
              <Upload className="size-4" /> Connect ESP32-S3
            </Button>
          )}
        </div>
      </div>
      <p className="mb-3 text-sm text-muted">
        Talk to a flashed board over USB CDC from this tab. The host bench above is the same engine without the chip.
      </p>
      <pre
        ref={scroller}
        className="h-48 overflow-auto rounded-md bg-inset p-3 font-mono text-[11px] leading-5 text-metal"
      >
        {log}
      </pre>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!connected}
          className="h-11 min-w-0 flex-1 rounded-sm border border-line bg-inset px-3 text-sm text-fg outline-none focus:border-phosphor-dim"
          placeholder="Utterance to the board"
        />
        <Button type="submit" disabled={!connected}>
          Send
        </Button>
      </form>
    </section>
  );
}
