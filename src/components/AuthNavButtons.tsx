"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getSession } from "@/lib/auth";

type Props = {
  accent?: string; // optional, if you want to pass #4681f4
};

export default function AuthNavButtons({ accent = "#4681f4" }: Props) {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    // read session from localStorage
    setLoggedIn(!!getSession());

    // keep it in sync if user logs in/out in another tab
    const onStorage = () => setLoggedIn(!!getSession());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function logout() {
    clearSession();
    setLoggedIn(false);
    router.refresh(); // re-render current page
  }

  // IMPORTANT: this component returns ONLY the buttons,
  // so your home layout stays the same wherever you place it.
  return loggedIn ? (
    <>
      <Link href="/dashboard" style={{ textDecoration: "none" }}>
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 14,
            border: `1px solid ${accent}55`,
            background: `${accent}22`,
            color: "white",
            fontWeight: 900,
            cursor: "pointer",
            textAlign: "center",
            minWidth: 110,
          }}
        >
          Dashboard
        </div>
      </Link>

      <button
        onClick={logout}
        style={{
          padding: "10px 14px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(255,255,255,0.04)",
          color: "white",
          fontWeight: 900,
          cursor: "pointer",
          minWidth: 110,
        }}
      >
        Logout
      </button>
    </>
  ) : (
    <>
      <Link href="/login" style={{ textDecoration: "none" }}>
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.04)",
            color: "white",
            fontWeight: 900,
            cursor: "pointer",
            textAlign: "center",
            minWidth: 110,
          }}
        >
          Login
        </div>
      </Link>

      <Link href="/signup" style={{ textDecoration: "none" }}>
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 14,
            border: `1px solid ${accent}66`,
            background: accent,
            color: "white",
            fontWeight: 900,
            cursor: "pointer",
            textAlign: "center",
            minWidth: 140,
            boxShadow: `0 12px 28px ${accent}44`,
          }}
        >
          Create account
        </div>
      </Link>
    </>
  );
}
