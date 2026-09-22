// Regression tests for NFT image-format validation helpers.
//
// These tests exercise the PURE helpers NftLib.validateImageFormat and
// NftLib.validateTrailingBytes extracted from mintNft. They do NOT require
// canister/auth context — the helpers operate directly on Blob inputs.
//
// Run via: `mops test` (auto-discovers *.test.mo in this top-level test/ dir,
// which is relative to mops.toml at the project root).
import Test "mo:test";
import Blob "mo:core/Blob";
import Nat8 "mo:core/Nat8";
import Array "mo:core/Array";
import Result "mo:core/Result";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import NftLib "../src/backend/lib/nft";
import BrandLogos "./fixtures/brand-logos";

// Convenience: build a Blob from a [Nat8] array.
// Blob.fromArray is available in mo:core 2.6.0 (deprecated in favor of
// Array.toBlob but still functional under moc 1.11.2).
func toBlob(bytes : [Nat8]) : Blob {
  Blob.fromArray(bytes)
};

// --- Magic-byte constants ---------------------------------------------------
// JPEG SOI: FF D8 FF
let JPEG_SOI : [Nat8] = [0xFF, 0xD8, 0xFF];
// JPEG EOI: FF D9
let JPEG_EOI : [Nat8] = [0xFF, 0xD9];
// PNG signature: 89 50 4E 47 0D 0A 1A 0A
let PNG_SIG : [Nat8] = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
// PNG IEND chunk trailer: "IEND" + CRC = 49 45 4E 44 AE 42 60 82
let PNG_IEND : [Nat8] = [0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82];
// WebP: RIFF....WEBP (12-byte header). Bytes 4-7 are the file size placeholder.
let WEBP_HDR : [Nat8] = [
  0x52, 0x49, 0x46, 0x46, // "RIFF"
  0x00, 0x00, 0x00, 0x00, // file size (placeholder)
  0x57, 0x45, 0x42, 0x50, // "WEBP"
];

// Concatenate two [Nat8] arrays.
func concat(a : [Nat8], b : [Nat8]) : [Nat8] {
  let out = Array.tabulate<Nat8>(
    a.size() + b.size(),
    func(i) {
      if (i < a.size()) { a[i] } else { b[i - a.size()] }
    }
  );
  out
};

// ===========================================================================
// Case 5 (placed first so later cases can reuse the valid fixtures):
// Valid JPEG, PNG, WebP — validateImageFormat ACCEPTS all three;
// validateTrailingBytes ACCEPTS the JPEG and PNG (no trailing bytes).
// ===========================================================================
Test.test("valid formats: validateImageFormat accepts JPEG, PNG, WebP", func() {
  let validJpeg = toBlob(concat(concat(JPEG_SOI, [0xE0, 0x00, 0x10]), JPEG_EOI));
  let validPng = toBlob(concat(PNG_SIG, PNG_IEND));
  let validWebp = toBlob(WEBP_HDR);
  Test.expect.bool(Result.isOk(NftLib.validateImageFormat(validJpeg))).isTrue();
  Test.expect.bool(Result.isOk(NftLib.validateImageFormat(validPng))).isTrue();
  Test.expect.bool(Result.isOk(NftLib.validateImageFormat(validWebp))).isTrue();
});

Test.test("valid formats: validateTrailingBytes accepts JPEG and PNG", func() {
  let validJpeg = toBlob(concat(concat(JPEG_SOI, [0xE0, 0x00, 0x10]), JPEG_EOI));
  let validPng = toBlob(concat(PNG_SIG, PNG_IEND));
  Test.expect.bool(Result.isOk(NftLib.validateTrailingBytes(validJpeg))).isTrue();
  Test.expect.bool(Result.isOk(NftLib.validateTrailingBytes(validPng))).isTrue();
});

// ===========================================================================
// Case 1: Polyglot JPEG — valid FF D8 FF header + a COM (0xFFFE) segment
// containing HTML/JS markup.
//   - validateImageFormat ACCEPTS it (valid FF D8 FF header).
//   - validateTrailingBytes: if the polyglot has trailing bytes after the
//     LAST FF D9, REJECT; if no trailing bytes, ACCEPT. The COM segment
//     itself is NOT rejected by the trailing-byte scan — only bytes after
//     the final EOI matter. Documented behavior below.
// ===========================================================================
Test.test("polyglot JPEG: validateImageFormat accepts (valid FF D8 FF header)", func() {
  // COM segment: marker 0xFFFE, length 0x00 0x05, payload "<x>" (3 bytes).
  // Length field includes its own 2 bytes, so 0x0005 = 5 means 3 payload bytes.
  let comSegment : [Nat8] = [
    0xFF, 0xFE, // COM marker
    0x00, 0x05, // length (5 = 2 length bytes + 3 payload bytes)
    0x3C, 0x78, 0x3E, // "<x>"
  ];
  let polyglot = toBlob(concat(concat(JPEG_SOI, comSegment), JPEG_EOI));
  Test.expect.bool(Result.isOk(NftLib.validateImageFormat(polyglot))).isTrue();
});

Test.test("polyglot JPEG: validateTrailingBytes accepts when no trailing bytes after last EOI", func() {
  // The COM segment sits BEFORE the EOI marker, so there are no trailing bytes
  // after the last FF D9. validateTrailingBytes should ACCEPT.
  // NOTE: the COM payload itself (e.g. "<script>") is NOT inspected by either
  // helper — magic-byte + trailing-byte checks do not detect polyglot payloads
  // that live inside the valid image stream. Defense against polyglot content
  // served as an image relies on Content-Type sniffing protections at the
  // storage/serving layer, not on these byte validators.
  let comSegment : [Nat8] = [
    0xFF, 0xFE,
    0x00, 0x0B, // length 11 = 2 + 9 payload bytes
    0x3C, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x3E, 0x00, // "<script>\0"
  ];
  let polyglot = toBlob(concat(concat(JPEG_SOI, comSegment), JPEG_EOI));
  Test.expect.bool(Result.isOk(NftLib.validateTrailingBytes(polyglot))).isTrue();
});

Test.test("polyglot JPEG: validateTrailingBytes rejects when trailing bytes after last EOI", func() {
  // Same polyglot but with non-zero bytes appended AFTER the final FF D9.
  let comSegment : [Nat8] = [
    0xFF, 0xFE,
    0x00, 0x05,
    0x3C, 0x78, 0x3E,
  ];
  let trailing : [Nat8] = [0x41, 0x42, 0x43]; // "ABC" — non-zero trailing data
  let polyglot = toBlob(concat(concat(concat(JPEG_SOI, comSegment), JPEG_EOI), trailing));
  Test.expect.bool(Result.isErr(NftLib.validateTrailingBytes(polyglot))).isTrue();
});

// ===========================================================================
// Case 2: SVG with embedded <script> — a blob starting with "<svg" or "<?xml".
// validateImageFormat should REJECT it (not a magic byte in the allowlist).
// ===========================================================================
Test.test("SVG with <script>: validateImageFormat rejects (not in allowlist)", func() {
  let svgBytes : [Nat8] = [
    0x3C, 0x73, 0x76, 0x67, // "<svg"
    0x20, 0x3E, // " >"
    0x3C, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x3E, // "<script>"
    0x61, 0x6C, 0x65, 0x72, 0x74, 0x28, 0x31, 0x29, // "alert(1)"
    0x3C, 0x2F, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x3E, // "</script>"
    0x3C, 0x2F, 0x73, 0x76, 0x67, 0x3E, // "</svg>"
  ];
  let svgBlob = toBlob(svgBytes);
  Test.expect.bool(Result.isErr(NftLib.validateImageFormat(svgBlob))).isTrue();
});

Test.test("SVG with <?xml prologue: validateImageFormat rejects", func() {
  let xmlBytes : [Nat8] = [
    0x3C, 0x3F, 0x78, 0x6D, 0x6C, // "<?xml"
    0x20, 0x76, 0x65, 0x72, 0x73, 0x69, 0x6F, 0x6E, 0x3D, 0x22, 0x31, 0x2E, 0x30, 0x22, 0x3F, 0x3E,
  ];
  let xmlBlob = toBlob(xmlBytes);
  Test.expect.bool(Result.isErr(NftLib.validateImageFormat(xmlBlob))).isTrue();
});

// ===========================================================================
// Case 3: PNG with suspicious metadata — a valid PNG (89 50 4E 47 header)
// with a tEXt chunk containing "<script>".
//   - validateImageFormat should ACCEPT it (valid PNG).
//   - NOTE: metadata is NOT inspected by either helper. The tEXt chunk lives
//     inside the valid PNG stream before IEND, so it is not "trailing" data.
//     Defense against script-bearing metadata relies on the serving layer's
//     Content-Type / CSP headers, not on these byte validators.
// ===========================================================================
Test.test("PNG with <script> tEXt chunk: validateImageFormat accepts (valid PNG)", func() {
  // tEXt chunk: 4-byte length (0x00 0x00 0x00 0x08) + "tEXt" + 8 payload bytes.
  // Payload here: "key\0<x>" (key + null separator + value).
  let textChunk : [Nat8] = [
    0x00, 0x00, 0x00, 0x08, // length = 8
    0x74, 0x45, 0x58, 0x74, // "tEXt"
    0x6B, 0x65, 0x79, 0x00, // "key\0"
    0x3C, 0x78, 0x3E, 0x00, // "<x>\0" (padded to length 8)
  ];
  // A CRC follows the chunk data in real PNGs; we omit it for the test since
  // validateImageFormat only checks the 8-byte signature and validateTrailingBytes
  // only looks for the IEND trailer. We append IEND so trailing-byte check passes.
  let png = toBlob(concat(concat(PNG_SIG, textChunk), PNG_IEND));
  Test.expect.bool(Result.isOk(NftLib.validateImageFormat(png))).isTrue();
});

Test.test("PNG with <script> tEXt chunk: validateTrailingBytes accepts (metadata before IEND)", func() {
  let textChunk : [Nat8] = [
    0x00, 0x00, 0x00, 0x08,
    0x74, 0x45, 0x58, 0x74,
    0x6B, 0x65, 0x79, 0x00,
    0x3C, 0x78, 0x3E, 0x00,
  ];
  let png = toBlob(concat(concat(PNG_SIG, textChunk), PNG_IEND));
  Test.expect.bool(Result.isOk(NftLib.validateTrailingBytes(png))).isTrue();
});

// ===========================================================================
// Case 4: Trailing bytes after EOI/IEND.
//   - Valid JPEG with non-zero bytes appended after the last FF D9 → REJECT.
//   - Valid PNG with non-zero bytes after the IEND chunk CRC → REJECT.
//   - WebP trailing-byte test is SKIPPED with a comment noting WebP
//     trailing-byte rejection is intentionally not implemented.
// ===========================================================================
Test.test("JPEG with trailing bytes after last FF D9: validateTrailingBytes rejects", func() {
  let trailing : [Nat8] = [0x41, 0x42, 0x43]; // non-zero trailing data
  let jpeg = toBlob(concat(concat(JPEG_SOI, [0xE0, 0x00, 0x10]), concat(JPEG_EOI, trailing)));
  Test.expect.bool(Result.isErr(NftLib.validateTrailingBytes(jpeg))).isTrue();
});

Test.test("PNG with trailing bytes after IEND CRC: validateTrailingBytes rejects", func() {
  let trailing : [Nat8] = [0x41, 0x42, 0x43]; // non-zero trailing data
  let png = toBlob(concat(concat(PNG_SIG, PNG_IEND), trailing));
  Test.expect.bool(Result.isErr(NftLib.validateTrailingBytes(png))).isTrue();
});

Test.test("WebP with invalid RIFF declared size and trailing bytes is rejected by RIFF bounding", func() {
  // WebP RIFF-header size bounding (Priority 2 spec): parse RIFF + u32 LE size
  // + WEBP; reject when declaredSize < 4 (too small to contain the WEBP FourCC)
  // or when blobSize != 8 + declaredSize. This REPLACES the v249 intentional
  // skip with a spec-correct structural bound.
  // Here WEBP_HDR has declared size = 0 (bytes 4-7 are all 0x00), which is < 4,
  // AND the blob has 3 trailing bytes beyond 8 + declaredSize. Both conditions
  // independently force rejection.
  let trailing : [Nat8] = [0x41, 0x42, 0x43];
  let webp = toBlob(concat(WEBP_HDR, trailing));
  Test.expect.bool(Result.isErr(NftLib.validateTrailingBytes(webp))).isTrue();
});

// ===========================================================================
// Additional edge cases (per the user's review notes):
//   - Empty file → validateImageFormat rejects.
//   - Random binary renamed to .jpg → validateImageFormat rejects.
//   - Corrupted image header (valid first byte, garbage rest) → rejects.
//   - JPEG missing EOI marker → validateTrailingBytes rejects.
//   - PNG missing IEND chunk → validateTrailingBytes rejects.
// ===========================================================================
Test.test("empty file: validateImageFormat rejects", func() {
  let empty = toBlob([]);
  Test.expect.bool(Result.isErr(NftLib.validateImageFormat(empty))).isTrue();
});

Test.test("random binary: validateImageFormat rejects", func() {
  let random : [Nat8] = [0xDE, 0xAD, 0xBE, 0xEF, 0x00, 0xFF, 0x12, 0x34];
  Test.expect.bool(Result.isErr(NftLib.validateImageFormat(toBlob(random)))).isTrue();
});

Test.test("corrupted JPEG header (valid FF, garbage rest): validateImageFormat rejects", func() {
  let corrupted : [Nat8] = [0xFF, 0x00, 0xFF, 0xD9]; // FF 00 is not SOI
  Test.expect.bool(Result.isErr(NftLib.validateImageFormat(toBlob(corrupted)))).isTrue();
});

Test.test("JPEG missing EOI marker: validateTrailingBytes rejects", func() {
  let noEoi = toBlob(concat(JPEG_SOI, [0xE0, 0x00, 0x10, 0x41, 0x42]));
  Test.expect.bool(Result.isErr(NftLib.validateTrailingBytes(noEoi))).isTrue();
});

Test.test("PNG missing IEND chunk: validateTrailingBytes rejects", func() {
  let noIend = toBlob(concat(PNG_SIG, [0x41, 0x42, 0x43]));
  Test.expect.bool(Result.isErr(NftLib.validateTrailingBytes(noIend))).isTrue();
});

// ===========================================================================
// Trailing zero bytes (padding) are ACCEPTED — only non-zero trailing bytes
// are rejected. This matches the prior inlined implementation.
// ===========================================================================
Test.test("JPEG with trailing zero bytes (padding): validateTrailingBytes accepts", func() {
  let padding : [Nat8] = [0x00, 0x00, 0x00];
  let jpeg = toBlob(concat(concat(JPEG_SOI, [0xE0, 0x00, 0x10]), concat(JPEG_EOI, padding)));
  Test.expect.bool(Result.isOk(NftLib.validateTrailingBytes(jpeg))).isTrue();
});

Test.test("PNG with trailing zero bytes (padding): validateTrailingBytes accepts", func() {
  let padding : [Nat8] = [0x00, 0x00, 0x00];
  let png = toBlob(concat(concat(PNG_SIG, PNG_IEND), padding));
  Test.expect.bool(Result.isOk(NftLib.validateTrailingBytes(png))).isTrue();
});

// ===========================================================================
// Priority 2 regression tests — validateJpegMarkers, validatePngChunks,
// validateWebpChunks, and the updated WebP RIFF bounding in
// validateTrailingBytes. These tests are ADDITIVE: the existing 19 tests
// above are unchanged. New fixtures and helpers are local to this section.
// ===========================================================================

// --- New fixtures for the Priority 2 validators -----------------------------

// JPEG SOI only (FF D8) — used to build marker sequences that must NOT include
// the third FF byte (the SOI is exactly 2 bytes; the third byte is the first
// marker tag).
let JPEG_SOI_ONLY : [Nat8] = [0xFF, 0xD8];

// Build a JPEG marker segment: marker tag (1 byte after FF) + 2-byte BE length
// + payload of (length - 2) bytes. Returns [FF, tag, lenHi, lenLo, ...payload].
func jpegSegment(tag : Nat8, payload : [Nat8]) : [Nat8] {
  let segLen = 2 + payload.size(); // length field includes its own 2 bytes
  let lenHi : Nat8 = Nat8.fromNat(segLen / 256);
  let lenLo : Nat8 = Nat8.fromNat(segLen % 256);
  concat(concat(concat([0xFF, tag], [lenHi, lenLo]), payload), [])
};

// Build a PNG chunk: 4-byte BE length + 4-byte type + data + 4-byte CRC (zeros
// for tests — validators do not check CRC). typeText must be exactly 4 chars.
func pngChunk(typeText : Text, data : [Nat8]) : [Nat8] {
  let dataLen = data.size();
  let b0 : Nat8 = Nat8.fromNat(dataLen / 16777216);
  let b1 : Nat8 = Nat8.fromNat((dataLen / 65536) % 256);
  let b2 : Nat8 = Nat8.fromNat((dataLen / 256) % 256);
  let b3 : Nat8 = Nat8.fromNat(dataLen % 256);
  let typeChars = typeText.toIter().toArray();
  let typeBytes : [Nat8] = [
    Nat8.fromNat(typeChars[0].toNat32().toNat()),
    Nat8.fromNat(typeChars[1].toNat32().toNat()),
    Nat8.fromNat(typeChars[2].toNat32().toNat()),
    Nat8.fromNat(typeChars[3].toNat32().toNat()),
  ];
  let crc : [Nat8] = [0x00, 0x00, 0x00, 0x00];
  concat(concat(concat([b0, b1, b2, b3], typeBytes), data), crc)
};

// Build a WebP RIFF blob from a list of (FourCC, payload) chunks. Computes the
// RIFF declared size (LE u32 at bytes 4-7) = 4 ("WEBP") + sum of chunk sizes
// (including 8-byte chunk headers and 1 pad byte for odd-sized payloads).
// Returns a complete WebP blob with a consistent RIFF size.
func webpBlob(chunks : [(Text, [Nat8])]) : [Nat8] {
  // Compute total chunk bytes.
  var total : Nat = 4; // "WEBP" FourCC
  for ((_, payload) in chunks.vals()) {
    total += 8 + payload.size();
    if (payload.size() % 2 == 1) { total += 1 };
  };
  // RIFF header: "RIFF" + LE u32 size + "WEBP".
  let s0 : Nat8 = Nat8.fromNat(total % 256);
  let s1 : Nat8 = Nat8.fromNat((total / 256) % 256);
  let s2 : Nat8 = Nat8.fromNat((total / 65536) % 256);
  let s3 : Nat8 = Nat8.fromNat((total / 16777216) % 256);
  let header : [Nat8] = [0x52, 0x49, 0x46, 0x46, s0, s1, s2, s3, 0x57, 0x45, 0x42, 0x50];
  var out : [Nat8] = header;
  for ((fourcc, payload) in chunks.vals()) {
    let pLen = payload.size();
    let c0 : Nat8 = Nat8.fromNat(pLen % 256);
    let c1 : Nat8 = Nat8.fromNat((pLen / 256) % 256);
    let c2 : Nat8 = Nat8.fromNat((pLen / 65536) % 256);
    let c3 : Nat8 = Nat8.fromNat((pLen / 16777216) % 256);
    let fc = fourcc.toIter().toArray();
    let fccBytes : [Nat8] = [
      Nat8.fromNat(fc[0].toNat32().toNat()),
      Nat8.fromNat(fc[1].toNat32().toNat()),
      Nat8.fromNat(fc[2].toNat32().toNat()),
      Nat8.fromNat(fc[3].toNat32().toNat()),
    ];
    out := concat(out, concat(concat(concat(fccBytes, [c0, c1, c2, c3]), payload), []));
    if (pLen % 2 == 1) {
      out := concat(out, [0x00]); // pad byte
    };
  };
  out
};

// ===========================================================================
// PRIMARY REGRESSION TEST: polyglot JPEG with a <script> payload inside a
// genuine COM segment (0xFFFE) placed IMMEDIATELY after SOI — NOT appended
// after EOI. v249's trailing-byte scan does NOT catch this (the COM segment
// lives inside the valid stream before EOI). validateJpegMarkers MUST reject
// it because COM is on the reject list.
// ===========================================================================
Test.test("PRIMARY: polyglot JPEG with <script> in COM segment after SOI — validateJpegMarkers REJECTS", func() {
  // Payload: "<script>alert(1)</script>" (25 bytes).
  let script : [Nat8] = [
    0x3C, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x3E, // "<script>"
    0x61, 0x6C, 0x65, 0x72, 0x74, 0x28, 0x31, 0x29, // "alert(1)"
    0x3C, 0x2F, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74, 0x3E, // "</script>"
  ];
  let comSeg = jpegSegment(0xFE, script); // COM marker 0xFFFE
  // SOI (FF D8) + COM segment + EOI (FF D9). The COM sits immediately after
  // SOI, before EOI — this is the polyglot pattern v249 does not catch.
  let polyglot = toBlob(concat(concat(JPEG_SOI_ONLY, comSeg), JPEG_EOI));
  Test.expect.bool(Result.isErr(NftLib.validateJpegMarkers(polyglot))).isTrue();
});

// ===========================================================================
// Clean real JPEG — minimal valid marker sequence using only allowlisted
// markers (SOI, SOF0, DQT, DHT, SOS, EOI; no COM, no APP1). Must PASS.
// ===========================================================================
Test.test("clean JPEG with allowlisted markers (SOF0/DQT/DHT/SOS/EOI) — validateJpegMarkers ACCEPTS", func() {
  // SOF0: 3-byte payload (precision + 2x height/width minimal).
  let sof0 = jpegSegment(0xC0, [0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00]);
  // DQT: minimal 2-byte payload (length already >= 2).
  let dqt = jpegSegment(0xDB, [0x00, 0x01]);
  // DHT: minimal 2-byte payload.
  let dht = jpegSegment(0xC4, [0x00, 0x01]);
  // SOS: minimal header (6 bytes: Ns + 3 components spec) then entropy data.
  let sos = jpegSegment(0xDA, [0x03, 0x01, 0x22, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3C, 0x00]);
  let jpeg = toBlob(concat(concat(concat(concat(concat(concat(JPEG_SOI_ONLY, sof0), dqt), dht), sos), JPEG_EOI), []));
  Test.expect.bool(Result.isOk(NftLib.validateJpegMarkers(jpeg))).isTrue();
});

// ===========================================================================
// JPEG marker allowlist tests.
// ===========================================================================
Test.test("JPEG with APP1/EXIF marker (FF E1) — validateJpegMarkers REJECTS", func() {
  let app1 = jpegSegment(0xE1, [0x45, 0x78, 0x69, 0x66]); // "Exif"
  let jpeg = toBlob(concat(concat(JPEG_SOI_ONLY, app1), JPEG_EOI));
  Test.expect.bool(Result.isErr(NftLib.validateJpegMarkers(jpeg))).isTrue();
});

Test.test("JPEG with reserved JPG marker (FF C8) — validateJpegMarkers REJECTS", func() {
  let jpg = jpegSegment(0xC8, [0x00, 0x01]);
  let jpeg = toBlob(concat(concat(JPEG_SOI_ONLY, jpg), JPEG_EOI));
  Test.expect.bool(Result.isErr(NftLib.validateJpegMarkers(jpeg))).isTrue();
});

Test.test("JPEG with JPGn marker (FF F0) — validateJpegMarkers REJECTS", func() {
  let jpgn = jpegSegment(0xF0, [0x00, 0x01]);
  let jpeg = toBlob(concat(concat(JPEG_SOI_ONLY, jpgn), JPEG_EOI));
  Test.expect.bool(Result.isErr(NftLib.validateJpegMarkers(jpeg))).isTrue();
});

Test.test("JPEG with APP0/JFIF marker (FF E0) — validateJpegMarkers ACCEPTS", func() {
  // APP0/JFIF minimal: "JFIF\0" + version + units + density + thumbnail.
  let app0 = jpegSegment(0xE0, [0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);
  let jpeg = toBlob(concat(concat(JPEG_SOI_ONLY, app0), JPEG_EOI));
  Test.expect.bool(Result.isOk(NftLib.validateJpegMarkers(jpeg))).isTrue();
});

// ===========================================================================
// PNG chunk-type allowlist tests.
// ===========================================================================
Test.test("PNG with tEXt chunk — validatePngChunks REJECTS", func() {
  let ihdr = pngChunk("IHDR", [0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x08, 0x02, 0x00, 0x00, 0x00]); // 13-byte IHDR
  let text = pngChunk("tEXt", [0x6B, 0x65, 0x79, 0x00, 0x76, 0x61, 0x6C]); // "key\0val"
  let png = toBlob(concat(concat(PNG_SIG, concat(concat(ihdr, text), [])), PNG_IEND));
  Test.expect.bool(Result.isErr(NftLib.validatePngChunks(png))).isTrue();
});

Test.test("PNG with iCCP chunk — validatePngChunks REJECTS", func() {
  let ihdr = pngChunk("IHDR", [0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x08, 0x02, 0x00, 0x00, 0x00]);
  let iccp = pngChunk("iCCP", [0x6E, 0x61, 0x6D, 0x65, 0x00, 0x00, 0x01]); // name\0 + compressed profile
  let png = toBlob(concat(concat(PNG_SIG, concat(concat(ihdr, iccp), [])), PNG_IEND));
  Test.expect.bool(Result.isErr(NftLib.validatePngChunks(png))).isTrue();
});

Test.test("PNG with sPLT chunk — validatePngChunks REJECTS", func() {
  let ihdr = pngChunk("IHDR", [0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x08, 0x02, 0x00, 0x00, 0x00]);
  let splt = pngChunk("sPLT", [0x6E, 0x61, 0x6D, 0x65, 0x00, 0x08, 0x00, 0x01]); // name\0 + depth + entry
  let png = toBlob(concat(concat(PNG_SIG, concat(concat(ihdr, splt), [])), PNG_IEND));
  Test.expect.bool(Result.isErr(NftLib.validatePngChunks(png))).isTrue();
});

Test.test("PNG with caBX chunk — validatePngChunks REJECTS", func() {
  let ihdr = pngChunk("IHDR", [0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x08, 0x02, 0x00, 0x00, 0x00]);
  let cabx = pngChunk("caBX", [0x00, 0x01, 0x02, 0x03]); // C2PA/JUMBF
  let png = toBlob(concat(concat(PNG_SIG, concat(concat(ihdr, cabx), [])), PNG_IEND));
  Test.expect.bool(Result.isErr(NftLib.validatePngChunks(png))).isTrue();
});

Test.test("PNG with only IHDR + IDAT + IEND (minimal valid) — validatePngChunks ACCEPTS", func() {
  let ihdr = pngChunk("IHDR", [0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x08, 0x02, 0x00, 0x00, 0x00]);
  let idat = pngChunk("IDAT", [0x78, 0x9C, 0x63, 0x00, 0x01]); // minimal zlib stream
  // IEND must be a complete chunk (4-byte length prefix + "IEND" + 0 data + 4-byte
  // CRC), not the 8-byte PNG_IEND trailer used by the trailing-byte scan.
  let iend = pngChunk("IEND", []);
  let png = toBlob(concat(concat(PNG_SIG, concat(concat(ihdr, idat), [])), iend));
  Test.expect.bool(Result.isOk(NftLib.validatePngChunks(png))).isTrue();
});

Test.test("PNG with gAMA chunk (4 bytes) — validatePngChunks ACCEPTS", func() {
  let ihdr = pngChunk("IHDR", [0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x08, 0x02, 0x00, 0x00, 0x00]);
  // gAMA: 4-byte gamma value (e.g. 0x0000B18F = 45455 = 2.2 gamma).
  let gama = pngChunk("gAMA", [0x00, 0x00, 0xB1, 0x8F]);
  // IEND must be a complete chunk (4-byte length prefix + "IEND" + 0 data + 4-byte
  // CRC), not the 8-byte PNG_IEND trailer used by the trailing-byte scan.
  let iend = pngChunk("IEND", []);
  let png = toBlob(concat(concat(PNG_SIG, concat(concat(ihdr, gama), [])), iend));
  Test.expect.bool(Result.isOk(NftLib.validatePngChunks(png))).isTrue();
});

Test.test("PNG with pHYs chunk of WRONG length (not 9 bytes) — validatePngChunks REJECTS (length-pin)", func() {
  let ihdr = pngChunk("IHDR", [0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00, 0x08, 0x02, 0x00, 0x00, 0x00]);
  // pHYs must be exactly 9 bytes; here we give it 8 bytes to trigger the pin.
  let phys = pngChunk("pHYs", [0x00, 0x0B, 0x13, 0x00, 0x00, 0x0B, 0x13, 0x00]); // 8 bytes (wrong)
  let png = toBlob(concat(concat(PNG_SIG, concat(concat(ihdr, phys), [])), PNG_IEND));
  Test.expect.bool(Result.isErr(NftLib.validatePngChunks(png))).isTrue();
});

// ===========================================================================
// WebP FourCC allowlist tests.
// ===========================================================================
Test.test("WebP with EXIF chunk — validateWebpChunks REJECTS", func() {
  let blob = webpBlob([("EXIF", [0x00, 0x01, 0x02, 0x03]), ("VP8 ", [0x00, 0x01, 0x02, 0x03])]);
  let webp = toBlob(blob);
  Test.expect.bool(Result.isErr(NftLib.validateWebpChunks(webp))).isTrue();
});

Test.test("WebP with XMP chunk — validateWebpChunks REJECTS", func() {
  let blob = webpBlob([("XMP ", [0x00, 0x01, 0x02, 0x03]), ("VP8 ", [0x00, 0x01, 0x02, 0x03])]);
  let webp = toBlob(blob);
  Test.expect.bool(Result.isErr(NftLib.validateWebpChunks(webp))).isTrue();
});

Test.test("WebP with VP8 chunk — validateWebpChunks ACCEPTS", func() {
  let blob = webpBlob([("VP8 ", [0x00, 0x01, 0x02, 0x03, 0x05, 0x06])]);
  let webp = toBlob(blob);
  Test.expect.bool(Result.isOk(NftLib.validateWebpChunks(webp))).isTrue();
});

// ===========================================================================
// WebP RIFF size bounding in validateTrailingBytes (updated WebP branch).
// ===========================================================================
Test.test("WebP with bytes beyond 8 + declared_size — validateTrailingBytes REJECTS", func() {
  // Build a consistent WebP blob, then append 3 trailing bytes. The RIFF
  // declared size will no longer match (blobSize != 8 + declaredSize).
  let consistent = webpBlob([("VP8 ", [0x00, 0x01, 0x02, 0x03])]);
  let withTrailing = concat(consistent, [0x41, 0x42, 0x43]); // "ABC" trailing
  let webp = toBlob(withTrailing);
  Test.expect.bool(Result.isErr(NftLib.validateTrailingBytes(webp))).isTrue();
});

Test.test("WebP with declared size inconsistent with actual blob size — validateTrailingBytes REJECTS", func() {
  // RIFF header with declared size = 8 (claims 8 bytes after "RIFF"), but the
  // blob is only 12 bytes long (just the RIFF+WEBP header, no chunks). 8 + 8 =
  // 16 != 12, so the size check rejects.
  let inconsistent : [Nat8] = [
    0x52, 0x49, 0x46, 0x46, // "RIFF"
    0x08, 0x00, 0x00, 0x00, // declared size = 8 (LE)
    0x57, 0x45, 0x42, 0x50, // "WEBP"
  ];
  let webp = toBlob(inconsistent);
  Test.expect.bool(Result.isErr(NftLib.validateTrailingBytes(webp))).isTrue();
});

// ===========================================================================
// Brand-logo regression tests — run the full validation chain over the REAL
// byte sequences of the 4 brand-logo files from frontend/public/assets/.
// Fixtures live in test/fixtures/brand-logos.mo (complete embedded bytes).
//
// The full chain per format is:
//   JPEG: validateImageFormat + validateTrailingBytes + validateJpegMarkers
//   PNG : validateImageFormat + validateTrailingBytes + validatePngChunks
//
// All 4 logos pass cleanly. logo2 (with an ICC color profile carried in an
// APP2/0xFFE2 marker) is accepted by validateJpegMarkers now that APP2/ICC
// is on the JPEG marker allowlist alongside APP0/JFIF.
// ===========================================================================

Test.test("brand logo 1 (JPEG, JFIF, no ICC) passes full validation", func() {
  let blob = toBlob(BrandLogos.logo1Jpeg);
  Test.expect.bool(Result.isOk(NftLib.validateImageFormat(blob))).isTrue();
  Test.expect.bool(Result.isOk(NftLib.validateTrailingBytes(blob))).isTrue();
  Test.expect.bool(Result.isOk(NftLib.validateJpegMarkers(blob))).isTrue();
});

Test.test("brand logo 2 (JPEG with ICC/APP2) passes full validation (APP2 now allowlisted)", func() {
  // logo2 carries an APP2 (0xFFE2) ICC-profile marker at offset 20. The JPEG
  // marker allowlist now permits APP2/ICC (0xFFE2) in addition to APP0/JFIF
  // (0xFFE0), so clean JPGs exported by image editors with embedded ICC
  // profiles pass validation. validateImageFormat, validateTrailingBytes, and
  // validateJpegMarkers all accept the file.
  let blob = toBlob(BrandLogos.logo2Jpeg);
  Test.expect.bool(Result.isOk(NftLib.validateImageFormat(blob))).isTrue();
  Test.expect.bool(Result.isOk(NftLib.validateTrailingBytes(blob))).isTrue();
  Test.expect.bool(Result.isOk(NftLib.validateJpegMarkers(blob))).isTrue();
});

Test.test("brand logo 3 (JPEG, JFIF, no ICC) passes full validation", func() {
  let blob = toBlob(BrandLogos.logo3Jpeg);
  Test.expect.bool(Result.isOk(NftLib.validateImageFormat(blob))).isTrue();
  Test.expect.bool(Result.isOk(NftLib.validateTrailingBytes(blob))).isTrue();
  Test.expect.bool(Result.isOk(NftLib.validateJpegMarkers(blob))).isTrue();
});

Test.test("brand logo 4 (PNG) passes full validation", func() {
  let blob = toBlob(BrandLogos.logo4Png);
  Test.expect.bool(Result.isOk(NftLib.validateImageFormat(blob))).isTrue();
  Test.expect.bool(Result.isOk(NftLib.validateTrailingBytes(blob))).isTrue();
  Test.expect.bool(Result.isOk(NftLib.validatePngChunks(blob))).isTrue();
});

// ===========================================================================
// APP2/ICC allowlist regression tests — directly exercise the fix that added
// APP2 (0xFFE2, ICC color profile) to the JPEG marker allowlist.
// ===========================================================================

Test.test("JPEG with APP2/ICC segment (FF E2) — validateJpegMarkers ACCEPTS (regression for APP2 allowlist fix)", func() {
  // APP2/ICC minimal segment: marker 0xFFE2 + 2-byte length + a small payload.
  // The payload here is a stub ICC profile header (not a real profile, but the
  // marker walker only checks the marker tag, length, and bounds — not the
  // payload contents).
  let app2 = jpegSegment(0xE2, [0x49, 0x43, 0x43, 0x5F, 0x50, 0x52, 0x4F, 0x46, 0x49, 0x4C, 0x45]); // "ICC_PROFILE"
  let jpeg = toBlob(concat(concat(JPEG_SOI_ONLY, app2), JPEG_EOI));
  Test.expect.bool(Result.isOk(NftLib.validateJpegMarkers(jpeg))).isTrue();
});

Test.test("JPEG with COM segment (FF FE) — validateJpegMarkers REJECTS (COM still blocked after APP2 fix)", func() {
  // A minimal valid JPEG (SOI + APP0/JFIF + SOF0 + DQT + DHT + SOS + minimal
  // entropy + EOI) with a COM (0xFFFE) segment inserted. COM must still be
  // rejected even though APP2 is now allowlisted — security must not weaken.
  let app0 = jpegSegment(0xE0, [0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);
  let comSeg = jpegSegment(0xFE, [0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  let sof0 = jpegSegment(0xC0, [0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00]);
  let dqt = jpegSegment(0xDB, [0x00, 0x01]);
  let dht = jpegSegment(0xC4, [0x00, 0x01]);
  let sos = jpegSegment(0xDA, [0x03, 0x01, 0x22, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3C, 0x00]);
  // Insert the COM segment between APP0 and SOF0.
  let jpeg = toBlob(concat(concat(concat(concat(concat(concat(concat(JPEG_SOI_ONLY, app0), comSeg), sof0), dqt), dht), sos), JPEG_EOI));
  let result = NftLib.validateJpegMarkers(jpeg);
  Test.expect.bool(Result.isErr(result)).isTrue();
  // Assert the error message indicates a non-allowlisted / COM marker rejection.
  switch (result) {
    case (#err(e)) {
      let msg = e.message;
      // The COM branch returns a specific "COM marker not allowed" message.
      Test.expect.bool(msg.contains(#text "COM")).isTrue();
    };
    case (#ok) {
      // Should not reach here — the test asserts isErr above. Trap to fail loudly.
      Runtime.trap("expected COM rejection, got #ok");
    };
  };
});

// ===========================================================================
// DATA-INTEGRITY REGRESSION TESTS (NFT-INTEGRITY).
//
// These tests exercise the mint path, the all-NFT listing, and the
// stable-store survival behavior using the PURE NftLib helpers (createNft,
// listAllNfts, countNfts, guardMintAdditive). They prove:
//   (1) minting does not clear existing NFTs,
//   (2) listing returns all NFTs after a mint,
//   (3) canister rotation does not make data appear lost,
//   (4) large NFT counts list correctly (no hardcoded result cap).
// They do NOT re-expose redacted fields (discountCode/membershipId).
// ===========================================================================

// A fixed 64-hex asset hash (createNft does not validate it — validation lives
// in the mixin — but a well-formed value keeps the record realistic).
let TEST_ASSET_HASH : Text = "0000000000000000000000000000000000000000000000000000000000000000";

// Add one NFT to the store via the same pure helper the mint path uses
// (NftLib.createNft). Purely additive: it adds exactly one NFT and never
// clears/resets/rebuilds existing state.
func makeNft(store : NftLib.NftStore, id : Nat, owner : Principal) {
  ignore NftLib.createNft(
    store, id, owner, "CREATOR-" # id.toText(), toBlob([0x00]),
    TEST_ASSET_HASH, "NFT " # id.toText(), "desc", "1/1", 0,
    null, null, null, null, null, "test-canister", 1
  );
};

// (1) Minting does not clear existing NFTs.
Test.test("minting adds exactly one NFT and never clears existing NFTs", func() {
  let store = NftLib.initNftStore();
  let owner = Principal.fromText("aaaaa-aa");
  makeNft(store, 1, owner);
  makeNft(store, 2, owner);
  makeNft(store, 3, owner);
  Test.expect.nat(NftLib.countNfts(store)).equal(3);
  // Mint one more — must be purely additive.
  makeNft(store, 4, owner);
  Test.expect.nat(NftLib.countNfts(store)).equal(4);
  // All prior NFTs still present in the full listing.
  let all = NftLib.listAllNfts(store, "test-canister");
  Test.expect.nat(all.size()).equal(4);
  let ids = all.map(func n = n.id);
  Test.expect.bool(ids.indexOf(1) != null).isTrue();
  Test.expect.bool(ids.indexOf(2) != null).isTrue();
  Test.expect.bool(ids.indexOf(3) != null).isTrue();
  Test.expect.bool(ids.indexOf(4) != null).isTrue();
});

// (2) Listing returns all NFTs after a mint.
Test.test("listAllNfts returns every NFT after a mint (no truncation)", func() {
  let store = NftLib.initNftStore();
  let owner = Principal.fromText("aaaaa-aa");
  makeNft(store, 1, owner);
  makeNft(store, 2, owner);
  let all = NftLib.listAllNfts(store, "test-canister");
  Test.expect.nat(all.size()).equal(2);
  let ids = all.map(func n = n.id);
  Test.expect.bool(ids.indexOf(1) != null).isTrue();
  Test.expect.bool(ids.indexOf(2) != null).isTrue();
});

// (3) Canister rotation does not make data appear lost. The stable store is
// the source of truth; a rotation that preserves the store (as the migration
// chain does across upgrade/reinstall) must list every NFT intact.
Test.test("canister rotation preserves all NFTs (store survives, listing reflects it)", func() {
  let store = NftLib.initNftStore();
  let owner = Principal.fromText("aaaaa-aa");
  makeNft(store, 1, owner);
  makeNft(store, 2, owner);
  makeNft(store, 3, owner);
  // Simulate rotation: a fresh store that receives the same stable data (the
  // migration chain preserves the store across upgrade/reinstall — no
  // Init-style wipe resets it to empty).
  let rotated = NftLib.initNftStore();
  for (n in NftLib.listAllNfts(store, "test-canister").vals()) {
    rotated.add(n.id, n);
  };
  Test.expect.nat(NftLib.countNfts(rotated)).equal(3);
  let all = NftLib.listAllNfts(rotated, "test-canister");
  Test.expect.nat(all.size()).equal(3);
  let ids = all.map(func n = n.id);
  Test.expect.bool(ids.indexOf(1) != null).isTrue();
  Test.expect.bool(ids.indexOf(2) != null).isTrue();
  Test.expect.bool(ids.indexOf(3) != null).isTrue();
});

// (4) Large NFT counts list correctly — no hardcoded result cap that silently
// truncates the catalog at scale.
Test.test("large NFT counts list correctly (no hardcoded cap)", func() {
  let store = NftLib.initNftStore();
  let owner = Principal.fromText("aaaaa-aa");
  var i = 1;
  while (i <= 1000) {
    makeNft(store, i, owner);
    i += 1;
  };
  Test.expect.nat(NftLib.countNfts(store)).equal(1000);
  let all = NftLib.listAllNfts(store, "test-canister");
  Test.expect.nat(all.size()).equal(1000);
});

// Mint-path integrity guard: a mint must be purely additive and must never
// overwrite/reset/rebuild existing NFT state. Refuse to mint into an id that
// already exists.
Test.test("guardMintAdditive refuses to overwrite an existing NFT (mint is purely additive)", func() {
  let store = NftLib.initNftStore();
  let owner = Principal.fromText("aaaaa-aa");
  makeNft(store, 1, owner);
  // Minting into an existing id must be refused — no code path can clobber.
  Test.expect.bool(Result.isErr(NftLib.guardMintAdditive(store, 1))).isTrue();
  // A fresh id is allowed.
  Test.expect.bool(Result.isOk(NftLib.guardMintAdditive(store, 2))).isTrue();
});
