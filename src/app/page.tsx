"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Inter } from "next/font/google";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle,
  CheckCircle2,
  FileText,
  Lock,
  Menu,
  MessageSquare,
  Shield,
  X,
} from "lucide-react";
import { clearSession, getSession, onAuthChange } from "@/lib/auth";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const NAV_BG = "rgba(6, 12, 28, 0.72)";

export default function Home() {
  const router = useRouter();

  const [loggedIn, setLoggedIn] = useState(() => !!getSession());
  const [profileLabel, setProfileLabel] = useState("Profile");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      const s = getSession();
      setLoggedIn(!!s);

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

  const getStartedHref = loggedIn ? "/dashboard" : "/signup";

  return (
    <main className={inter.className} style={{ minHeight: "100vh", color: "#fff", background: "#020617", position: "relative", overflowX: "hidden" }}>
      <ParticleBackground />

      <header className="ln-nav">
        <div className="ln-nav-inner">
          <Link className="ln-brand" href="/" aria-label="Lincani home">
            <div className="ln-brand-mark">L</div>
            <span className="ln-brand-text">Lincani</span>
          </Link>

          <nav className="ln-nav-links" aria-label="Primary">
            <a className="ln-nav-link" href="#find-breeders">
              Find Breeders
            </a>
            <a className="ln-nav-link" href="#network">
              Network
            </a>
            <a className="ln-nav-link" href="#how-it-works">
              How It Works
            </a>
            <a className="ln-nav-link" href="#safety">
              Safety
            </a>
          </nav>

          <div className="ln-nav-actions">
            {loggedIn ? (
              <>
                <Link className="ln-btn ln-btn-ghost ln-btn-nav-ghost" href="/dashboard">
                  {profileLabel}
                </Link>
                <button className="ln-btn ln-btn-ghost ln-btn-nav-ghost" onClick={logout} type="button">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link className="ln-btn ln-btn-ghost ln-btn-nav-ghost" href="/login">
                  Log In
                </Link>
                <Link className="ln-btn ln-btn-primary ln-btn-nav-primary" href="/signup">
                  Get Started
                </Link>
              </>
            )}

            <button
              type="button"
              className="ln-mobile-toggle"
              aria-label="Toggle menu"
              onClick={() => setIsMenuOpen((v) => !v)}
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              className="ln-mobile-menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <a className="ln-mobile-link" href="#find-breeders" onClick={() => setIsMenuOpen(false)}>
                Find Breeders
              </a>
              <a className="ln-mobile-link" href="#network" onClick={() => setIsMenuOpen(false)}>
                Network
              </a>
              <a className="ln-mobile-link" href="#how-it-works" onClick={() => setIsMenuOpen(false)}>
                How It Works
              </a>
              <a className="ln-mobile-link" href="#safety" onClick={() => setIsMenuOpen(false)}>
                Safety
              </a>
              <Link className="ln-mobile-link" href="/terms" onClick={() => setIsMenuOpen(false)}>
                Terms
              </Link>

              {!loggedIn && (
                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  <Link className="ln-btn ln-btn-ghost" href="/login" onClick={() => setIsMenuOpen(false)}>
                    Log In
                  </Link>
                  <Link className="ln-btn ln-btn-primary" href="/signup" onClick={() => setIsMenuOpen(false)}>
                    Get Started
                  </Link>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <section className="ln-hero">
        <div className="ln-hero-bg" />
        <div className="ln-hero-glow ln-hero-glow-right" />
        <div className="ln-hero-glow ln-hero-glow-left" />

        <div className="ln-shell ln-hero-grid">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="ln-hero-copy-wrap"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="ln-pill"
            >
              <span className="ln-pill-dot" />
              <span>Trusted by 1,200+ Professional Breeders</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="ln-hero-title"
            >
              <span className="ln-hero-title-top">The trusted network</span>
              <span className="ln-hero-title-accent">for responsible breeders</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="ln-hero-copy"
            >
              Connect with verified breeders, share health documentation, and communicate
              securely. Lincani brings transparency and trust to ethical dog breeding.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="ln-hero-actions"
            >
              <Link className="ln-btn ln-btn-primary ln-btn-lg" href={getStartedHref}>
                {loggedIn ? "Go to Dashboard" : "Get Started Free"}
                <ArrowRight className="ln-arrow-icon" size={16} />
              </Link>

              <a className="ln-btn ln-btn-outline ln-btn-lg" href="#safety">
                How It Works
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="ln-feature-tags"
            >
              <div className="ln-feature-tag">
                <div className="ln-feature-check-wrap">
                  <CheckCircle className="ln-feature-check" size={12} />
                </div>
                <span>ID Verification</span>
              </div>

              <div className="ln-feature-tag">
                <div className="ln-feature-check-wrap">
                  <CheckCircle className="ln-feature-check" size={12} />
                </div>
                <span>Health Records</span>
              </div>

              <div className="ln-feature-tag">
                <div className="ln-feature-check-wrap">
                  <CheckCircle className="ln-feature-check" size={12} />
                </div>
                <span>Secure Messaging</span>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="ln-hero-media-wrap"
          >
            <div className="ln-hero-image-card">
              <img
                src="https://images.unsplash.com/photo-1767381392938-c95d24cd5873?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBkb2clMjBwb3J0cmFpdCUyMHN0dWRpb3xlbnwxfHx8fDE3NzMwOTE2MjB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Champion dog portrait"
                className="ln-hero-media-img"
              />
              <div className="ln-hero-image-overlay" />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="ln-verified-card"
            >
              <div className="ln-verified-icon">
                <Shield size={24} />
              </div>
              <div>
                <div className="ln-verified-number">100%</div>
                <div className="ln-verified-label">Verified</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.84 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.15, duration: 0.45 }}
              className="ln-trust-badge"
            >
              TRUSTED
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.25, duration: 0.5 }}
              className="ln-online-card"
            >
              <div className="ln-online-avatars">
                <span />
                <span />
                <span />
              </div>
              <div className="ln-online-text">
                <span className="ln-online-dot" />
                124 online
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section id="safety" className="ln-safety-section">
        <div className="ln-safety-bg" />
        <div className="ln-safety-glow ln-safety-glow-right" />
        <div className="ln-safety-glow ln-safety-glow-left" />

        <div className="ln-shell ln-safety-shell">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="ln-section-head center"
          >
            <div className="ln-pill ln-pill-section">
              <Shield size={14} className="ln-pill-icon" />
              <span>Built for Safety & Trust</span>
            </div>

            <h2 className="ln-section-title">
              <span className="ln-section-title-top">Breed with </span>
              <span className="ln-section-title-accent">confidence</span>
            </h2>

            <p className="ln-section-copy">
              We&apos;ve built comprehensive safety features to protect our community and promote
              ethical breeding practices. Your trust is our top priority.
            </p>
          </motion.div>

          <div className="ln-safety-grid">
            <FlipSafetyCard
              index={0}
              icon={<Shield size={24} />}
              title="Identity Verification"
              description="Every breeder undergoes thorough identity verification including government IDs, breeding licenses, and kennel club memberships."
              stats="100% verified"
              gradient="linear-gradient(135deg, #3b82f6, #06b6d4)"
              image="https://images.unsplash.com/photo-1762340275855-ae8f4c2c144e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpZGVudGl0eSUyMHZlcmlmaWNhdGlvbiUyMHNlY3VyZXxlbnwxfHx8fDE3NzMwOTM2MDR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              details={[
                "Government-issued ID verification",
                "Kennel club membership validation",
                "Breeding license authentication",
                "Address and contact verification",
                "Professional references check",
              ]}
            />

            <FlipSafetyCard
              index={1}
              icon={<FileText size={24} />}
              title="Health Documentation"
              description="Share and verify health records, genetic testing results, pedigree information, and vaccination history in one secure place."
              stats="Digital records"
              gradient="linear-gradient(135deg, #22c55e, #059669)"
              image="https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=1200&q=80"
              details={[
                "Vaccination history and vet documentation",
                "Genetic testing and breed screenings",
                "Pedigree and lineage transparency",
                "Centralized digital health records",
                "Easy profile-based record sharing",
              ]}
            />

            <FlipSafetyCard
              index={2}
              icon={<MessageSquare size={24} />}
              title="Secure Messaging"
              description="Communicate privately with breeders through protected conversations built to reduce scams and improve trust."
              stats="Encrypted chat"
              gradient="linear-gradient(135deg, #8b5cf6, #7c3aed)"
              image="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
              details={[
                "Private breeder-to-breeder messaging",
                "Safer conversations inside the platform",
                "Reduced off-platform risk",
                "Organized inquiries and match requests",
                "Built to support long-term trust",
              ]}
            />

            <FlipSafetyCard
              index={3}
              icon={<Lock size={24} />}
              title="Reporting & Moderation"
              description="Community reporting tools and moderation workflows help maintain quality and protect responsible breeders."
              stats="Moderated safety"
              gradient="linear-gradient(135deg, #f59e0b, #ea580c)"
              image="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
              details={[
                "Reporting tools for suspicious activity",
                "Moderation review workflows",
                "Higher accountability across profiles",
                "Stronger safety standards",
                "Cleaner community experience",
              ]}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="ln-stats-banner"
          >
            <div className="ln-stats-banner-glow ln-stats-banner-glow-right" />
            <div className="ln-stats-banner-glow ln-stats-banner-glow-left" />

            <div className="ln-stats-banner-inner">
              <div className="ln-stats-head">
                <h3 className="ln-stats-title">Join a thriving community</h3>
                <p className="ln-stats-copy">
                  Thousands of breeders trust Lincani for ethical breeding connections
                </p>
              </div>

              <div className="ln-stats-grid">
                <div className="ln-stat">
                  <div className="ln-stat-icon ln-stat-icon-blue">
                    <Shield size={28} />
                  </div>
                  <div className="ln-stat-value ln-stat-value-blue">1,200+</div>
                  <div className="ln-stat-label">Verified Breeders</div>
                </div>

                <div className="ln-stat">
                  <div className="ln-stat-icon ln-stat-icon-green">
                    <FileText size={28} />
                  </div>
                  <div className="ln-stat-value ln-stat-value-green">8,500+</div>
                  <div className="ln-stat-label">Health Records</div>
                </div>

                <div className="ln-stat">
                  <div className="ln-stat-icon ln-stat-icon-purple">
                    <Lock size={28} />
                  </div>
                  <div className="ln-stat-value ln-stat-value-purple">100%</div>
                  <div className="ln-stat-label">Secure & Private</div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="ln-bottom-cta"
          >
            <p className="ln-bottom-cta-copy">
              Ready to join a trusted community of responsible breeders?
            </p>
            <Link className="ln-btn ln-btn-primary ln-btn-bottom" href={getStartedHref}>
              {loggedIn ? "Go to Dashboard" : "Get started for free"}
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className="ln-footer">
        <div className="ln-shell ln-footer-inner">
          <div className="ln-footer-left">
            <span>© {new Date().getFullYear()} Lincani</span>
            <span className="ln-footer-dot">•</span>
            <span>Responsible breeding, safer matches.</span>
          </div>

          <div className="ln-footer-right">
            <a className="ln-footer-link" href="#safety">
              Safety
            </a>
            <Link className="ln-footer-link" href="/terms">
              Terms
            </Link>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }

        body {
          background: #020617;
        }

        .ln-shell {
          width: min(1280px, calc(100% - 48px));
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .ln-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          backdrop-filter: blur(14px);
          background: ${NAV_BG};
          border-bottom: 1px solid rgba(30, 41, 59, 0.55);
        }

        .ln-nav-inner {
          width: min(1280px, calc(100% - 48px));
          margin: 0 auto;
          min-height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 0;
          transition: background 0.3s ease, border 0.3s ease;
        }

        .ln-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: white;
          flex-shrink: 0;
        }

        .ln-brand-mark {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-weight: 800;
          font-size: 1rem;
          color: #0f172a;
          background: linear-gradient(135deg, #fbbf24, #f97316);
        }

        .ln-brand-text {
          font-size: 1.25rem;
          font-weight: 600;
          letter-spacing: -0.03em;
          color: #f8fafc;
        }

        .ln-nav-links {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .ln-nav-link,
        .ln-footer-link,
        .ln-mobile-link {
          color: #94a3b8;
          text-decoration: none;
          transition: 0.2s ease;
        }

        .ln-nav-link {
          font-size: 0.92rem;
          font-weight: 500;
        }

        .ln-nav-link:hover,
        .ln-footer-link:hover,
        .ln-mobile-link:hover {
          color: #f8fafc;
        }

        .ln-nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .ln-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          border-radius: 12px;
          height: 42px;
          padding: 0 18px;
          font-weight: 600;
          transition: 0.2s ease;
          white-space: nowrap;
          border: none;
          cursor: pointer;
          font: inherit;
        }

        .ln-btn-primary {
          color: white;
          background: linear-gradient(90deg, #f59e0b, #ea580c);
          box-shadow: 0 10px 30px rgba(245, 158, 11, 0.24);
        }

        .ln-btn-primary:hover {
          filter: brightness(1.04);
          transform: translateY(-1px);
        }

        .ln-btn-ghost {
          color: #cbd5e1;
          background: transparent;
          border: 1px solid rgba(51, 65, 85, 0.55);
        }

        .ln-btn-ghost:hover {
          background: rgba(30, 41, 59, 0.45);
          color: #f8fafc;
        }

        .ln-btn-nav-ghost {
          background: transparent;
          border: none;
          color: #94a3b8;
          box-shadow: none;
        }

        .ln-btn-nav-ghost:hover {
          background: rgba(30, 41, 59, 0.45);
          color: #f8fafc;
          transform: none;
        }

        .ln-btn-nav-primary {
          border-radius: 10px;
          height: 42px;
          padding: 0 18px;
        }

        .ln-btn-lg {
          height: 52px;
          padding: 0 22px;
          border-radius: 12px;
          font-size: 1rem;
        }

        .ln-btn-outline {
          color: #cbd5e1;
          background: transparent;
          border: 1px solid rgba(71, 85, 105, 0.65);
        }

        .ln-btn-outline:hover {
          background: rgba(30, 41, 59, 0.45);
          border-color: rgba(100, 116, 139, 0.75);
        }

        .ln-btn-bottom {
          height: 48px;
          border-radius: 10px;
          padding: 0 22px;
        }

        .ln-arrow-icon {
          transition: transform 0.2s ease;
        }

        .ln-btn-primary:hover .ln-arrow-icon {
          transform: translateX(3px);
        }

        .ln-mobile-toggle {
          display: none;
          height: 42px;
          width: 42px;
          border-radius: 10px;
          border: 1px solid rgba(51, 65, 85, 0.6);
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
        }

        .ln-mobile-menu {
          display: none;
          overflow: hidden;
          width: min(1280px, calc(100% - 48px));
          margin: 0 auto;
          padding: 0 0 16px;
        }

        .ln-mobile-link {
          display: block;
          padding: 12px 0;
          font-weight: 500;
        }

        .ln-hero {
          position: relative;
          padding: 110px 0 80px;
          overflow: hidden;
        }

        .ln-hero-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, #020617 0%, #0f172a 50%, #020617 100%);
        }

        .ln-hero-glow {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 999px;
          filter: blur(100px);
          pointer-events: none;
        }

        .ln-hero-glow-right {
          top: -20px;
          right: 0;
          background: rgba(217, 119, 6, 0.12);
        }

        .ln-hero-glow-left {
          bottom: -40px;
          left: 0;
          background: rgba(37, 99, 235, 0.1);
        }

        .ln-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
          gap: 64px;
          align-items: center;
        }

        .ln-hero-copy-wrap {
          position: relative;
          z-index: 1;
        }

        .ln-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(30, 41, 59, 0.45);
          border: 1px solid rgba(51, 65, 85, 0.55);
          color: #cbd5e1;
          font-size: 0.76rem;
          font-weight: 500;
          backdrop-filter: blur(10px);
        }

        .ln-pill-section {
          margin-bottom: 24px;
        }

        .ln-pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: #22c55e;
        }

        .ln-pill-icon {
          color: #f59e0b;
        }

        .ln-hero-title {
          margin: 0 0 22px;
          line-height: 1.02;
          letter-spacing: -0.045em;
        }

        .ln-hero-title-top,
        .ln-hero-title-accent {
          display: block;
          font-size: clamp(2.9rem, 6vw, 4.85rem);
          font-weight: 600;
        }

        .ln-hero-title-top {
          color: #f8fafc;
          margin-bottom: 8px;
        }

        .ln-hero-title-accent {
          background: linear-gradient(90deg, #fbbf24, #f97316);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .ln-hero-copy {
          max-width: 640px;
          color: #94a3b8;
          font-size: 1.08rem;
          line-height: 1.8;
          margin: 0 0 30px;
        }

        .ln-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 30px;
        }

        .ln-feature-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 14px 18px;
          align-items: center;
        }

        .ln-feature-tag {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
          font-size: 0.78rem;
          font-weight: 500;
        }

        .ln-feature-check-wrap {
          width: 18px;
          height: 18px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          background: rgba(30, 41, 59, 0.45);
          border: 1px solid rgba(51, 65, 85, 0.55);
        }

        .ln-feature-check {
          color: #22c55e;
        }

        .ln-hero-media-wrap {
          position: relative;
        }

        .ln-hero-image-card {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          border: 1px solid rgba(30, 41, 59, 0.6);
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
          background: #111827;
        }

        .ln-hero-media-img {
          display: block;
          width: 100%;
          height: auto;
        }

        .ln-hero-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(15, 23, 42, 0) 40%, rgba(15, 23, 42, 0.32) 100%);
        }

        .ln-verified-card {
          position: absolute;
          left: -16px;
          bottom: -16px;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px;
          border-radius: 16px;
          background: #0f172a;
          border: 1px solid rgba(30, 41, 59, 0.85);
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35);
        }

        .ln-verified-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          color: white;
          background: linear-gradient(135deg, #22c55e, #059669);
        }

        .ln-verified-number {
          font-size: 1.7rem;
          line-height: 1;
          font-weight: 700;
          color: #f8fafc;
        }

        .ln-verified-label {
          margin-top: 4px;
          font-size: 0.76rem;
          color: #94a3b8;
          font-weight: 500;
        }

        .ln-trust-badge {
          position: absolute;
          top: -12px;
          right: -12px;
          padding: 9px 14px;
          border-radius: 999px;
          background: linear-gradient(90deg, #f59e0b, #ea580c);
          color: white;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          box-shadow: 0 18px 34px rgba(245, 158, 11, 0.26);
        }

        .ln-online-card {
          position: absolute;
          top: 18px;
          left: -18px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          background: #0f172a;
          border: 1px solid rgba(30, 41, 59, 0.85);
          box-shadow: 0 18px 34px rgba(0, 0, 0, 0.35);
        }

        .ln-online-avatars {
          display: flex;
          margin-right: 2px;
        }

        .ln-online-avatars span {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          margin-left: -8px;
          border: 2px solid #0f172a;
          display: inline-block;
        }

        .ln-online-avatars span:nth-child(1) {
          background: linear-gradient(135deg, #3b82f6, #22d3ee);
          margin-left: 0;
        }

        .ln-online-avatars span:nth-child(2) {
          background: linear-gradient(135deg, #8b5cf6, #a855f7);
        }

        .ln-online-avatars span:nth-child(3) {
          background: linear-gradient(135deg, #ec4899, #fb7185);
        }

        .ln-online-text {
          color: #cbd5e1;
          font-size: 0.76rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ln-online-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: #22c55e;
          display: inline-block;
        }

        .ln-safety-section {
          position: relative;
          padding: 84px 0 92px;
          overflow: hidden;
        }

        .ln-safety-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, #020617 0%, #0f172a 50%, #020617 100%);
        }

        .ln-safety-glow {
          position: absolute;
          width: 400px;
          height: 400px;
          border-radius: 999px;
          filter: blur(100px);
          pointer-events: none;
        }

        .ln-safety-glow-right {
          top: 80px;
          right: 0;
          background: rgba(217, 119, 6, 0.1);
        }

        .ln-safety-glow-left {
          bottom: 100px;
          left: 0;
          background: rgba(37, 99, 235, 0.1);
        }

        .ln-safety-shell {
          position: relative;
          z-index: 1;
        }

        .ln-section-head {
          max-width: 860px;
          margin: 0 auto 54px;
        }

        .ln-section-head.center {
          text-align: center;
        }

        .ln-section-title {
          margin: 0 0 16px;
          font-size: clamp(2.3rem, 4.8vw, 3.4rem);
          line-height: 1.06;
          font-weight: 600;
          letter-spacing: -0.04em;
        }

        .ln-section-title-top {
          color: #f8fafc;
        }

        .ln-section-title-accent {
          background: linear-gradient(90deg, #fbbf24, #f97316);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .ln-section-copy {
          max-width: 760px;
          margin: 0 auto;
          color: #94a3b8;
          font-size: 1.06rem;
          line-height: 1.8;
        }

        .ln-safety-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
          margin-bottom: 56px;
        }

        .ln-flip-card {
          height: 100%;
          min-height: 430px;
          perspective: 1400px;
          transition: transform 0.2s ease;
        }

        .ln-flip-card:hover {
          transform: translateY(-6px);
        }

        .ln-flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 430px;
          transform-style: preserve-3d;
          transition: transform 0.8s cubic-bezier(.16,1,.3,1);
          cursor: pointer;
        }

        .ln-flip-card-inner.is-flipped {
          transform: rotateY(180deg);
        }

        .ln-flip-face {
          position: absolute;
          inset: 0;
          border-radius: 20px;
          overflow: hidden;
          backface-visibility: hidden;
        }

        .ln-flip-face.back {
          transform: rotateY(180deg);
          background: rgba(15, 23, 42, 0.92);
          border: 1px solid rgba(51, 65, 85, 0.7);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.28);
        }

        .ln-card-front {
          height: 100%;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(51, 65, 85, 0.55);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.22);
        }

        .ln-card-image-wrap {
          position: relative;
          height: 188px;
          overflow: hidden;
        }

        .ln-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .ln-card-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(15, 23, 42, 0) 10%, rgba(15, 23, 42, 0.76) 100%);
        }

        .ln-card-icon-top {
          position: absolute;
          top: 16px;
          left: 16px;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          color: white;
          box-shadow: 0 12px 26px rgba(0, 0, 0, 0.22);
        }

        .ln-card-front-content {
          padding: 24px;
        }

        .ln-card-title {
          font-size: 1.25rem;
          line-height: 1.2;
          font-weight: 600;
          color: #f8fafc;
          margin-bottom: 12px;
          letter-spacing: -0.03em;
        }

        .ln-card-description {
          color: #94a3b8;
          line-height: 1.7;
          font-size: 0.92rem;
          margin-bottom: 18px;
        }

        .ln-card-badge-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .ln-card-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 10px;
          background: rgba(30, 41, 59, 0.46);
          border: 1px solid rgba(51, 65, 85, 0.56);
          color: #cbd5e1;
          font-size: 0.76rem;
          font-weight: 600;
        }

        .ln-card-badge svg {
          color: #22c55e;
        }

        .ln-card-hint {
          color: #64748b;
          font-size: 0.74rem;
          font-weight: 500;
        }

        .ln-card-back-content {
          height: 100%;
          padding: 24px;
          display: flex;
          flex-direction: column;
        }

        .ln-card-back-head {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 22px;
        }

        .ln-card-back-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          color: white;
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.22);
          flex-shrink: 0;
        }

        .ln-card-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .ln-card-detail {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          color: #cbd5e1;
          font-size: 0.9rem;
          line-height: 1.7;
        }

        .ln-card-detail-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          margin-top: 10px;
          flex-shrink: 0;
          background: linear-gradient(90deg, #fbbf24, #f97316);
        }

        .ln-card-back-footer {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid rgba(30, 41, 59, 0.9);
          color: #64748b;
          font-size: 0.74rem;
          font-weight: 500;
          text-align: center;
        }

        .ln-stats-banner {
          position: relative;
          overflow: hidden;
          border-radius: 24px;
          padding: 40px;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(51, 65, 85, 0.55);
          box-shadow: 0 22px 60px rgba(0, 0, 0, 0.24);
        }

        .ln-stats-banner-glow {
          position: absolute;
          width: 260px;
          height: 260px;
          border-radius: 999px;
          filter: blur(80px);
        }

        .ln-stats-banner-glow-right {
          top: -40px;
          right: -20px;
          background: rgba(245, 158, 11, 0.1);
        }

        .ln-stats-banner-glow-left {
          bottom: -40px;
          left: -20px;
          background: rgba(59, 130, 246, 0.1);
        }

        .ln-stats-banner-inner {
          position: relative;
          z-index: 1;
        }

        .ln-stats-head {
          text-align: center;
          margin-bottom: 34px;
        }

        .ln-stats-title {
          margin: 0 0 8px;
          font-size: 2rem;
          font-weight: 600;
          letter-spacing: -0.03em;
          background: linear-gradient(90deg, #fbbf24, #f97316);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .ln-stats-copy {
          margin: 0;
          color: #94a3b8;
          font-size: 0.98rem;
        }

        .ln-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 28px;
        }

        .ln-stat {
          text-align: center;
        }

        .ln-stat-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          margin: 0 auto 12px;
          color: white;
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.2);
        }

        .ln-stat-icon-blue {
          background: linear-gradient(135deg, #3b82f6, #06b6d4);
        }

        .ln-stat-icon-green {
          background: linear-gradient(135deg, #22c55e, #059669);
        }

        .ln-stat-icon-purple {
          background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        }

        .ln-stat-value {
          font-size: 2.5rem;
          line-height: 1;
          font-weight: 700;
          letter-spacing: -0.04em;
          margin-bottom: 8px;
        }

        .ln-stat-value-blue {
          background: linear-gradient(90deg, #60a5fa, #22d3ee);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .ln-stat-value-green {
          background: linear-gradient(90deg, #4ade80, #34d399);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .ln-stat-value-purple {
          background: linear-gradient(90deg, #c084fc, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .ln-stat-label {
          color: #94a3b8;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .ln-bottom-cta {
          margin-top: 52px;
          text-align: center;
        }

        .ln-bottom-cta-copy {
          color: #94a3b8;
          margin: 0 0 20px;
          font-size: 0.98rem;
          font-weight: 500;
        }

        .ln-footer {
          border-top: 1px solid rgba(30, 41, 59, 0.55);
          background: rgba(2, 6, 23, 0.65);
          backdrop-filter: blur(10px);
        }

        .ln-footer-inner {
          min-height: 76px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .ln-footer-left,
        .ln-footer-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .ln-footer-left {
          color: #64748b;
          font-size: 0.9rem;
        }

        .ln-footer-dot {
          opacity: 0.5;
        }

        @media (max-width: 980px) {
          .ln-nav-links {
            display: none;
          }

          .ln-mobile-toggle {
            display: inline-grid;
            place-items: center;
          }

          .ln-mobile-menu {
            display: block;
          }

          .ln-hero-grid,
          .ln-safety-grid,
          .ln-stats-grid {
            grid-template-columns: 1fr;
          }

          .ln-hero-media-wrap {
            max-width: 640px;
            margin: 0 auto;
          }

          .ln-online-card {
            left: 10px;
          }

          .ln-verified-card {
            left: 10px;
            bottom: -10px;
          }

          .ln-trust-badge {
            right: 10px;
          }
        }

        @media (max-width: 700px) {
          .ln-shell,
          .ln-nav-inner,
          .ln-mobile-menu {
            width: min(100% - 24px, 1280px);
          }

          .ln-nav-inner {
            min-height: 70px;
          }

          .ln-nav-actions .ln-btn {
            display: none;
          }

          .ln-hero {
            padding: 96px 0 64px;
          }

          .ln-hero-grid {
            gap: 40px;
          }

          .ln-hero-title-top,
          .ln-hero-title-accent {
            font-size: clamp(2.45rem, 11vw, 3.7rem);
          }

          .ln-hero-copy {
            font-size: 1rem;
          }

          .ln-feature-tags {
            gap: 14px 18px;
          }

          .ln-feature-tag {
            font-size: 0.78rem;
          }

          .ln-safety-section {
            padding: 70px 0 80px;
          }

          .ln-stats-banner {
            padding: 26px 20px;
          }

          .ln-card-front-content,
          .ln-card-back-content {
            padding: 20px;
          }

          .ln-footer-inner {
            padding: 16px 0;
          }
        }
      `}</style>
    </main>
  );
}

function FlipSafetyCard({
  index,
  icon,
  title,
  description,
  stats,
  gradient,
  image,
  details,
}: {
  index: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  stats: string;
  gradient: string;
  image: string;
  details: string[];
}) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <motion.div
      className="ln-flip-card"
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
    >
      <div
        className={`ln-flip-card-inner ${isFlipped ? "is-flipped" : ""}`}
        onClick={() => setIsFlipped((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsFlipped((v) => !v);
          }
        }}
      >
        <div className="ln-flip-face front">
          <div className="ln-card-front">
            <div className="ln-card-image-wrap">
              <img src={image} alt={title} className="ln-card-image" />
              <div className="ln-card-image-overlay" />
              <div className="ln-card-icon-top" style={{ background: gradient }}>
                {icon}
              </div>
            </div>

            <div className="ln-card-front-content">
              <h3 className="ln-card-title">{title}</h3>
              <p className="ln-card-description">{description}</p>

              <div className="ln-card-badge-row">
                <div className="ln-card-badge">
                  <CheckCircle2 size={14} />
                  {stats}
                </div>
                <div className="ln-card-hint">Click to learn more</div>
              </div>
            </div>
          </div>
        </div>

        <div className="ln-flip-face back">
          <div className="ln-card-back-content">
            <div className="ln-card-back-head">
              <div className="ln-card-back-icon" style={{ background: gradient }}>
                {icon}
              </div>
              <h3 className="ln-card-title" style={{ marginBottom: 0 }}>
                {title}
              </h3>
            </div>

            <div className="ln-card-details">
              {details.map((item, idx) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: isFlipped ? 1 : 0, x: isFlipped ? 0 : -14 }}
                  transition={{ delay: idx * 0.06 }}
                  className="ln-card-detail"
                >
                  <div className="ln-card-detail-dot" />
                  <span>{item}</span>
                </motion.div>
              ))}
            </div>

            <div className="ln-card-back-footer">Click to flip back</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const context = canvasEl.getContext("2d");
    if (!context) return;

    const resizeCanvas = () => {
      canvasEl.width = window.innerWidth;
      canvasEl.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;

      constructor() {
        this.x = Math.random() * canvasEl.width;
        this.y = Math.random() * canvasEl.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 0.5 - 0.25;
        this.speedY = Math.random() * 0.5 - 0.25;
        this.opacity = Math.random() * 0.5 + 0.2;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvasEl.width) this.x = 0;
        if (this.x < 0) this.x = canvasEl.width;
        if (this.y > canvasEl.height) this.y = 0;
        if (this.y < 0) this.y = canvasEl.height;
      }

      draw() {
        context.fillStyle = `rgba(251, 191, 36, ${this.opacity})`;
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        context.fill();
      }
    }

    const particles: Particle[] = [];
    const particleCount = 40;

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    let raf = 0;

    const animate = () => {
      context.clearRect(0, 0, canvasEl.width, canvasEl.height);

      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });

      raf = window.requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        opacity: 0.15,
      }}
    />
  );
}