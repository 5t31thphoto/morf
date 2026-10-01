import { blobToC } from "./compile";
import { zipStore } from "./zip";

export type FirmwareFile = { path: string; bytes: Uint8Array };

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Missing ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

export async function packFirmwareZip(opts: {
  blob: Uint8Array;
  seed?: string;
}): Promise<Uint8Array> {
  const manifest = (await (await fetch("/firmware-src/manifest.json")).json()) as {
    files: string[];
  };
  const entries: { name: string; data: Uint8Array }[] = [];
  const encoder = new TextEncoder();
  for (const rel of manifest.files) {
    if (rel.endsWith("morf_ontology_blob.c") || rel.endsWith("morf.bin")) continue;
    const data = await fetchBytes("/firmware-src/" + rel);
    entries.push({ name: "morf-firmware/" + rel, data });
  }
  const csrc = encoder.encode(blobToC(opts.blob));
  entries.push({ name: "morf-firmware/src/morf_ontology_blob.c", data: csrc });
  entries.push({ name: "morf-firmware/data/morf_ontology_blob.c", data: csrc });
  entries.push({ name: "morf-firmware/data/morf.bin", data: opts.blob });
  if (opts.seed) {
    entries.push({ name: "morf-firmware/ontology/seed.json", data: encoder.encode(opts.seed) });
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  return zipStore(entries);
}
