"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getSession, onAuthChange } from "@/lib/auth";

const ACCENT = "#4681f4";
const NAV_BG = "#21222b";

const PUPPY_URLS = [
  "https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1598133894009-2d9f9b9f7f3a?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1537151625747-768eb6cf92b6?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1568572933382-74d440642117?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1507149833265-60c372daea22?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1525253086316-d0c936c814f8?auto=format&fit=crop&w=1400&q=80",
];

const NAV_H = 84;

/**
 * ✅ FIX: hero was overlapping the fixed navbar because the whole hero stack
 * was being translated upward with translateY(-STACK_SHIFT).
 *
 * New approach:
 * - Reserve navbar space with paddingTop: NAV_H
 * - Add a small "safe gap" so the card never touches the nav
 * - Position puppy bands using absolute top values under the nav
 */
const HERO_SAFE_GAP = 32; // space between navbar bottom and hero content

// ✅ 3 evenly spaced bands
const BAND_START_TOP = NAV_H + HERO_SAFE_GAP + 12; // where band #1 starts
const BAND_GAP = 520; // spacing between each band (tweak if you want tighter/looser)

const BAND_1_TOP = `calc(${BAND_START_TOP}px)`;
const BAND_2_TOP = `calc(${BAND_START_TOP + BAND_GAP}px)`;
const BAND_3_TOP = `calc(${BAND_START_TOP + BAND_GAP * 2}px)`;

// ✅ Premium gradient text
const GRADIENT_TEXT: React.CSSProperties = {
  background: `linear-gradient(90deg, ${ACCENT} 0%, #7c5cff 40%, #30d5ff 100%)`,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const GRADIENT_TEXT_2: React.CSSProperties = {
  background: `linear-gradient(90deg, #ffffff 0%, ${ACCENT} 38%, #9a6bff 100%)`,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

export default function Home() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(() => !!getSession());
  const [profileLabel, setProfileLabel] = useState("Profile");

  useEffect(() => {
    const sync = () => {
      const s = getSession();
      const isIn = !!s;
      setLoggedIn(isIn);

      if (s?.email) {
        const base = s.email.split("@")[0] || "Profile";
        const nice = base
          .replace(/[._-]+/g, " ")
          .split(" ")
          .filter(Boolean)
          .map((w) => w[0].toUpperCase() + w.slice(1))
          .join(" ");
        setProfileLabel(nice || "Profile");
      } else {
        setProfileLabel("Profile");
      }
    };

    sync();
    const off = onAuthChange(sync);

    const onStorage = () => sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", sync);

    return () => {
      off?.();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", sync);
    };
  }, []);

  function logout() {
    clearSession();
    setLoggedIn(false);
    router.refresh();
  }

  const getStartedHref = loggedIn ? "/dashboard" : "/login";

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #111 0%, #0b0b0b 60%, #090909 100%)",
        color: "#fff",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* NAVBAR */}
      <header className="nav" style={{ height: NAV_H }}>
        <div className="navInner">
          <Link className="brand" href="/" aria-label="BreedLink home">
            <img className="brandLogo" src="/logo.png" alt="BreedLink" />
            <span className="brandText">
              <span className="brandAccent">B</span>reed
              <span className="brandAccent">L</span>ink
            </span>
          </Link>

          <nav className="navLinks" aria-label="Primary">
            <a className="navLink" href="#">
              Find a match
            </a>
            <a className="navLink" href="#">
              Breeders
            </a>
            <a className="navLink" href="#">
              How it works
            </a>
            <a className="navLink" href="#safety">
              Safety
            </a>
          </nav>

          <div className="navActions">
            {loggedIn ? (
              <>
                <Link className="ghostBtn" href="/dashboard" title="Your profile">
                  {profileLabel}
                </Link>

                <button className="ghostBtn" onClick={logout} type="button">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link className="ghostBtn" href="/login">
                  Log in
                </Link>

                <Link className="primaryBtn" href="/signup">
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ✅ SOLID BACKDROP UNDER ALL BANDS */}
      <BandStage />

      {/* BACKGROUND PUPPY BANDS */}
      <PuppyBands />

      {/* HERO STACK */}
      <section
        style={{
          position: "relative",
          zIndex: 2,

          // ✅ Reserve navbar space + safe gap (no overlap ever)
          paddingTop: NAV_H + HERO_SAFE_GAP,

          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          paddingBottom: 80,
        }}
      >
        {/* HERO CARD */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42 }}
          className="premiumCard"
          style={{
            width: "min(920px, calc(100% - 56px))",
            padding: "58px 70px",
            borderRadius: 28,
            textAlign: "center",
          }}
        >
          <div className="pill" style={{ marginInline: "auto" }}>
            <span className="pillDot" />
            Trusted • Verified • Secure
          </div>

          <h1 style={{ fontSize: 72, margin: "18px 0 14px", lineHeight: 1.08 }}>
            <span style={GRADIENT_TEXT}>Breed responsibly.</span>{" "}
            <span style={GRADIENT_TEXT_2}>Match confidently.</span>
          </h1>

          <p
            style={{
              opacity: 0.86,
              marginBottom: 34,
              fontSize: 20,
              lineHeight: 1.75,
              maxWidth: 760,
              marginInline: "auto",
              color: "rgba(255,255,255,0.86)",
            }}
          >
            Verified breeders, safe match requests, documented health info —
            everything designed to make responsible breeding easier and safer.
          </p>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <Link className="primaryBtn heroCta" href={getStartedHref}>
              Get started
            </Link>
          </div>

          <div style={{ marginTop: 28, opacity: 0.75, fontSize: 14 }}>
            ✓ Verified breeders • ✓ Health documentation • ✓ ID verification • ✓
            Secure match requests
          </div>
        </motion.div>

        {/* SAFETY CARD */}
        <section
          id="safety"
          style={{
            width: "min(1120px, calc(100% - 56px))",
            marginTop: -6,
          }}
        >
          <div
            className="premiumCard"
            style={{
              borderRadius: 28,
              padding: "60px 54px",
              boxShadow: "0 22px 80px rgba(0,0,0,0.70)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 42 }}>
              <div className="pill" style={{ marginInline: "auto" }}>
                <span className="pillDot" />
                <span style={{ ...GRADIENT_TEXT, fontWeight: 900 }}>
                  Safety first
                </span>
              </div>

              <h2
                style={{
                  fontSize: 52,
                  margin: "18px 0 10px",
                  lineHeight: 1.12,
                }}
              >
                <span style={GRADIENT_TEXT_2}>Safety & Responsible Breeding</span>
              </h2>

              <p
                style={{
                  maxWidth: 860,
                  margin: "0 auto",
                  opacity: 0.86,
                  lineHeight: 1.8,
                  fontSize: 20,
                  color: "rgba(255,255,255,0.86)",
                }}
              >
                BreedLink is designed to support ethical breeding decisions through
                verification, documentation, and secure communication — helping
                protect pets, owners, and the integrity of each match.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 18,
              }}
            >
              <SafetyCard
                title="Identity & Ownership Verification"
                desc="Account verification helps confirm breeder identity and establish accountability on the platform."
              />
              <SafetyCard
                title="Health Documentation Encouraged"
                desc="Vaccinations, genetic screening, and health history can be shared to promote informed breeding."
              />
              <SafetyCard
                title="Secure In-App Messaging"
                desc="Keep conversations private and reduce risk by communicating inside BreedLink — not public contact posts."
              />
              <SafetyCard
                title="Reporting & Moderation"
                desc="Community reporting tools and moderation workflows help maintain a safe, trusted environment."
              />
            </div>

            <div
              style={{
                marginTop: 30,
                paddingTop: 22,
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.94,
              }}
            >
              <div style={{ fontSize: 14, opacity: 0.82, lineHeight: 1.65 }}>
                <span style={{ color: ACCENT, fontWeight: 900 }}>Note:</span>{" "}
                BreedLink supports responsible breeding through tools and
                transparency. Users remain responsible for compliance with local
                laws, veterinary guidance, and animal welfare standards.
              </div>
            </div>
          </div>
        </section>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          position: "relative",
          zIndex: 2,
          padding: "28px 22px 40px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(10,10,10,0.55)",
          backdropFilter: "blur(10px)",
          marginTop: -40,
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
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
            <span style={{ fontWeight: 800 }}>
              © {new Date().getFullYear()} BreedLink
            </span>
            <span style={{ opacity: 0.6 }}>•</span>
            <span style={{ opacity: 0.7 }}>
              Responsible breeding, safer matches.
            </span>
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <a className="footerLink" href="#safety">
              Safety
            </a>
            <Link className="footerLink" href="/terms">
              Terms
            </Link>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        /* NAVBAR */
        .nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 10;
          height: ${NAV_H}px;
          display: flex;
          align-items: center;
          background: ${NAV_BG};
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(70, 129, 244, 0.85);
          box-shadow: 0 0 10px rgba(70, 129, 244, 0.55);
          box-sizing: border-box;
        }

        .navInner {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          padding: 0 clamp(10px, 2vw, 22px);
          gap: clamp(10px, 1.6vw, 18px);
          height: 100%;
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: clamp(8px, 1.2vw, 14px);
          text-decoration: none;
          flex: 0 0 auto;
          min-width: fit-content;
        }

        .brandLogo {
          height: clamp(68px, 4.2vw, 84px);
          width: auto;
          display: block;
        }

        .brandText {
          font-size: clamp(18px, 1.8vw, 26px);
          font-weight: 800;
          letter-spacing: 0.5px;
          color: white;
          line-height: 1;
          white-space: nowrap;
        }

        .brandAccent {
          color: ${ACCENT};
          text-shadow: 0 0 10px rgba(70, 129, 244, 0.6);
        }

        .navLinks {
          flex: 1 1 auto;
          display: flex;
          justify-content: center;
          gap: clamp(10px, 1.8vw, 18px);
          align-items: center;
          min-width: 0;
        }

        .navLink {
          color: rgba(255, 255, 255, 0.78);
          text-decoration: none;
          font-size: clamp(12px, 1.05vw, 14px);
          font-weight: 650;
          padding: 8px 10px;
          border-radius: 12px;
          transition: background 0.2s ease, color 0.2s ease;
          white-space: nowrap;
        }

        .navLink:hover {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.92);
        }

        .navActions {
          flex: 0 0 auto;
          display: flex;
          gap: clamp(8px, 1.2vw, 12px);
          align-items: center;
          min-width: fit-content;
        }

        /* Premium cards */
        .premiumCard {
          background: linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.06) 0%,
              rgba(255, 255, 255, 0.03) 40%,
              rgba(255, 255, 255, 0.02) 100%
            ),
            rgba(14, 14, 14, 0.62);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 18px 70px rgba(0, 0, 0, 0.65);
          position: relative;
          overflow: hidden;
        }

        .premiumCard::before {
          content: "";
          position: absolute;
          inset: -2px;
          background: radial-gradient(
            640px 200px at 50% 0%,
            rgba(70, 129, 244, 0.22),
            transparent 62%
          );
          pointer-events: none;
        }

        .premiumCard::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            rgba(70, 129, 244, 0.1),
            rgba(124, 92, 255, 0.06),
            rgba(48, 213, 255, 0.08)
          );
          opacity: 0.1;
          pointer-events: none;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(70, 129, 244, 0.1);
          border: 1px solid rgba(70, 129, 244, 0.22);
          color: rgba(255, 255, 255, 0.86);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.2px;
          width: fit-content;
          position: relative;
          z-index: 2;
        }

        .pillDot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: ${ACCENT};
          box-shadow: 0 0 14px rgba(70, 129, 244, 0.75);
          display: inline-block;
        }

        .primaryBtn,
        .ghostBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          height: 48px;
          padding: 0 clamp(14px, 1.8vw, 22px);
          border-radius: 16px;
          font-weight: 800;
          font-size: 15px;
          white-space: nowrap;
          position: relative;
          z-index: 2;
        }

        .primaryBtn {
          background: ${ACCENT};
          color: white;
          border: none;
          box-shadow: 0 16px 46px rgba(70, 129, 244, 0.28);
        }

        .ghostBtn {
          background: transparent;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.18);
        }

        .heroCta {
          height: 58px;
          padding: 0 30px;
          border-radius: 18px;
          font-size: 16px;
          box-shadow: 0 20px 70px rgba(70, 129, 244, 0.38);
          transition: transform 0.15s ease, box-shadow 0.15s ease,
            filter 0.15s ease;
        }

        .heroCta:hover {
          transform: translateY(-1px);
          filter: brightness(1.05);
          box-shadow: 0 26px 84px rgba(70, 129, 244, 0.45);
        }

        button.ghostBtn {
          cursor: pointer;
          font: inherit;
        }

        .footerLink {
          color: rgba(255, 255, 255, 0.72);
          text-decoration: none;
          font-size: 13px;
          font-weight: 650;
          padding: 8px 10px;
          border-radius: 12px;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .footerLink:hover {
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.92);
        }

        /* ✅ FILM FRAME — CONSIDERABLY BIGGER */
        .filmFrame {
          width: 680px;
          height: 240px;
          background: #0b0b0b;
          border-radius: 18px;
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.65);
        }

        .filmFrame::before {
          content: "";
          position: absolute;
          left: 12px;
          right: 12px;
          top: 10px;
          height: 12px;
          background-image: repeating-linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.9) 0 12px,
            rgba(255, 255, 255, 0) 12px 22px
          );
          opacity: 0.9;
          border-radius: 999px;
          pointer-events: none;
          filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.6));
        }

        .filmFrame::after {
          content: "";
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 10px;
          height: 12px;
          background-image: repeating-linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.9) 0 12px,
            rgba(255, 255, 255, 0) 12px 22px
          );
          opacity: 0.9;
          border-radius: 999px;
          pointer-events: none;
          filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.6));
        }

        .filmInner {
          position: absolute;
          inset: 32px 14px;
          border-radius: 14px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .filmInner > .img {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          transform: scale(1.03);
          filter: saturate(1.05) contrast(1.04);
        }

        .filmGloss {
          position: absolute;
          inset: 32px 14px;
          border-radius: 14px;
          pointer-events: none;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.16),
            rgba(255, 255, 255, 0.02) 45%,
            rgba(0, 0, 0, 0.1)
          );
          opacity: 0.35;
          mix-blend-mode: screen;
        }

        @media (max-width: 1024px) {
          .filmFrame {
            width: 560px;
            height: 210px;
          }
        }

        @media (max-width: 820px) {
          .navLinks {
            display: none;
          }
        }

        @media (max-width: 520px) {
          .brandText {
            display: none;
          }
          .filmFrame {
            width: 420px;
            height: 180px;
          }
        }

        @keyframes scrollLeft {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        @keyframes scrollRight {
          from {
            transform: translateX(-50%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </main>
  );
}

function SafetyCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div
      style={{
        padding: 22,
        borderRadius: 18,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        minHeight: 128,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(520px 150px at 50% 0%, rgba(70,129,244,0.12), transparent 58%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          fontSize: 15,
          fontWeight: 900,
          marginBottom: 8,
          zIndex: 1,
          position: "relative",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 15,
          opacity: 0.84,
          lineHeight: 1.65,
          zIndex: 1,
          position: "relative",
        }}
      >
        {desc}
      </div>
    </div>
  );
}

/* ✅ SOLID backdrop under all bands */
function BandStage() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        right: 0,

        top: `calc(${BAND_START_TOP - 24}px)`,
        height: `calc(${BAND_GAP * 2 + 320}px)`,

        // ✅ Solid shade
        background: "#0e1016",

        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",

        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}

function PuppyBands() {
  const bands = [
    {
      top: BAND_1_TOP,
      anim: "scrollLeft 140s linear infinite",
      opacity: 0.26,
    },
    {
      top: BAND_2_TOP,
      anim: "scrollRight 140s linear infinite",
      opacity: 0.22,
    },
    {
      top: BAND_3_TOP,
      anim: "scrollLeft 140s linear infinite",
      opacity: 0.2,
    },
  ];

  return (
    <>
      {bands.map((b, idx) => (
        <div
          key={idx}
          style={{
            position: "absolute",
            top: b.top,
            left: 0,
            right: 0,
            overflow: "hidden",
            opacity: b.opacity,

            // ✅ bands above stage
            zIndex: 1,

            pointerEvents: "none",
          }}
        >
          <SlideRow animation={b.anim} />
        </div>
      ))}
    </>
  );
}

function SlideRow({ animation }: { animation: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 30,
        width: "max-content",
        animation,
        paddingLeft: 18,
        paddingRight: 18,
      }}
    >
      {[...PUPPY_URLS, ...PUPPY_URLS].map((url, i) => (
        <div key={i} className="filmFrame">
          <div className="filmInner">
            <div className="img" style={{ backgroundImage: `url(${url})` }} />
          </div>
          <div className="filmGloss" />
        </div>
      ))}
    </div>
  );
}
