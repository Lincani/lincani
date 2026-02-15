"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearSession, getSession, getToken, getUser } from "@/lib/auth";

const ACCENT = "#4681f4";

type MeUser = {
  id: number;
  username: string;
  email: string;
  display_name?: string | null;
  bio?: string | null;
  location?: string | null;
  avatar_url?: string | null;
  created_at?: string;
};

export default function ProfileEditPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [me, setMe] = useState<MeUser | null>(() => getUser<MeUser>());

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    const session = getSession();
    const token = getToken();

    if (!session || !token) {
      clearSession();
      router.replace("/login");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("http://localhost:5000/users/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (res.status === 401 || res.status === 403) {
          clearSession();
          router.replace("/login");
          return;
        }

        if (!res.ok) throw new Error("Failed to load profile");

        const data = (await res.json()) as { user: MeUser };
        if (cancelled) return;

        setMe(data.user);
        setDisplayName(data.user.display_name ?? "");
        setBio(data.user.bio ?? "");
        setLocation(data.user.location ?? "");
        setAvatarUrl(data.user.avatar_url ?? "");

        localStorage.setItem("breedlink_user", JSON.stringify(data.user));
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const initials = useMemo(() => {
    const base =
      (displayName && displayName.trim()) ||
      (me?.username && me.username.trim()) ||
      (me?.email?.split("@")[0] ?? "BL");

    const parts = base.split(" ").filter(Boolean);
    const a = parts[0]?.[0] || "B";
    const b = parts[1]?.[0] || parts[0]?.[1] || "L";
    return (a + b).toUpperCase();
  }, [displayName, me]);

  async function onSave() {
    const token = getToken();
    if (!token) {
      clearSession();
      router.replace("/login");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("http://localhost:5000/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          display_name: displayName,
          bio,
          location,
          avatar_url: avatarUrl,
        }),
      });

      if (res.status === 401 || res.status === 403) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.message || "Failed to save profile");
        return;
      }

      const data = (await res.json()) as { user: MeUser };
      setMe(data.user);

      localStorage.setItem("breedlink_user", JSON.stringify(data.user));

      alert("Profile saved ✅");
      router.replace("/profile");
    } catch (e) {
      console.error(e);
      alert("Save failed. Check console.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={pageWrap}>
        <div style={{ maxWidth: 900, margin: "0 auto", color: "white" }}>
          <div style={{ fontWeight: 900, opacity: 0.8 }}>Loading profile…</div>
          <div style={{ marginTop: 14, ...card, height: 220, opacity: 0.45 }} />
        </div>
      </main>
    );
  }

  return (
    <main style={pageWrap}>
      <div style={{ maxWidth: 900, margin: "0 auto", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>Edit Profile</div>
            <div style={{ marginTop: 6, opacity: 0.75 }}>This updates what people see on your BreedLink profile.</div>
          </div>

          <button onClick={() => router.replace("/profile")} style={ghostBtn}>
            ← Back
          </button>
        </div>

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "280px 1fr", gap: 14 }}>
          <div style={card}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Avatar initials={initials} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 950, fontSize: 16, lineHeight: 1.2 }}>
                  {(displayName && displayName.trim()) || me?.username || "Profile"}
                </div>
                <div style={{ opacity: 0.7, fontSize: 13 }}>@{me?.username}</div>
              </div>
            </div>

            <div style={{ marginTop: 12, opacity: 0.9, lineHeight: 1.45 }}>
              {(bio && bio.trim()) || "Responsible breeder • Health-first matches"}
            </div>

            <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>📍 {location || "Set your location"}</div>

            <div style={{ marginTop: 12, opacity: 0.65, fontSize: 12, lineHeight: 1.5 }}>
              Tip: Keep it short and transparent. Add health testing + ethics in your bio.
            </div>
          </div>

          <div style={{ ...card, padding: 18 }}>
            <Field label="Display name">
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g., Ruthless Kennels" style={input} />
            </Field>

            <Field label="Bio">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Health-tested lines • transparent records • responsible matches"
                style={{ ...input, minHeight: 110, resize: "vertical" }}
              />
            </Field>

            <Field label="Location">
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Olympia, WA" style={input} />
            </Field>

            <Field label="Avatar URL (optional)">
              <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" style={input} />
            </Field>

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button onClick={onSave} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button onClick={() => router.replace("/profile")} disabled={saving} style={{ ...ghostBtn, opacity: saving ? 0.7 : 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 900, marginBottom: 8, opacity: 0.9 }}>{label}</div>
      {children}
    </div>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "linear-gradient(135deg, rgba(70,129,244,0.28), rgba(255,255,255,0.04))",
        display: "grid",
        placeItems: "center",
        fontWeight: 950,
        flex: "0 0 auto",
      }}
    >
      {initials}
    </div>
  );
}

const pageWrap: React.CSSProperties = {
  minHeight: "100vh",
  padding: "110px 40px 44px",
  background: "radial-gradient(circle at top, #141414 0%, #0b0b0b 55%, #090909 100%)",
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  color: "white",
};

const card: React.CSSProperties = {
  padding: 16,
  borderRadius: 22,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 12px 34px rgba(0,0,0,0.45)",
  backdropFilter: "blur(10px)",
};

const input: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.03)",
  color: "white",
  padding: "12px 12px",
  borderRadius: 14,
  outline: "none",
  fontSize: 14,
};

const primaryBtn: React.CSSProperties = {
  background: ACCENT,
  color: "white",
  border: "none",
  padding: "12px 16px",
  borderRadius: 16,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(70,129,244,0.30)",
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: "white",
  border: "1px solid rgba(255,255,255,0.18)",
  padding: "12px 14px",
  borderRadius: 16,
  cursor: "pointer",
  fontWeight: 850,
};
