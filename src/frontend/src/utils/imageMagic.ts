/**
 * Image MIME-type detection from file magic bytes.
 *
 * The browser-supplied `File.type` is trivially spoofable (a user can rename
 * a `.exe` to `.png` and the OS will report `image/png`). To avoid trusting
 * attacker-controlled metadata when constructing object URLs or uploading
 * to the backend, we re-derive the Content-Type from the file's leading
 * magic bytes — the same scheme the backend uses (see lib/nft.mo:303-327).
 *
 * Supported: JPEG, PNG, WebP. Anything else returns `null` and the caller
 * must reject the file.
 */

/**
 * Detect an image MIME type from the first bytes of a file.
 *
 * @param bytes - At least the first 12 bytes of the file (we read up to 16).
 * @returns The MIME type string, or `null` if the magic bytes are unknown.
 */
export function detectImageMimeType(bytes: Uint8Array): string | null {
  if (!bytes || bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }

  // WebP: "RIFF" .... "WEBP"
  // bytes[0..3] === "RIFF" (0x52 0x49 0x46 0x46)
  // bytes[8..11] === "WEBP" (0x57 0x45 0x42 0x50)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

/**
 * Read the leading magic bytes of a file (first 16 bytes).
 */
export async function readFileMagicBytes(
  file: File,
  byteCount = 16,
): Promise<Uint8Array> {
  const slice = file.slice(0, byteCount);
  const buffer = await slice.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Re-derive the Content-Type of a file from its magic bytes and, if it
 * differs from `file.type` (or `file.type` is empty), reconstruct a new
 * `Blob`/`File` with the correct Content-Type. If the magic bytes are
 * unknown, returns `null` so the caller can reject the file.
 *
 * @returns A `File` with a trustworthy Content-Type, or `null` if the
 *   magic bytes do not match a supported image format.
 */
export async function fileWithVerifiedImageType(
  file: File,
): Promise<File | null> {
  const magic = await readFileMagicBytes(file);
  const detected = detectImageMimeType(magic);

  if (!detected) {
    // Unknown magic bytes — reject.
    return null;
  }

  // If the detected type matches file.type, no reconstruction needed.
  if (file.type === detected) {
    return file;
  }

  // Reconstruct a new File with the corrected Content-Type so that
  // URL.createObjectURL and any downstream upload uses the verified type.
  const buffer = await file.arrayBuffer();
  // Preserve the original name but ensure the extension is consistent with
  // the detected type so downstream consumers that key off the name also
  // see a consistent signal.
  const ext = detected === "image/jpeg" ? "jpg" : detected.split("/")[1];
  const baseName = file.name.replace(/\.[^.]+$/, "") || "upload";
  const newName = `${baseName}.${ext}`;
  return new File([buffer], newName, {
    type: detected,
    lastModified: file.lastModified,
  });
}
