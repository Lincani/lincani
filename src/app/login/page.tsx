"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSession, setSession } from "@/lib/auth";

const ACCENT = "#4681f4";

export default function LoginGate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  // ✅ If already logged in, skip login page
  useEffect(() => {
    const s = getSession();
    if (s) router.replace("/dashboard");
  }, [router]);

  function closeModal() {
    setOpen(false);
    setEmail("");
    setPw("");
    setShow(false);
    setLoading(false);
    setError(null);
    setNeedsVerify(false);
    setResendMsg(null);
  }

  // ✅ Resend verification email (uses your existing backend route)
  async function resendVerification() {
    setResendMsg(null);

    try {
      const res = await fetch("http://localhost:5000/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));
      setResendMsg(data?.message || "Verification email resent. Check your inbox.");
    } catch {
      setResendMsg("Failed to resend verification email.");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNeedsVerify(false);
    setResendMsg(null);

    try {
      const res = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: pw,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // ✅ 403 from backend = email not verified
        if (res.status === 403) {
          setNeedsVerify(true);
          setError(
            "Please verify your email before signing in. Check your inbox or resend the verification email."
          );
          setPw(""); // ✅ clear password after failure
          setLoading(false);
          return;
        }

        setError(data?.message || "Invalid email or password.");
        setPw(""); // ✅ clear password after failure
        setLoading(false);
        return;
      }

      // ✅ Save real JWT + user (same keys as signup page)
      localStorage.setItem("breedlink_token", data.token);
      localStorage.setItem("breedlink_user", JSON.stringify(data.user));

      // ✅ Keep your existing session helper (so other UI doesn't break)
      setSession({ email });

      setLoading(false);
      closeModal();
      router.push("/dashboard");
    } catch (err: any) {
      const msg = err?.message || "Something went wrong.";

      // If backend message contains "verify", show resend button too
      if (String(msg).toLowerCase().includes("verify")) {
        setNeedsVerify(true);
      }

      setError(msg);
      setPw(""); // ✅ clear password after failure
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "0 7vw",
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(circle at top, #141414 0%, #0b0b0b 55%, #090909 100%)",
        color: "white",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      {/* subtle background glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 30% 40%, rgba(70,129,244,0.18), transparent 55%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Big background logo (soft) */}
      <img
        src="/logo.png"
        alt="BreedLink"
        style={{
          position: "absolute",
          top: "50%",
          left: "60%",
          transform: "translate(-50%, -50%)",
          width: "1600px",
          maxWidth: "160vw",
          opacity: 0.1,
          filter: "blur(2px)",
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 0,
        }}
      />

      {/* CONTENT ROW */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 1200,
          display: "grid",
          gridTemplateColumns: "520px 1fr",
          alignItems: "center",
          gap: 36,
        }}
      >
        {/* LEFT: BIG LOGO */}
        <div style={{ display: "grid", gap: 18, justifyItems: "start" }}>
          <img
            src="/logo.png"
            alt="BreedLink"
            style={{
              width: 420,
              maxWidth: "70vw",
              height: "auto",
              filter: "drop-shadow(0 18px 50px rgba(0,0,0,0.55))",
            }}
          />

          <div style={{ opacity: 0.72, fontSize: 16, maxWidth: 520 }} />
        </div>

        {/* RIGHT: BUTTON PANEL */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            justifySelf: "start",
            borderRadius: 26,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(14px)",
            padding: 26,
            boxShadow: "0 20px 60px rgba(0,0,0,0.65)",
            width: 420,
            maxWidth: "92vw",
          }}
        >
          <h1 style={{ fontSize: 44, fontWeight: 950, margin: 0, lineHeight: 1.05 }}>
            Breed smarter.
            <br />
            <span style={{ color: ACCENT }}>Match responsibly.</span>
          </h1>

          <div style={{ marginTop: 14, opacity: 0.72, fontSize: 14, lineHeight: 1.5 }}>
            Start by signing in, or create an account to join the community.
          </div>

          <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
            <button onClick={() => setOpen(true)} style={primaryBtn}>
              Sign in
            </button>

            {/* OR Divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                opacity: 0.7,
                margin: "2px 0",
              }}
            >
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.15)" }} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>OR</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.15)" }} />
            </div>

            <Link href="/signup" style={{ textDecoration: "none" }}>
              <div style={secondaryBtn}>Create account</div>
            </Link>
          </div>

          <div style={{ marginTop: 14, opacity: 0.62, fontSize: 12 }}>
            By continuing, you agree to BreedLink’s community standards.
          </div>
        </motion.div>
      </div>

      {/* MODAL: Sign in */}
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={overlay}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              style={modal}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <img src="/logo.png" alt="BreedLink" style={{ height: 34, width: "auto" }} />
                  <div style={{ fontWeight: 900, opacity: 0.9 }}>Sign in</div>
                </div>

                <button onClick={closeModal} style={closeBtn} aria-label="Close" title="Close">
                  ✕
                </button>
              </div>

              <div style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>
                Enter your email and password to continue.
              </div>

              {error && (
                <div
                  style={{
                    marginTop: 12,
                    color: "#ffb4b4",
                    background: "rgba(255, 80, 80, 0.10)",
                    border: "1px solid rgba(255, 80, 80, 0.30)",
                    padding: "10px 12px",
                    borderRadius: 14,
                    fontSize: 13,
                  }}
                >
                  {error}

                  {/* ✅ Resend button shows only when verification is needed */}
                  {needsVerify && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={resendVerification}
                        disabled={loading || !email.trim()}
                        style={{
                          background: "none",
                          border: "none",
                          color: ACCENT,
                          fontWeight: 900,
                          cursor: "pointer",
                          textDecoration: "underline",
                          opacity: loading ? 0.7 : 1,
                        }}
                      >
                        Resend verification email
                      </button>
                    </div>
                  )}

                  {/* ✅ Feedback after resend */}
                  {resendMsg && (
                    <div style={{ marginTop: 8, color: "#9be7a0", fontWeight: 700 }}>
                      {resendMsg}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={label}>Email</div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    style={input}
                  />
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={label}>Password</div>
                  <div style={{ position: "relative" }}>
                    <input
                      type={show ? "text" : "password"}
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{ ...input, paddingRight: 52 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      style={eyeBtn}
                      aria-label="Toggle password visibility"
                      title="Show/Hide"
                    >
                      {show ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} style={{ ...primaryBtn, marginTop: 4 }}>
                  {loading ? "Signing in…" : "Sign in"}
                </button>

                <div style={{ textAlign: "center", fontSize: 13, opacity: 0.8 }}>
                  New here?{" "}
                  <Link href="/signup" style={{ color: ACCENT, fontWeight: 900 }}>
                    Create an account
                  </Link>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

/* ---------- styles ---------- */

const primaryBtn: React.CSSProperties = {
  border: "none",
  borderRadius: 18,
  padding: "14px 14px",
  fontWeight: 900,
  background: ACCENT,
  color: "white",
  cursor: "pointer",
  boxShadow: "0 12px 28px rgba(70,129,244,0.35)",
};

const secondaryBtn: React.CSSProperties = {
  borderRadius: 18,
  padding: "14px 14px",
  border: "1px solid rgba(255,255,255,0.18)",
  fontWeight: 900,
  color: "white",
  background: "rgba(255,255,255,0.04)",
  textAlign: "center",
};

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.60)",
  backdropFilter: "blur(10px)",
  display: "grid",
  placeItems: "center",
  zIndex: 9999,
  padding: 18,
};

const modal: React.CSSProperties = {
  width: "100%",
  maxWidth: 460,
  borderRadius: 24,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(20,20,20,0.78)",
  boxShadow: "0 24px 80px rgba(0,0,0,0.70)",
  padding: 22,
};

const closeBtn: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.03)",
  color: "white",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
};

const label: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  opacity: 0.9,
};

const input: React.CSSProperties = {
  width: "100%",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.03)",
  padding: "14px 14px",
  color: "white",
  outline: "none",
  boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
};

const eyeBtn: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  right: 10,
  transform: "translateY(-50%)",
  width: 40,
  height: 40,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.03)",
  color: "white",
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
};
