import { describe, expect, it } from "vitest";

import {
  detectImageMimeType,
  fileWithVerifiedImageType,
} from "@/utils/imageMagic";
import { sanitizePng, sanitizePngBytes } from "@/utils/sanitizePng";

// ── Characterization: frontend image acceptance and PNG sanitization ─────────
// The Studio's upload path re-derives a file's Content-Type from its magic
// bytes (imageMagic) and then runs the PNG-only chunk sanitizer (sanitizePng).
// This suite protects the *frontend* half of the image-acceptance contract:
//   - JPEGs are recognized by their SOI magic bytes and passed through the
//     sanitizer byte-for-byte, including JPEGs that carry metadata segments
//     (APP1/EXIF, APP13/IPTC, APP14/Adobe, COM). The frontend must NOT strip
//     or reject those segments — that decision belongs to the backend.
//   - PNGs still have non-allowlisted chunks stripped (the pre-existing
//     sanitizer behavior that keeps the backend PNG validator happy).
//   - Non-image bytes are rejected so the caller can show a clear message.
// It deliberately does NOT assert the backend's JPEG marker policy, which the
// current request intentionally changes.

/** Build a JPEG byte stream: SOI + optional metadata segments + EOI. */
function jpegWithSegments(segments: Array<{ tag: number; payload: number[] }>) {
  const bytes: number[] = [0xff, 0xd8]; // SOI
  for (const { tag, payload } of segments) {
    const segLen = payload.length + 2; // length field includes its own 2 bytes
    bytes.push(0xff, tag, (segLen >> 8) & 0xff, segLen & 0xff, ...payload);
  }
  bytes.push(0xff, 0xd9); // EOI
  return new Uint8Array(bytes);
}

/** Build a PNG chunk: 4-byte BE length + 4-byte type + data + 4-byte CRC. */
function pngChunk(type: string, data: number[]): number[] {
  const len = data.length;
  const typeBytes = Array.from(type).map((c) => c.charCodeAt(0));
  return [
    (len >>> 24) & 0xff,
    (len >>> 16) & 0xff,
    (len >>> 8) & 0xff,
    len & 0xff,
    ...typeBytes,
    ...data,
    0x00,
    0x00,
    0x00,
    0x00, // CRC (not validated by the sanitizer)
  ];
}

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function pngWithChunks(chunks: Array<{ type: string; data: number[] }>) {
  const bytes = [...PNG_SIG];
  for (const c of chunks) bytes.push(...pngChunk(c.type, c.data));
  return new Uint8Array(bytes);
}

describe("detectImageMimeType", () => {
  it("recognizes a JPEG by its SOI magic bytes", () => {
    // detectImageMimeType requires at least 12 bytes, so the fixture carries a
    // realistic APP0/JFIF payload rather than a bare SOI+EOI pair.
    const jpeg = jpegWithSegments([
      { tag: 0xe0, payload: [0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00] },
    ]);
    expect(detectImageMimeType(jpeg)).toBe("image/jpeg");
  });

  it("recognizes a JPEG that carries an APP1/EXIF metadata segment", () => {
    const jpeg = jpegWithSegments([
      { tag: 0xe1, payload: [0x45, 0x78, 0x69, 0x66, 0x00, 0x00] }, // "Exif\0\0"
    ]);
    expect(detectImageMimeType(jpeg)).toBe("image/jpeg");
  });

  it("recognizes a PNG by its signature", () => {
    const png = pngWithChunks([{ type: "IHDR", data: new Array(13).fill(0) }]);
    expect(detectImageMimeType(png)).toBe("image/png");
  });

  it("returns null for non-image bytes", () => {
    const notAnImage = new Uint8Array([
      0x3c, 0x73, 0x76, 0x67, 0x3e, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]); // "<svg>..."
    expect(detectImageMimeType(notAnImage)).toBeNull();
  });
});

describe("fileWithVerifiedImageType", () => {
  it("accepts a JPEG with an APP1/EXIF segment and keeps its bytes intact", async () => {
    const bytes = jpegWithSegments([
      { tag: 0xe1, payload: [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x01, 0x02] },
    ]);
    const file = new File([bytes], "photo.jpg", { type: "image/jpeg" });

    const verified = await fileWithVerifiedImageType(file);

    expect(verified).not.toBeNull();
    expect(verified?.type).toBe("image/jpeg");
    // The frontend must not rewrite or strip the EXIF segment.
    expect(new Uint8Array(await verified!.arrayBuffer())).toEqual(bytes);
  });

  it("rejects a non-image file so the caller can show a clear message", async () => {
    const file = new File([new Uint8Array([0x00, 0x01, 0x02, 0x03])], "x.bin", {
      type: "application/octet-stream",
    });
    await expect(fileWithVerifiedImageType(file)).resolves.toBeNull();
  });
});

describe("sanitizePng pass-through for JPEG metadata", () => {
  it("returns a JPEG with APP1/EXIF unchanged", async () => {
    const bytes = jpegWithSegments([
      { tag: 0xe1, payload: [0x45, 0x78, 0x69, 0x66, 0x00, 0x00] },
    ]);
    const file = new File([bytes], "photo.jpg", { type: "image/jpeg" });

    const out = await sanitizePng(file);

    expect(out).toBe(file);
    expect(new Uint8Array(await out.arrayBuffer())).toEqual(bytes);
  });

  it("returns a JPEG with APP13/IPTC, APP14/Adobe, and COM segments unchanged", async () => {
    const bytes = jpegWithSegments([
      { tag: 0xed, payload: [0x50, 0x68, 0x6f, 0x74, 0x6f] }, // APP13/IPTC
      { tag: 0xee, payload: [0x41, 0x64, 0x6f, 0x62, 0x65] }, // APP14/Adobe
      { tag: 0xfe, payload: [0x48, 0x65, 0x6c, 0x6c, 0x6f] }, // COM
    ]);
    const file = new File([bytes], "photo.jpg", { type: "image/jpeg" });

    const out = await sanitizePng(file);

    expect(out).toBe(file);
    expect(new Uint8Array(await out.arrayBuffer())).toEqual(bytes);
  });

  it("returns a JPEG carrying the full APP3-APP15 metadata range unchanged", async () => {
    // Every APPn marker from APP3 (0xE3) through APP15 (0xEF) is accepted and
    // passed through byte-for-byte; the frontend must not strip or reject them.
    const segments: { tag: number; payload: number[] }[] = [];
    for (let tag = 0xe3; tag <= 0xef; tag++) {
      segments.push({ tag, payload: [tag, 0x00, 0x01] });
    }
    const bytes = jpegWithSegments(segments);
    const file = new File([bytes], "photo.jpg", { type: "image/jpeg" });

    const out = await sanitizePng(file);

    expect(out).toBe(file);
    expect(new Uint8Array(await out.arrayBuffer())).toEqual(bytes);
  });

  it("returns a JPEG with trailing bytes after EOI unchanged", async () => {
    const base = jpegWithSegments([{ tag: 0xe0, payload: [0x00, 0x10] }]);
    const bytes = new Uint8Array([...base, 0x41, 0x42, 0x43]);
    const file = new File([bytes], "photo.jpg", { type: "image/jpeg" });

    const out = await sanitizePng(file);

    expect(out).toBe(file);
    expect(new Uint8Array(await out.arrayBuffer())).toEqual(bytes);
  });
});

describe("sanitizePngBytes PNG chunk filtering (unchanged behavior)", () => {
  it("strips a non-allowlisted tEXt chunk while keeping IHDR/IDAT/IEND", () => {
    const png = pngWithChunks([
      { type: "IHDR", data: new Array(13).fill(0) },
      { type: "tEXt", data: [0x6b, 0x65, 0x79, 0x00, 0x76] },
      { type: "IDAT", data: [0x78, 0x9c, 0x00] },
      { type: "IEND", data: [] },
    ]);

    const out = sanitizePngBytes(png);

    expect(out).not.toBe(png);
    expect(out.length).toBeLessThan(png.length);
    // Signature preserved.
    expect(Array.from(out.subarray(0, 8))).toEqual(PNG_SIG);
    // The dropped chunk type must not appear in the output.
    const asText = String.fromCharCode(...out);
    expect(asText).not.toContain("tEXt");
    expect(asText).toContain("IHDR");
    expect(asText).toContain("IDAT");
    expect(asText).toContain("IEND");
  });

  it("returns a PNG with only allowlisted chunks unchanged", () => {
    const png = pngWithChunks([
      { type: "IHDR", data: new Array(13).fill(0) },
      { type: "IDAT", data: [0x78, 0x9c, 0x00] },
      { type: "IEND", data: [] },
    ]);

    expect(sanitizePngBytes(png)).toBe(png);
  });

  it("returns malformed/truncated PNG bytes unchanged (never throws)", () => {
    const truncated = new Uint8Array([...PNG_SIG, 0x00, 0x00]);
    expect(sanitizePngBytes(truncated)).toBe(truncated);
  });
});
