import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// The app entry point (src/main.tsx) installs BigInt.prototype.toJSON at
// runtime so React Query's query-key hashing can serialize the bigint
// offset/limit values the paginated listing hooks put in their keys. Test files
// render hooks and pages directly and never import main.tsx, so without this
// shim the same query keys throw "Do not know how to serialize a BigInt" in the
// test environment only. Mirror the production polyfill here so the tests
// exercise the same runtime the app has. This is a test-environment shim only;
// it does not change production behavior.
if (typeof BigInt !== "undefined" && !BigInt.prototype.toJSON) {
  BigInt.prototype.toJSON = function toJSON(this: bigint): string {
    return this.toString();
  };
}

// With a single forked worker, every test file shares one jsdom document.
// React Testing Library's automatic cleanup is not reliably registered in that
// setup, so unmounted trees from earlier files accumulate and make text queries
// ambiguous. Register cleanup explicitly after each test.
afterEach(() => {
  cleanup();
});

// jsdom's Blob/File implementation does not provide `arrayBuffer()`, and
// `File.slice()` returns a Blob without it either. Production code
// (src/utils/imageMagic.ts) reads magic bytes via `file.slice(...).arrayBuffer()`,
// so without this polyfill the real upload path throws in tests. This is a
// test-environment shim only; it does not change production behavior.
if (typeof Blob !== "undefined" && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function arrayBuffer(): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () =>
        reject(reader.error ?? new Error("Failed to read blob"));
      reader.readAsArrayBuffer(this);
    });
  };
}

// jsdom does not implement the object-URL API used to preview an uploaded
// image (src/pages/HomePage.tsx). Provide inert stubs so the upload path can
// complete; the preview URL is never fetched in tests.
if (typeof URL !== "undefined") {
  if (!URL.createObjectURL) {
    URL.createObjectURL = () => "blob:test-preview";
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = () => {};
  }
}
