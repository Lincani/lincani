"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ACCENT = "#4681f4";

type User = { id: string; name: string; email: string };

export default function AuthControls() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("breedlink_user");
      setUser(raw ? (JSON.parse(raw) as User) : null);
    } catch {
      setUser(null);
    }
  }, []);

  function logout() {
    localStorage.removeItem("breedlink_token");
    localStorage.removeItem("breedlink_user");
    setUser(null);
    router.push("/");
  }

  // IMPORTANT: This component only renders the RIGHT-side controls.
  // You place it where your Login/Create Account buttons currently are.
  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-sm text-white/75 hidden sm:block">
          Welcome, <span className="text-white font-semibold">{user.name}</span>
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          className="px-4 py-2 rounded-lg font-semibold border border-white/10 bg-white/5 hover:bg-white/10 transition"
        >
          Dashboard
        </button>

        <button
          onClick={logout}
          className="px-4 py-2 rounded-lg font-semibold"
          style={{ backgroundColor: ACCENT }}
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => router.push("/login")}
        className="px-4 py-2 rounded-lg font-semibold border border-white/10 bg-white/5 hover:bg-white/10 transition"
      >
        Login
      </button>

      <button
        onClick={() => router.push("/signup")}
        className="px-4 py-2 rounded-lg font-semibold"
        style={{ backgroundColor: ACCENT }}
      >
        Create Account
      </button>
    </div>
  );
}
