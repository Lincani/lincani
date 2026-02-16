"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { API_BASE } from "@/lib/api"; // ✅ NEW: consistent API base

const ACCENT = "#4681f4";
const TERMS_VERSION = "2026-02-12";
const APP_NAME = "BreedLink";

export default function Signup() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPw, setShowPw] = useState(false);

  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NEW: after signup, we show "check your email"
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return !!name && !!email && password.length >= 8 && agreed && !loading;
  }, [name, email, password, agreed, loading]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (!showTerms) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showTerms]);

  async function handleSignup() {
    setError(null);

    if (!name || !email || !password) {
      setError("Please fill out all fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (!agreed) {
      setError("You must agree to the Terms of Service.");
      return;
    }

    setLoading(true);

    try {

      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          agreedToTerms: agreed,
          termsVersion: TERMS_VERSION,
        }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        throw new Error(data?.message || "Signup failed.");
      }

      // ✅ REAL FLOW: no token stored, no dashboard redirect.
      setSignupSuccess(true);
      setSuccessMsg(data?.message || "Signup successful. Please verify your email to continue.");
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // (Button will work after we add the endpoint next step)
  async function resendVerification() {
    setError(null);
    setLoading(true);
    try {
      // 
      const res = await fetch(`${API_BASE}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data?.message || "Failed to resend email.");
      setSuccessMsg(data?.message || "Verification email resent. Check your inbox.");
    } catch (err: any) {
      setError(err?.message || "Failed to resend.");
    } finally {
      setLoading(false);
    }
  }

  // If success screen, show it
  if (signupSuccess) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(to bottom, #000, #0b0b0b 40%, #000)",
          padding: 20,
          color: "white",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            width: "100%",
            maxWidth: 520,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 22,
            padding: 22,
            boxShadow: "0 18px 60px rgba(0,0,0,0.75)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
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
            <div style={{ fontWeight: 900 }}>{APP_NAME}</div>
          </div>

          <div
            style={{
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 18,
              padding: 18,
            }}
          >
            <h1 style={{ margin: "2px 0 6px", textAlign: "center" }}>Check your email</h1>
            <div style={{ textAlign: "center", opacity: 0.82, fontSize: 13 }}>
              We sent a verification link to:
            </div>

            <div
              style={{
                marginTop: 10,
                textAlign: "center",
                fontWeight: 900,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              {email}
            </div>

            {successMsg && (
              <div
                style={{
                  marginTop: 12,
                  textAlign: "center",
                  fontSize: 13,
                  opacity: 0.85,
                }}
              >
                {successMsg}
              </div>
            )}

            {error && (
              <div
                style={{
                  marginTop: 12,
                  color: "#ffb4b4",
                  background: "rgba(255, 80, 80, 0.10)",
                  border: "1px solid rgba(255, 80, 80, 0.30)",
                  padding: "10px 12px",
                  borderRadius: 12,
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              <button
                type="button"
                onClick={resendVerification}
                disabled={loading || !email}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.04)",
                  color: "white",
                  fontWeight: 800,
                  cursor: "pointer",
                  opacity: loading ? 0.65 : 1,
                }}
              >
                {loading ? "Sending..." : "Resend verification email"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/login")}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 14,
                  border: "none",
                  background: ACCENT,
                  color: "white",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Go to Login
              </button>

              <button
                type="button"
                onClick={() => router.push("/")}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "transparent",
                  color: "white",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Back to Home
              </button>
            </div>

            <div style={{ marginTop: 12, textAlign: "center", fontSize: 11, opacity: 0.6 }}>
              Your account stays locked until you verify.
            </div>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <>
      {/* ===== TERMS MODAL (SCROLLABLE FULL TERMS) ===== */}
      {showTerms && (
        <div
          onClick={() => setShowTerms(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 860,
              width: "100%",
              height: "min(80vh, 760px)",
              background: "#151515",
              borderRadius: 20,
              boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "white",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "18px 22px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(180deg, rgba(70,129,244,0.14), rgba(0,0,0,0))",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900 }}>Terms of Service</div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                    {APP_NAME} — Version {TERMS_VERSION}
                  </div>
                </div>

                <button type="button" onClick={() => setShowTerms(false)} style={ghostBtn}>
                  Close
                </button>
              </div>
            </div>

            <div
              style={{
                padding: "18px 22px",
                overflowY: "auto",
                lineHeight: 1.65,
                fontSize: 14,
                color: "rgba(255,255,255,0.86)",
              }}
            >
              <p style={{ marginTop: 0 }}>
                These Terms of Service (“Terms”) govern your access to and use of {APP_NAME}
                (the “Service”). By creating an account or using the Service, you agree to these Terms.
              </p>

              <h3 style={h3}>1) Who we are</h3>
              <p>
                {APP_NAME} provides a community and marketplace-style platform for dog listings, breeder
                profiles, posts, and messages. {APP_NAME} does not own, sell, buy, transport, or take
                custody of animals.
              </p>

              <h3 style={h3}>2) Eligibility and accounts</h3>
              <p>
                You must be at least 18 years old (or the age of majority where you live) to use the
                Service. You are responsible for maintaining the confidentiality of your account and for
                all activities under your account.
              </p>

              <h3 style={h3}>3) User content</h3>
              <p>
                You may post content such as listings, photos, text, and documents (“User Content”). You
                retain ownership of your User Content, but you grant {APP_NAME} a non-exclusive,
                worldwide, royalty-free license to host, store, reproduce, format, display, and distribute
                your User Content solely for operating and improving the Service.
              </p>

              <h3 style={h3}>4) Animal welfare and responsible use</h3>
              <p>
                The Service is intended to promote responsible pet ownership and ethical breeding. You
                agree you will not use the Service to facilitate cruelty, neglect, fighting, scams, or
                illegal activity.
              </p>

              <h3 style={h3}>5) No veterinary or legal advice</h3>
              <p>
                {APP_NAME} is not a veterinary clinic and does not provide veterinary, medical, or legal
                advice.
              </p>

              <h3 style={h3}>6) Transactions and third-party interactions</h3>
              <p>
                Any agreements, communications, or transactions between users are solely between the users.
                {APP_NAME} is not a party to those agreements.
              </p>

              <h3 style={h3}>7) Prohibited conduct</h3>
              <ul style={ul}>
                <li style={li}>Harassment, threats, stalking, or harmful behavior</li>
                <li style={li}>Fraud, impersonation, or deceptive listings</li>
                <li style={li}>Uploading malware or attempting to disrupt the Service</li>
                <li style={li}>Hate speech, explicit sexual content, or graphic violence</li>
                <li style={li}>Posting others’ personal data without permission (doxxing)</li>
              </ul>

              <h3 style={h3}>8) Moderation and enforcement</h3>
              <p>
                We may remove content, restrict features, or suspend accounts if we believe it is necessary.
              </p>

              <h3 style={h3}>9) Intellectual property</h3>
              <p>
                The Service, including its branding and software, is owned by {APP_NAME} or its licensors.
              </p>

              <h3 style={h3}>10) Privacy</h3>
              <p>Your use of the Service is also governed by our Privacy practices.</p>

              <h3 style={h3}>11) Disclaimers</h3>
              <p style={caps}>
                THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” {APP_NAME} DISCLAIMS ALL WARRANTIES.
              </p>

              <h3 style={h3}>12) Limitation of liability</h3>
              <p style={caps}>
                {APP_NAME} WILL NOT BE LIABLE FOR INDIRECT OR CONSEQUENTIAL DAMAGES.
              </p>

              <h3 style={h3}>13) Termination</h3>
              <p>You may stop using the Service at any time.</p>

              <h3 style={h3}>14) Changes to these Terms</h3>
              <p>We may update these Terms from time to time by updating the version/date.</p>

              <h3 style={h3}>15) Contact</h3>
              <p>Questions about these Terms? Contact support through the Service.</p>

              <div style={{ marginTop: 16, fontSize: 12, opacity: 0.7 }}>
                Note: This template is provided for general informational purposes and is not legal advice.
              </div>
            </div>

            <div
              style={{
                padding: "14px 22px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                background: "rgba(0,0,0,0.25)",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.75 }}>You must accept to create an account.</div>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setShowTerms(false)} style={ghostBtn}>
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAgreed(true);
                    setShowTerms(false);
                    setError(null);
                  }}
                  style={primaryBtn}
                >
                  Agree & Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== SIGNUP PAGE (PREMIUM CARD) ===== */}
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(to bottom, #000, #0b0b0b 40%, #000)",
          padding: 20,
          color: "white",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            width: "100%",
            maxWidth: 420,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 22,
            padding: 22,
            boxShadow: "0 18px 60px rgba(0,0,0,0.75)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <button
              type="button"
              onClick={() => router.push("/")}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "white",
                padding: "8px 12px",
                borderRadius: 12,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              ← Home
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 12,
                opacity: 0.85,
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 999,
                  background: ACCENT,
                  boxShadow: `0 0 18px ${ACCENT}`,
                  display: "inline-block",
                }}
              />
              <span style={{ fontWeight: 700 }}>{APP_NAME}</span>
              <span style={{ opacity: 0.7 }}>• Create Account</span>
            </div>
          </div>

          <div
            style={{
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 18,
              padding: 18,
            }}
          >
            <h1 style={{ textAlign: "center", margin: "2px 0 6px" }}>Create Account</h1>
            <div style={{ textAlign: "center", fontSize: 13, opacity: 0.75, marginBottom: 16 }}>
              Join the community and connect responsibly.
            </div>

            <Field label="Name">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" style={inputStyle} />
            </Field>

            <Field label="Email">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" style={inputStyle} />
            </Field>

            <Field label="Password">
              <div style={{ position: "relative" }}>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  type={showPw ? "text" : "password"}
                  style={{ ...inputStyle, paddingRight: 86 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    color: "white",
                    padding: "6px 10px",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </Field>

            <div style={{ marginTop: 8, marginBottom: 12, fontSize: 13 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => {
                    setAgreed(e.target.checked);
                    if (e.target.checked) setError(null);
                  }}
                  style={{ marginTop: 3 }}
                />
                <span style={{ opacity: 0.9 }}>
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "white",
                      textDecoration: "underline",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Terms of Service
                  </button>
                  .
                </span>
              </label>
            </div>

            {error && (
              <div
                style={{
                  color: "#ffb4b4",
                  background: "rgba(255, 80, 80, 0.10)",
                  border: "1px solid rgba(255, 80, 80, 0.30)",
                  padding: "10px 12px",
                  borderRadius: 12,
                  marginBottom: 12,
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handleSignup}
              disabled={!canSubmit}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 14,
                border: "none",
                background: ACCENT,
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
                opacity: canSubmit ? 1 : 0.55,
                boxShadow: canSubmit ? `0 0 22px rgba(70,129,244,0.35)` : "none",
              }}
            >
              {loading ? "Creating..." : "Create Account"}
            </button>

            <div style={{ marginTop: 14, textAlign: "center", opacity: 0.82, fontSize: 13 }}>
              Already have an account?{" "}
              <a href="/login" style={{ textDecoration: "underline", color: "white" }}>
                Login
              </a>
            </div>

            <div style={{ marginTop: 12, textAlign: "center", fontSize: 11, opacity: 0.6 }}>
              By signing up, you acknowledge version {TERMS_VERSION}.
            </div>
          </div>
        </motion.div>
      </main>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.78, marginBottom: 6, fontWeight: 700 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "#0b0b0b",
  color: "white",
  outline: "none",
};

const ghostBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  color: "white",
  padding: "8px 12px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 700,
};

const primaryBtn: React.CSSProperties = {
  background: ACCENT,
  border: "none",
  color: "white",
  padding: "10px 14px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 800,
};

const h3: React.CSSProperties = {
  margin: "16px 0 8px",
  fontSize: 14,
  fontWeight: 900,
  color: "white",
};

const ul: React.CSSProperties = {
  margin: "8px 0 12px 18px",
};

const li: React.CSSProperties = {
  margin: "6px 0",
};

const caps: React.CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: 0.2,
  fontSize: 13,
  opacity: 0.92,
};
