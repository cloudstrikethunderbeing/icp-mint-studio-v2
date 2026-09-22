/**
 * Client-side PNG chunk sanitizer.
 *
 * Walks the PNG chunk structure and rebuilds the image keeping ONLY the
 * allowlisted chunk types below. Every other chunk type — including zTXt,
 * tEXt, iTXt, iCCP, sPLT, caBX, and any unknown chunk — is dropped.
 *
 * This allowlist MIRRORS the backend validator `validatePngChunks` in
 * `src/backend/lib/nft.mo` (line 649). The backend stays exactly as strict;
 * this sanitizer is a pure client-side pre-filter that strips disallowed
 * chunks BEFORE upload so the backend validator does not reject the file.
 * If the two ever drift, the backend is authoritative — do NOT broaden the
 * backend allowlist.
 *
 * Allowed chunk types (must match backend exactly):
 *   IHDR, PLTE, IDAT, IEND, tRNS, gAMA, cHRM, sRGB, pHYs, bKGD, tIME
 *
 * Behavior contract:
 *   - Preserves the 8-byte PNG signature (89 50 4E 47 0D 0A 1A 0A).
 *   - Preserves IHDR-first / IEND-last ordering (it copies chunks in the
 *     order they appear, only dropping disallowed types; a well-formed PNG
 *     already has IHDR first and IEND last, so this holds).
 *   - Copies each retained chunk's length + type + data + CRC together
 *     unchanged. Because the bytes are unchanged, the existing CRC remains
 *     valid — no recomputation is needed. (A straight copy of length, type,
 *     data, and CRC as a contiguous block is correct.)
 *   - Does NOT re-encode or re-compress the image. It is a pure chunk
 *     filter operating on the raw bytes.
 *   - Non-destructive for non-PNG inputs: if the input is JPEG or WebP (or
 *     not a PNG by signature check), returns the bytes/File unchanged.
 *   - Safe on malformed PNGs: if the chunk structure is truncated or
 *     unparseable, returns the input unchanged (lets the backend validator
 *     reject it — never throws).
 */

/** PNG signature: 89 50 4E 47 0D 0A 1A 0A */
const PNG_SIGNATURE = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/**
 * The set of PNG chunk types this sanitizer retains. Mirrors the backend
 * `validatePngChunks` allowlist in src/backend/lib/nft.mo. Do NOT add to
 * this set without also updating the backend (and even then, the backend
 * stays authoritative — see file header).
 */
const ALLOWED_CHUNK_TYPES = new Set<string>([
  "IHDR",
  "PLTE",
  "IDAT",
  "IEND",
  "tRNS",
  "gAMA",
  "cHRM",
  "sRGB",
  "pHYs",
  "bKGD",
  "tIME",
]);

/** Read a 4-byte big-endian unsigned integer from `bytes` at `offset`. */
function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>>
    0
  );
}

/** Decode 4 ASCII bytes at `offset` into a chunk type string. */
function readChunkType(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3],
  );
}

/**
 * Returns true iff `bytes` starts with the PNG signature.
 */
function isPng(bytes: Uint8Array): boolean {
  if (bytes.length < PNG_SIGNATURE.length) return false;
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return false;
  }
  return true;
}

/**
 * Sanitize a PNG byte array by dropping every non-allowlisted chunk.
 *
 * - Non-PNG input (by signature check) is returned unchanged.
 * - Malformed/truncated PNG structure is returned unchanged (never throws).
 * - Each retained chunk's length + type + data + CRC are copied together
 *   unchanged, so the existing CRC remains valid.
 *
 * @param input - Raw image bytes (PNG, JPEG, WebP, or anything else).
 * @returns The sanitized bytes (a new Uint8Array for PNGs, or the same
 *   reference for non-PNG / malformed input).
 */
export function sanitizePngBytes(input: Uint8Array): Uint8Array {
  // Pass-through for non-PNG inputs (JPEG, WebP, or anything that does not
  // carry the PNG signature). The backend validator only runs on PNGs, so
  // non-PNGs are unaffected by chunk filtering.
  if (!isPng(input)) {
    return input;
  }

  // Walk the chunk stream. Each chunk is:
  //   4 bytes length (big-endian, data length only — does NOT include
  //     the type or CRC)
  //   4 bytes type (ASCII)
  //   <length> bytes data
  //   4 bytes CRC32 (over type + data)
  // So a chunk occupies 12 + length bytes total.
  const SIG_LEN = PNG_SIGNATURE.length;
  const CHUNK_HEADER_LEN = 4; // length field
  const CHUNK_TYPE_LEN = 4; // type field
  const CHUNK_CRC_LEN = 4; // trailing CRC

  // Collect retained chunk byte ranges (start, end) into `kept` so we can
  // allocate one output buffer and copy each retained chunk in a single
  // contiguous memcpy. Copying length+type+data+CRC together preserves the
  // existing CRC (bytes unchanged → CRC still valid).
  const kept: Array<{ start: number; end: number }> = [];
  let offset = SIG_LEN;
  let sawIend = false;

  while (offset < input.length) {
    // Need at least the 4-byte length + 4-byte type to read a chunk header.
    if (offset + CHUNK_HEADER_LEN + CHUNK_TYPE_LEN > input.length) {
      // Truncated header — malformed. Bail and return input unchanged so the
      // backend validator can reject it.
      return input;
    }

    const dataLen = readUint32BE(input, offset);
    // Guard against absurd lengths that would overflow or read past the end.
    // dataLen is a 32-bit unsigned int; max is 0xFFFFFFFF. We cap on the
    // remaining bytes available to avoid integer-overflow / OOB reads.
    const chunkStart = offset;
    const dataStart = offset + CHUNK_HEADER_LEN + CHUNK_TYPE_LEN;
    const crcStart = dataStart + dataLen;
    const chunkEnd = crcStart + CHUNK_CRC_LEN;

    // dataStart could overflow if dataLen is huge; detect via ordering.
    // Also chunkEnd must not exceed input.length for a well-formed PNG.
    if (
      dataLen > input.length || // data alone exceeds whole file
      dataStart > input.length || // header+data start past EOF
      crcStart > input.length || // data runs past EOF
      chunkEnd > input.length // CRC runs past EOF
    ) {
      // Truncated or corrupt chunk — return input unchanged.
      return input;
    }

    const type = readChunkType(input, offset + CHUNK_HEADER_LEN);

    if (ALLOWED_CHUNK_TYPES.has(type)) {
      kept.push({ start: chunkStart, end: chunkEnd });
    }
    // else: drop the chunk (do not copy it).

    if (type === "IEND") {
      sawIend = true;
    }

    // Advance to the next chunk.
    offset = chunkEnd;
  }

  // If we never saw IEND, the PNG is truncated/malformed. Return input
  // unchanged and let the backend reject it.
  if (!sawIend) {
    return input;
  }

  // If nothing was dropped, return the original buffer unchanged (no copy).
  // Compute the dropped byte count by comparing total retained vs input.
  let retainedTotal = SIG_LEN;
  for (const r of kept) {
    retainedTotal += r.end - r.start;
  }
  if (retainedTotal === input.length) {
    return input;
  }

  // Build the sanitized output: signature + retained chunks (in order).
  const out = new Uint8Array(retainedTotal);
  out.set(PNG_SIGNATURE, 0);
  let writeOffset = SIG_LEN;
  for (const r of kept) {
    const len = r.end - r.start;
    out.set(input.subarray(r.start, r.end), writeOffset);
    writeOffset += len;
  }

  return out;
}

/**
 * Sanitize a `File` that may be a PNG. Non-PNG files (JPEG, WebP, or
 * anything without the PNG signature) are returned unchanged.
 *
 * For PNGs, disallowed chunks are stripped and a new `File` is returned
 * with the sanitized bytes. The MIME type is preserved (PNG stays
 * `image/png`); the file name and `lastModified` are preserved.
 *
 * On any parse error or malformed structure, the original `File` is
 * returned unchanged (never throws).
 *
 * @param file - The uploaded image File.
 * @returns A File with sanitized bytes (for PNGs) or the same File
 *   reference (for non-PNGs / malformed PNGs).
 */
export async function sanitizePng(file: File): Promise<File> {
  // Fast path: if the File.type already declares a non-PNG image, skip
  // byte inspection entirely. (We still verify by signature below for PNGs
  // because File.type is spoofable, but for non-PNG types there is nothing
  // to sanitize.)
  if (
    file.type !== "" &&
    file.type !== "image/png" &&
    file.type !== "image/x-png"
  ) {
    return file;
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Pass-through for non-PNG signatures (JPEG/WebP/unknown). This also
  // covers the spoofable-File.type case: a file claiming image/png whose
  // bytes are not actually PNG is left untouched for the backend to reject.
  if (!isPng(bytes)) {
    return file;
  }

  const sanitized = sanitizePngBytes(bytes);

  // If sanitizePngBytes returned the same reference, nothing changed —
  // return the original File (preserves identity, avoids an extra copy).
  if (sanitized === bytes) {
    return file;
  }

  // Reconstruct a File with the sanitized bytes. Preserve name + MIME type
  // + lastModified so downstream code (preview URL, mintNft) is unaffected.
  // Copy into a fresh ArrayBuffer so the BlobPart type is satisfied (TS
  // rejects Uint8Array<ArrayBufferLike> directly when the buffer could be
  // a SharedArrayBuffer; a plain ArrayBuffer copy is always accepted).
  const out = new Uint8Array(sanitized.byteLength);
  out.set(sanitized);
  return new File([out.buffer], file.name, {
    type: "image/png",
    lastModified: file.lastModified,
  });
}
