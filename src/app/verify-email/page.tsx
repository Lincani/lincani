"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { API_BASE } from "@/lib/api"; // ✅ NEW

const ACCENT = "#4681f4";

// Helps Next/Vercel avoid trying to pre-render this route as static
export const dynamic = "force-dynamic";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <VerifyEmailInner />
    </Suspense>
  );
}

function Fallback() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        color: "white",
        background: "linear-gradient(to bottom, #000, #0b0b0b 40%, #000)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 22,
          padding: 22,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
          boxShadow: "0 18px 60px rgba(0,0,0,0.75)",
        }}
      >
        <div style={{ fontWeight: 900 }}>BreedLink • Email Verification</div>
        <div style={{ marginTop: 10, opacity: 0.85 }}>Loading…</div>
      </div>
    </main>
  );
}

function VerifyEmailInner() {
  const router = useRouter();
  const search = useSearchParams();

  const token = search.get("token") || "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        setStatus("error");
        setMessage("Missing token. Please use the link from your email.");
        return;
      }

      try {
        const res = await fetch(
          `${API_BASE}/auth/verify-email?token=${encodeURIComponent(token)}`
        );
        const data = await res.json().catch(() => ({} as any));

        if (!res.ok) throw new Error((data as any)?.message || "Verification failed.");

        if (cancelled) return;
        setStatus("success");
        setMessage("Email verified. Redirecting to login...");

        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } catch (err: any) {
        if (cancelled) return;
        setStatus("error");
        setMessage(err?.message || "Verification failed.");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        color: "white",
        background: "linear-gradient(to bottom, #000, #0b0b0b 40%, #000)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 22,
          padding: 22,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
          boxShadow: "0 18px 60px rgba(0,0,0,0.75)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: ACCENT,
              boxShadow: `0 0 18px ${ACCENT}`,
              display: "inline-block",
            }}
          />
          <div style={{ fontWeight: 900 }}>BreedLink • Email Verification</div>
        </div>

        <div
          style={{
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 18,
            padding: 18,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>
            {status === "loading"
              ? "Working…"
              : status === "success"
              ? "Verified ✅"
              : "Verification failed"}
          </div>

          <div style={{ opacity: 0.85, lineHeight: 1.6 }}>{message}</div>

          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <button
              onClick={() => router.push("/")}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "transparent",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Home
            </button>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
