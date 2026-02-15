"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { clearSession, getSession, getToken, getUser } from "@/lib/auth";

const ACCENT = "#4681f4";

// ✅ Backend endpoint assumption (we can adjust to your actual route names)
const API_BASE = "http://localhost:5000";
const MY_POSTS_ENDPOINT = `${API_BASE}/posts/me`;

type MeUser = {
  id: number;
  username: string;
  email: string;
  display_name?: string | null;
  bio?: string | null;
  location?: string | null;
  avatar_url?: string | null;
  created_at?: string;

  email_verified?: boolean | null;
  verified_account?: boolean | null;
  phone_verified?: boolean | null;
  profile_completed?: boolean | null;
};

type Socials = {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
  x?: string;
};

type MyPost = {
  id: string;
  createdAt: number;
  text: string;
  tag: "Litter Update" | "Stud Available" | "Looking for match" | "Health Test Results" | "Advice";
  location?: string;
  mediaUrl?: string;

  views: number;
  likes: number;
  comments: number;
  shares: number;
};

type Tab = "posts";

const LS_SOCIALS = "breedlink_socials";
const LS_MY_POSTS = "breedlink_my_posts";

function safeJson<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** brand-safety: stops slurs from ever rendering in UI */
function sanitizeText(input: string) {
  const s = (input || "").trim();
  if (!s) return "";

  const banned = [/\bnigg(?:a|er|ers|as)\b/gi, /\bfag(?:got|gots)?\b/gi, /\bretard(?:ed|s)?\b/gi];
  let out = s;
  for (const r of banned) out = out.replace(r, "•••");
  out = out.replace(/(.)\1{7,}/g, "$1$1$1$1");
  return out;
}

function timeAgo(ts: number) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
}

function normalizeSocialUrl(raw: string) {
  const v = (raw || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[a-z0-9.-]+\.[a-z]{2,}\/?/i.test(v)) return `https://${v}`;
  return v;
}

async function fetchMyPostsPage(token: string, cursor: string | null, limit = 10) {
  const url = new URL(MY_POSTS_ENDPOINT);
  url.searchParams.set("limit", String(limit));
  if (cursor) url.searchParams.set("cursor", cursor);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Failed to fetch posts");
  const data = (await res.json()) as { posts: MyPost[]; nextCursor: string | null };

  // hard sanitize as it enters UI
  const cleaned = (data.posts || []).map((p) => ({
    ...p,
    text: sanitizeText(p.text),
  }));

  return { posts: cleaned, nextCursor: data.nextCursor ?? null };
}

// ✅ Vercel/SSR-safe localStorage reader
function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return safeJson(localStorage.getItem(key), fallback);
}

export default function ProfileHubPage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);

  // ✅ FIX: do NOT call getUser() during initial render (SSR/prerender)
  const [me, setMe] = useState<MeUser | null>(null);

  const [tab, setTab] = useState<Tab>("posts");

  // ✅ FIX: read localStorage safely
  const [socials, setSocials] = useState<Socials>(() => readLS(LS_SOCIALS, {}));

  // ✅ posts shown on profile = the user’s community posts
  // ✅ FIX: read localStorage safely
  const [posts, setPosts] = useState<MyPost[]>(() => readLS(LS_MY_POSTS, []));

  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialPostsLoaded, setInitialPostsLoaded] = useState(false);

  // Inline editor toggle
  const [editing, setEditing] = useState(false);

  // Editor form state
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formBio, setFormBio] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formAvatarUrl, setFormAvatarUrl] = useState("");

  // Socials edited inside editor (displayed on LEFT sidebar)
  const [formInstagram, setFormInstagram] = useState("");
  const [formTiktok, setFormTiktok] = useState("");
  const [formYoutube, setFormYoutube] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formX, setFormX] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);

  // sentinel for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // ✅ FIX: Load user ONLY after mount (browser)
  useEffect(() => {
    setMe(getUser<MeUser>());
  }, []);

  // Protect + load /users/me
  useEffect(() => {
    const s = getSession();
    const token = getToken();

    if (!s || !token) {
      clearSession();
      router.replace("/login");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/users/me`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (res.status === 401 || res.status === 403) throw new Error("Unauthorized");
        if (!res.ok) throw new Error("Failed to load profile");

        const data = (await res.json()) as { user: MeUser };
        if (cancelled) return;

        setMe(data.user);
        localStorage.setItem("breedlink_user", JSON.stringify(data.user));
      } catch {
        clearSession();
        localStorage.removeItem("breedlink_token");
        localStorage.removeItem("breedlink_user");
        if (!cancelled) router.replace("/login");
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // persist socials + profile posts (fallback cache)
  useEffect(() => {
    try {
      localStorage.setItem(LS_SOCIALS, JSON.stringify(socials));
    } catch {}
  }, [socials]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_MY_POSTS, JSON.stringify(posts));
    } catch {}
  }, [posts]);

  // When me changes, prime editor fields
  useEffect(() => {
    if (!me) return;
    setFormDisplayName(me.display_name ?? "");
    setFormBio(me.bio ?? "");
    setFormLocation(me.location ?? "");
    setFormAvatarUrl(me.avatar_url ?? "");
  }, [me]);

  // Prime socials editor fields from saved socials
  useEffect(() => {
    setFormInstagram(socials.instagram ?? "");
    setFormTiktok(socials.tiktok ?? "");
    setFormYoutube(socials.youtube ?? "");
    setFormWebsite(socials.website ?? "");
    setFormX(socials.x ?? "");
  }, [socials]);

  const displayName = useMemo(() => {
    const dn = me?.display_name?.trim();
    if (dn) return dn;

    if (me?.username) {
      return me.username
        .replace(/[._-]+/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" ");
    }

    if (me?.email) {
      const base = me.email.split("@")[0] || "Profile";
      return base
        .replace(/[._-]+/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" ");
    }

    return "Profile";
  }, [me]);

  const handle = useMemo(() => {
    const u = me?.username || "breedlink";
    return "@" + u.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
  }, [me]);

  const initials = useMemo(() => {
    const parts = displayName.split(" ").filter(Boolean);
    const a = parts[0]?.[0] || "B";
    const b = parts[1]?.[0] || parts[0]?.[1] || "L";
    return (a + b).toUpperCase();
  }, [displayName]);

  const bio = useMemo(
    () => sanitizeText(me?.bio?.trim() ? me.bio!.trim() : "Responsible breeder • Health-first matches"),
    [me]
  );
  const loc = useMemo(() => (me?.location?.trim() ? me.location!.trim() : "Set your location"), [me]);

  const emailVerified = useMemo(() => !!me?.email_verified, [me]);
  const phoneVerified = useMemo(() => !!me?.phone_verified, [me]);
  const verifiedAccount = useMemo(() => !!me?.verified_account, [me]);
  const avatarSet = useMemo(() => !!me?.avatar_url?.trim(), [me]);

  const profileCompletion = useMemo(() => {
    const checks = [
      { key: "email", label: "Email verified", ok: emailVerified },
      { key: "phone", label: "Phone verified", ok: phoneVerified },
      { key: "acct", label: "Verified account", ok: verifiedAccount },
      { key: "name", label: "Display name set", ok: !!me?.display_name?.trim() },
      { key: "bio", label: "Bio added", ok: !!me?.bio?.trim() },
      { key: "loc", label: "Location set", ok: !!me?.location?.trim() },
      { key: "avatar", label: "Avatar set", ok: avatarSet },
    ];

    const done = checks.filter((c) => c.ok).length;
    const total = checks.length;
    const pct = Math.round((done / total) * 100);

    const backendCompleted = !!me?.profile_completed;

    return {
      checks,
      done: backendCompleted ? total : done,
      total,
      pct: backendCompleted ? 100 : pct,
    };
  }, [me, emailVerified, phoneVerified, verifiedAccount, avatarSet]);

  const stats = useMemo(() => {
    const totalPosts = posts.length;

    let views = 0,
      likes = 0,
      comments = 0,
      shares = 0;

    for (const p of posts) {
      views += p.views;
      likes += p.likes;
      comments += p.comments;
      shares += p.shares;
    }

    const engagement = views > 0 ? Math.round(((likes + comments + shares) / views) * 1000) / 10 : 0;
    const avgViews = totalPosts ? Math.round(views / totalPosts) : 0;

    return { totalPosts, views, likes, comments, shares, engagement, avgViews };
  }, [posts]);

  const topPost = useMemo(() => {
    if (!posts.length) return null;
    return [...posts].sort((a, b) => b.views - a.views)[0];
  }, [posts]);

  const investorSignals = useMemo(() => {
    // Simple “premium” scoring — looks good in UI and motivates users
    let score = 0;
    if (emailVerified) score += 20;
    if (phoneVerified) score += 20;
    if (verifiedAccount) score += 25;
    if (profileCompletion.pct >= 85) score += 15;
    if (stats.totalPosts >= 3) score += 10;
    if (stats.views >= 50) score += 10;

    const capped = Math.min(100, score);
    const tier = capped >= 85 ? "Elite" : capped >= 65 ? "Verified" : capped >= 40 ? "Rising" : "New";
    return { score: capped, tier };
  }, [emailVerified, phoneVerified, verifiedAccount, profileCompletion.pct, stats.totalPosts, stats.views]);

  function logout() {
    clearSession();
    localStorage.removeItem("breedlink_token");
    localStorage.removeItem("breedlink_user");
    router.replace("/");
  }

  async function saveProfileInline() {
    if (!me) return;

    setSavingProfile(true);

    const token = getToken();

    const payload = {
      display_name: formDisplayName.trim(),
      bio: sanitizeText(formBio.trim()),
      location: formLocation.trim(),
      avatar_url: formAvatarUrl.trim(),
    };

    const nextSocials: Socials = {
      instagram: formInstagram.trim(),
      tiktok: formTiktok.trim(),
      youtube: formYoutube.trim(),
      website: formWebsite.trim(),
      x: formX.trim(),
    };

    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const updated: MeUser = res.ok
        ? ((await res.json().catch(() => null)) as any)?.user ?? { ...me, ...payload }
        : { ...me, ...payload };

      setMe(updated);
      localStorage.setItem("breedlink_user", JSON.stringify(updated));

      setSocials(nextSocials);
      try {
        localStorage.setItem(LS_SOCIALS, JSON.stringify(nextSocials));
      } catch {}
    } catch {
      const updated: MeUser = { ...me, ...payload };
      setMe(updated);
      localStorage.setItem("breedlink_user", JSON.stringify(updated));

      setSocials(nextSocials);
      try {
        localStorage.setItem(LS_SOCIALS, JSON.stringify(nextSocials));
      } catch {}
    } finally {
      setSavingProfile(false);
      setEditing(false);
    }
  }

  // ✅ Initial load: pull from backend; if it fails, use local cache
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    let cancelled = false;

    (async () => {
      try {
        const first = await fetchMyPostsPage(token, null, 10);
        if (cancelled) return;

        setPosts(first.posts);
        setCursor(first.nextCursor);
        setHasMore(!!first.nextCursor);
        setInitialPostsLoaded(true);

        // update fallback cache
        try {
          localStorage.setItem(LS_MY_POSTS, JSON.stringify(first.posts));
        } catch {}
      } catch {
        // backend not ready? keep local posts
        setInitialPostsLoaded(true);
        setHasMore(false); // avoids infinite loading spinner when backend missing
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [me?.id]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    const token = getToken();
    if (!token) return;

    setLoadingMore(true);
    try {
      const next = await fetchMyPostsPage(token, cursor, 10);
      setPosts((prev) => {
        // de-dupe by id
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev];
        for (const p of next.posts) if (!seen.has(p.id)) merged.push(p);
        return merged;
      });
      setCursor(next.nextCursor);
      setHasMore(!!next.nextCursor);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }

  // ✅ IntersectionObserver infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return;
    if (!initialPostsLoaded) return;

    const el = loadMoreRef.current;

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e?.isIntersecting) loadMore();
      },
      { root: null, rootMargin: "600px 0px", threshold: 0.01 }
    );

    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPostsLoaded, cursor, hasMore, loadingMore]);

  if (authLoading) {
    return (
      <main style={pageWrap}>
        <div style={{ maxWidth: 1180, margin: "0 auto", color: "white" }}>
          <div style={{ fontWeight: 950, opacity: 0.75 }}>Loading profile…</div>
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div style={{ ...card, height: 110, opacity: 0.55 }} />
            <div style={{ ...card, height: 260, opacity: 0.45 }} />
            <div style={{ ...card, height: 220, opacity: 0.35 }} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageWrap}>
      {/* TOP BAR */}
      <div style={topbar}>
        <div style={topbarInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 220 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="BreedLink"
              onClick={() => router.push("/dashboard")}
              style={{ height: 92, objectFit: "contain", cursor: "pointer" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end", minWidth: 420 }}>
            <button
              onClick={() => router.push("/dashboard")}
              style={{ ...ghostMini, width: 40, height: 40 }}
              title="Dashboard"
            >
              🏠
            </button>

            <button
              onClick={() => setEditing((v) => !v)}
              style={{ ...primaryBtn, padding: "12px 14px" }}
              disabled={savingProfile}
            >
              {editing ? "Close editor" : "Edit profile"}
            </button>

            <button onClick={logout} style={{ ...ghostBtn, padding: "12px 14px" }}>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* HERO */}
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={hero}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center", minWidth: 0 }}>
              <Avatar initials={initials} avatarUrl={me?.avatar_url ?? null} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 980, fontSize: 20, lineHeight: 1.15 }}>{displayName}</div>
                  <span style={chip}>{handle}</span>

                  <Badge ok={emailVerified} label="Email Verified" kind="email" />
                  <Badge ok={phoneVerified} label="Phone Verified" kind="phone" />
                  <Badge ok={verifiedAccount} label="Verified Account" kind="verified" />
                  <Badge ok={profileCompletion.pct === 100} label="Profile Complete" kind="complete" />
                </div>

                <div style={{ marginTop: 6, opacity: 0.72, fontSize: 13 }}>
                  {me?.email} • 📍 {loc}
                </div>

                <div style={{ marginTop: 10, opacity: 0.9, lineHeight: 1.55, maxWidth: 820 }}>{bio}</div>
              </div>
            </div>

            <button
              style={shareBtn}
              onClick={() => {
                try {
                  navigator.clipboard.writeText(window.location.href);
                } catch {}
              }}
            >
              Share
            </button>
          </div>

          {/* INLINE EDITOR */}
          {editing && (
            <div style={{ marginTop: 16 }}>
              <div style={subCard}>
                <div style={{ fontWeight: 950, fontSize: 14 }}>Edit your profile</div>
                <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
                  Profile edits apply immediately. Social links show on the left sidebar as buttons.
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  <div>
                    <div style={label}>Display name</div>
                    <input
                      value={formDisplayName}
                      onChange={(e) => setFormDisplayName(e.target.value)}
                      style={input}
                      placeholder="e.g. Ruthless Kennels"
                    />
                  </div>

                  <div>
                    <div style={label}>Bio</div>
                    <textarea
                      value={formBio}
                      onChange={(e) => setFormBio(e.target.value)}
                      style={{ ...input, minHeight: 90, resize: "vertical" }}
                      placeholder="Short, professional bio…"
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div style={label}>Location</div>
                      <input
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        style={input}
                        placeholder="e.g. Olympia, WA"
                      />
                    </div>
                    <div>
                      <div style={label}>Avatar URL</div>
                      <input
                        value={formAvatarUrl}
                        onChange={(e) => setFormAvatarUrl(e.target.value)}
                        style={input}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 10, ...subCard }}>
                    <div style={{ fontWeight: 950, fontSize: 14 }}>Social links</div>
                    <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
                      Add links here — buttons appear on the left sidebar.
                    </div>

                    <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <div style={label}>Instagram</div>
                          <input
                            value={formInstagram}
                            onChange={(e) => setFormInstagram(e.target.value)}
                            style={input}
                            placeholder="instagram.com/yourhandle"
                          />
                        </div>
                        <div>
                          <div style={label}>TikTok</div>
                          <input
                            value={formTiktok}
                            onChange={(e) => setFormTiktok(e.target.value)}
                            style={input}
                            placeholder="tiktok.com/@yourhandle"
                          />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <div style={label}>YouTube</div>
                          <input
                            value={formYoutube}
                            onChange={(e) => setFormYoutube(e.target.value)}
                            style={input}
                            placeholder="youtube.com/@yourchannel"
                          />
                        </div>
                        <div>
                          <div style={label}>Website</div>
                          <input
                            value={formWebsite}
                            onChange={(e) => setFormWebsite(e.target.value)}
                            style={input}
                            placeholder="yourkennels.com"
                          />
                        </div>
                      </div>

                      <div>
                        <div style={label}>X / Twitter</div>
                        <input
                          value={formX}
                          onChange={(e) => setFormX(e.target.value)}
                          style={input}
                          placeholder="x.com/yourhandle"
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={() => setEditing(false)} style={ghostBtn} disabled={savingProfile}>
                      Cancel
                    </button>
                    <button onClick={saveProfileInline} style={primaryBtn} disabled={savingProfile}>
                      {savingProfile ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ✅ 3-column layout now: Left / Center Feed / Right Investor Panel */}
      <div
        style={{
          maxWidth: 1180,
          margin: "18px auto 0",
          display: "grid",
          gridTemplateColumns: "340px 1fr 340px",
          gap: 18,
        }}
      >
        {/* LEFT */}
        <aside style={{ position: "sticky", top: 110, alignSelf: "start" }}>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={card}>
            <div style={{ fontWeight: 950, marginBottom: 10 }}>Socials</div>
            <div style={{ display: "grid", gap: 10 }}>
              <SidebarSocial label="Instagram" url={socials.instagram} />
              <SidebarSocial label="TikTok" url={socials.tiktok} />
              <SidebarSocial label="YouTube" url={socials.youtube} />
              <SidebarSocial label="Website" url={socials.website} />
              <SidebarSocial label="X" url={socials.x} />
              {!socials.instagram && !socials.tiktok && !socials.youtube && !socials.website && !socials.x ? (
                <div style={{ opacity: 0.7, fontSize: 13, lineHeight: 1.6 }}>
                  No socials yet. Add them in <b>Edit profile</b>.
                </div>
              ) : null}
            </div>
          </motion.div>

          {profileCompletion.pct < 100 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 950 }}>Profile completeness</div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>
                  {profileCompletion.done}/{profileCompletion.total}
                </div>
              </div>

              <div style={progressTrack}>
                <div style={{ height: "100%", width: `${profileCompletion.pct}%`, background: "rgba(70,129,244,0.70)" }} />
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {profileCompletion.checks.map((c) => (
                  <ChecklistRow key={c.key} ok={c.ok} text={c.label} />
                ))}
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, marginTop: 12 }}>
            <div style={{ fontWeight: 950, marginBottom: 10 }}>Quick stats</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <StatCard label="Posts" value={String(stats.totalPosts)} />
              <StatCard label="Total views" value={String(stats.views)} />
              <StatCard label="Engagement" value={`${stats.engagement}%`} />
              <StatCard label="Avg views" value={String(stats.avgViews)} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, marginTop: 12 }}>
            <div style={{ fontWeight: 950 }}>Top performing post</div>
            <div style={{ marginTop: 8, opacity: 0.75, fontSize: 13 }}>(Analytics ready for real data later)</div>

            {topPost ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={tagBadge}>{topPost.tag}</span>
                  <span style={{ opacity: 0.55, fontSize: 12 }}>{timeAgo(topPost.createdAt)}</span>
                </div>
                <div style={{ marginTop: 10, opacity: 0.92, lineHeight: 1.55 }}>{sanitizeText(topPost.text)}</div>
              </div>
            ) : (
              <div style={{ marginTop: 12, opacity: 0.75, fontSize: 13, lineHeight: 1.6 }}>No posts yet.</div>
            )}
          </motion.div>
        </aside>

        {/* CENTER: Posts Feed */}
        <section>
          <div style={{ marginBottom: 14 }}>
            <div style={tabWrap}>
              <button onClick={() => setTab("posts")} style={tabBtn(tab === "posts")}>
                Posts
              </button>
            </div>
          </div>

          {tab === "posts" && (
            <div style={{ display: "grid", gap: 12 }}>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={card}>
                <div style={{ fontWeight: 950, fontSize: 16 }}>Your community posts</div>
                <div style={{ marginTop: 8, opacity: 0.75, fontSize: 13 }}>
                  This profile shows posts you’ve made in the community feed. (No posting here.)
                </div>
              </motion.div>

              {posts.length === 0 ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={card}>
                  <div style={{ opacity: 0.8 }}>No posts yet.</div>
                </motion.div>
              ) : (
                posts.map((p) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={card}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={tagBadge}>{p.tag}</span>
                          <span style={{ opacity: 0.55, fontSize: 12 }}>{timeAgo(p.createdAt)}</span>
                          {p.location ? <span style={{ opacity: 0.6, fontSize: 12 }}>• {p.location}</span> : null}
                        </div>

                        <div style={{ marginTop: 10, opacity: 0.92, lineHeight: 1.55 }}>{sanitizeText(p.text)}</div>

                        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                          <MiniStat label="Views" value={p.views} />
                          <MiniStat label="Likes" value={p.likes} />
                          <MiniStat label="Comments" value={p.comments} />
                          <MiniStat label="Shares" value={p.shares} />
                        </div>
                      </div>

                      <button style={ghostMini} title="More" aria-label="More">
                        ⋯
                      </button>
                    </div>
                  </motion.div>
                ))
              )}

              {/* Infinite scroll sentinel */}
              <div ref={loadMoreRef} />

              {loadingMore ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ ...card, opacity: 0.85 }}>
                  Loading more…
                </motion.div>
              ) : null}

              {!hasMore && posts.length > 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ ...card, opacity: 0.75 }}>
                  You’re all caught up.
                </motion.div>
              ) : null}
            </div>
          )}
        </section>

        {/* RIGHT: Premium / Investor-grade panel */}
        <aside style={{ position: "sticky", top: 110, alignSelf: "start" }}>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontWeight: 950 }}>Trust Center</div>
              <span style={{ ...chip, background: "rgba(70,129,244,0.14)" }}>{investorSignals.tier}</span>
            </div>

            <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13, lineHeight: 1.55 }}>
              Investors love measurable trust: verification, compliance readiness, and consistent engagement.
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 900, fontSize: 13, opacity: 0.85 }}>Trust score</div>
                <div style={{ fontWeight: 950 }}>{investorSignals.score}/100</div>
              </div>

              <div style={progressTrack}>
                <div style={{ height: "100%", width: `${investorSignals.score}%`, background: "rgba(70,129,244,0.78)" }} />
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <ChecklistRow ok={emailVerified} text="Verified email" />
                <ChecklistRow ok={phoneVerified} text="Verified phone" />
                <ChecklistRow ok={verifiedAccount} text="Account verification" />
                <ChecklistRow ok={profileCompletion.pct >= 85} text="Strong profile completeness" />
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <TrustRow label="Health tests" value="Coming soon" hint="Upload OFA/Embark results" />
                <TrustRow label="Breeding standards" value="Coming soon" hint="Code of ethics + policies" />
                <TrustRow label="Contracts" value="Coming soon" hint="Deposit + health guarantee" />
              </div>

              <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
                <button style={{ ...primaryBtn, flex: 1 }} onClick={() => setEditing(true)}>
                  Improve Trust Score
                </button>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, marginTop: 12 }}>
            <div style={{ fontWeight: 950 }}>Insights</div>
            <div style={{ marginTop: 8, opacity: 0.75, fontSize: 13 }}>
              Premium-looking analytics (simple now, can become real charts later).
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <InsightBar label="Engagement rate" value={`${stats.engagement}%`} pct={Math.min(100, Math.round(stats.engagement * 4))} />
              <InsightBar label="Average views/post" value={String(stats.avgViews)} pct={Math.min(100, stats.avgViews)} />
              <InsightBar
                label="Posting consistency"
                value={stats.totalPosts >= 5 ? "Strong" : stats.totalPosts >= 2 ? "Building" : "New"}
                pct={Math.min(100, stats.totalPosts * 18)}
              />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...card, marginTop: 12 }}>
            <div style={{ fontWeight: 950 }}>Premium features (roadmap)</div>
            <div style={{ marginTop: 8, opacity: 0.75, fontSize: 13, lineHeight: 1.55 }}>
              These are the exact “investor words” features:
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <RoadmapItem title="Verified Breeder Program" desc="Document-backed kennel verification + badges." />
              <RoadmapItem title="Health Testing Vault" desc="OFA/Embark uploads + shareable reports." />
              <RoadmapItem title="Contract Generator" desc="Standardized agreements & policies." />
              <RoadmapItem title="Payments + Escrow" desc="Safe deposits & dispute handling." />
              <RoadmapItem title="Reputation & Reviews" desc="Verified reviews tied to real matches." />
            </div>
          </motion.div>
        </aside>
      </div>
    </main>
  );
}

/* ---------- Small components ---------- */

function Avatar({ initials, avatarUrl }: { initials: string; avatarUrl: string | null }) {
  return (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "linear-gradient(135deg, rgba(70,129,244,0.28), rgba(255,255,255,0.04))",
        display: "grid",
        placeItems: "center",
        fontWeight: 950,
        flex: "0 0 auto",
        boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
        overflow: "hidden",
      }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials
      )}
    </div>
  );
}

function Badge({
  ok,
  label,
  kind,
}: {
  ok: boolean;
  label: string;
  kind: "email" | "phone" | "verified" | "complete";
}) {
  const color = ok ? "rgba(34,197,94,0.95)" : "rgba(255,255,255,0.45)";
  const dot = ok ? "✓" : "•";

  const accent =
    kind === "email"
      ? "rgba(70,129,244,0.55)"
      : kind === "phone"
      ? "rgba(168,85,247,0.55)"
      : kind === "verified"
      ? "rgba(245,158,11,0.55)"
      : "rgba(34,197,94,0.55)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.14)",
        background: `linear-gradient(135deg, ${accent}, rgba(255,255,255,0.03))`,
        fontSize: 12,
        fontWeight: 950,
        opacity: ok ? 1 : 0.85,
      }}
      title={label}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 8,
          display: "grid",
          placeItems: "center",
          background: "rgba(0,0,0,0.25)",
          border: "1px solid rgba(255,255,255,0.16)",
          color,
          fontSize: 12,
        }}
      >
        {dot}
      </span>
      {label}
    </span>
  );
}

function SidebarSocial({ label, url }: { label: string; url?: string }) {
  if (!url?.trim()) return null;
  const u = normalizeSocialUrl(url);
  return (
    <a
      href={u}
      target="_blank"
      rel="noreferrer"
      style={{
        textDecoration: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "12px 14px",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.06)",
        color: "white",
        fontWeight: 900,
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: "rgba(70,129,244,0.8)" }} />
        {label}
      </span>
      <span style={{ opacity: 0.7 }}>↗</span>
    </a>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={miniCard}>
      <div style={{ opacity: 0.7, fontSize: 12 }}>{label}</div>
      <div style={{ marginTop: 6, fontWeight: 950, fontSize: 18 }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div style={miniCard}>
      <div style={{ opacity: 0.7, fontSize: 12 }}>{label}</div>
      <div style={{ marginTop: 6, fontWeight: 950, fontSize: 16 }}>{value}</div>
    </div>
  );
}

function ChecklistRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.16)",
          background: ok ? "rgba(70,129,244,0.35)" : "rgba(255,255,255,0.06)",
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          fontWeight: 950,
        }}
      >
        {ok ? "✓" : ""}
      </div>
      <div style={{ opacity: 0.88 }}>{text}</div>
    </div>
  );
}

function TrustRow({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div style={{ ...miniCard, display: "grid", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 900, opacity: 0.9 }}>{label}</div>
        <div style={{ opacity: 0.85, fontWeight: 900 }}>{value}</div>
      </div>
      <div style={{ opacity: 0.65, fontSize: 12, lineHeight: 1.5 }}>{hint}</div>
    </div>
  );
}

function InsightBar({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div style={{ ...miniCard }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ opacity: 0.8, fontSize: 12 }}>{label}</div>
        <div style={{ fontWeight: 950 }}>{value}</div>
      </div>
      <div
        style={{
          marginTop: 10,
          height: 10,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.04)",
          overflow: "hidden",
        }}
      >
        <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, pct))}%`, background: "rgba(70,129,244,0.70)" }} />
      </div>
    </div>
  );
}

function RoadmapItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ ...miniCard }}>
      <div style={{ fontWeight: 950 }}>{title}</div>
      <div style={{ marginTop: 6, opacity: 0.75, fontSize: 12, lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

/* ---------- Styles ---------- */

const pageWrap: React.CSSProperties = {
  minHeight: "100vh",
  padding: "110px 40px 44px",
  background:
    "radial-gradient(circle at 18% 8%, rgba(70,129,244,0.22), rgba(0,0,0,0) 52%), radial-gradient(circle at 82% 12%, rgba(168,85,247,0.18), rgba(0,0,0,0) 48%), linear-gradient(180deg, #0b1020 0%, #070a13 55%, #06070d 100%)",
  color: "white",
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
};

const topbar: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  height: 84,
  zIndex: 50,
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(10,10,10,0.65)",
  backdropFilter: "blur(14px)",
};

const topbarInner: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  height: "100%",
  padding: "0 40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
};

const hero: React.CSSProperties = {
  marginTop: 12,
  padding: 18,
  borderRadius: 26,
  border: "1px solid rgba(255,255,255,0.10)",
  background:
    "radial-gradient(circle at 20% 0%, rgba(70,129,244,0.18), rgba(255,255,255,0.04) 35%, rgba(255,255,255,0.02) 60%), rgba(255,255,255,0.03)",
  boxShadow: "0 18px 48px rgba(0,0,0,0.50)",
  backdropFilter: "blur(12px)",
};

const chip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.03)",
  fontSize: 12,
  fontWeight: 900,
  opacity: 0.95,
};

const card: React.CSSProperties = {
  padding: 16,
  borderRadius: 22,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 12px 34px rgba(0,0,0,0.45)",
  backdropFilter: "blur(10px)",
};

const subCard: React.CSSProperties = {
  padding: 14,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.03)",
};

const miniCard: React.CSSProperties = {
  padding: 12,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.03)",
};

const progressTrack: React.CSSProperties = {
  marginTop: 10,
  height: 10,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.04)",
  overflow: "hidden",
};

const label: React.CSSProperties = {
  fontWeight: 900,
  marginBottom: 8,
  opacity: 0.9,
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
  padding: "12px 16px",
  borderRadius: 16,
  cursor: "pointer",
  fontWeight: 850,
};

const ghostMini: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.03)",
  color: "white",
  borderRadius: 14,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  padding: "10px 12px",
};

const tabWrap: React.CSSProperties = {
  display: "inline-flex",
  gap: 8,
  padding: 6,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(10px)",
};

function tabBtn(active: boolean): React.CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    color: "white",
    background: active ? "rgba(70,129,244,0.26)" : "transparent",
  };
}

const tagBadge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(70,129,244,0.12)",
  fontSize: 12,
  fontWeight: 900,
};

const shareBtn: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  fontWeight: 950,
  padding: "10px 14px",
  cursor: "pointer",
  boxShadow: "0 12px 26px rgba(0,0,0,0.25)",
};
