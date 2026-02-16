// src/lib/api.ts
export const API_BASE = (() => {
  // On the client (browser), NEVER rely on "process"
  if (typeof window !== "undefined") {
    // Prefer a value that was compiled into the build
    // (Vercel env var NEXT_PUBLIC_API_BASE)
    // If it's missing, fall back to the live Render backend.
    const compiled = (globalThis as any).__NEXT_PUBLIC_API_BASE__ as string | undefined;
    return (compiled || "https://lincani.onrender.com").replace(/\/$/, "");
  }

  // On the server (SSR / build), process.env is allowed
  return (process.env.NEXT_PUBLIC_API_BASE || "https://lincani.onrender.com").replace(/\/$/, "");
})();
