import { crc32 } from "./format";

function u16(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff];
}
function u32(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
}

export type ZipEntry = { name: string; data: Uint8Array };

/** Uncompressed ZIP (STORE). Deterministic, no extra fields. */
export function zipStore(files: ZipEntry[]): Uint8Array {
  const locals: number[] = [];
  const central: number[] = [];
  for (const f of files) {
    const name = new TextEncoder().encode(f.name.replaceAll("\\", "/"));
    const data = f.data;
    const crc = crc32(data);
    const offset = locals.length;
    locals.push(
      ...u32(0x04034b50),
      ...u16(20),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(crc),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(name.length),
      ...u16(0),
    );
    locals.push(...name, ...data);
    central.push(
      ...u32(0x02014b50),
      ...u16(20),
      ...u16(20),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(crc),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(name.length),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u16(0),
      ...u32(0),
      ...u32(offset),
    );
    central.push(...name);
  }
  const cdOff = locals.length;
  const eocd = [
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(files.length),
    ...u16(files.length),
    ...u32(central.length),
    ...u32(cdOff),
    ...u16(0),
  ];
  return Uint8Array.from([...locals, ...central, ...eocd]);
}
