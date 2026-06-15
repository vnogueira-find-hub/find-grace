// Polyfills for pdfjs-dist v5 on older browsers.
// Needs Promise.withResolvers (ES2024) and Uint8Array.prototype.toHex/fromHex/setFromHex (ES2025).
if (typeof (Promise as unknown as { withResolvers?: unknown }).withResolvers !== "function") {
  (Promise as unknown as { withResolvers: <T>() => { promise: Promise<T>; resolve: (v: T | PromiseLike<T>) => void; reject: (r?: unknown) => void } }).withResolvers = function <T>() {
    let resolve!: (v: T | PromiseLike<T>) => void;
    let reject!: (r?: unknown) => void;
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
    return { promise, resolve, reject };
  };
}

type U8Proto = Uint8Array & {
  toHex?: () => string;
  setFromHex?: (hex: string) => { read: number; written: number };
};
const u8proto = Uint8Array.prototype as U8Proto;
if (typeof u8proto.toHex !== "function") {
  u8proto.toHex = function (this: Uint8Array) {
    let out = "";
    for (let i = 0; i < this.length; i++) out += this[i].toString(16).padStart(2, "0");
    return out;
  };
}
if (typeof u8proto.setFromHex !== "function") {
  u8proto.setFromHex = function (this: Uint8Array, hex: string) {
    const clean = hex.length % 2 === 0 ? hex : hex.slice(0, hex.length - 1);
    const bytes = Math.min(this.length, clean.length / 2);
    for (let i = 0; i < bytes; i++) this[i] = parseInt(clean.substr(i * 2, 2), 16);
    return { read: bytes * 2, written: bytes };
  };
}
if (typeof (Uint8Array as unknown as { fromHex?: unknown }).fromHex !== "function") {
  (Uint8Array as unknown as { fromHex: (hex: string) => Uint8Array }).fromHex = function (hex: string) {
    const clean = hex.length % 2 === 0 ? hex : hex.slice(0, hex.length - 1);
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
    return out;
  };
}

import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
