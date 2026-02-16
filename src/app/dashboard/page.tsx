"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { clearSession, getSession, getToken, getUser } from "@/lib/auth";
import { API_BASE } from "@/lib/api";

const ACCENT = "#4681f4";

type Tab = "community" | "marketplace";

type Post = {
  id: string;
  authorName: string;
  authorHandle: string;
  location?: string;
  tag: "Litter Update" | "Stud Available" | "Looking for match" | "Health Test Results" | "Advice";
  time: string;
  text: string;
  media?: { type: "image" | "video"; url: string }[];
};

type ApiMeResponse = {
  user: {
    id: number;
    username: string;
    email: string;
    display_name?: string | null;
    bio?: string | null;
    location?: string | null;
    avatar_url?: string | null;
    created_at?: string;
  };
};

type PublicProfile = {
  username: string;
  display_name?: string | null;
  bio?: string | null;
  location?: string | null;
  avatar_url?: string | null;
  created_at?: string;
};

type ApiFeedPost = {
  id: string;
  createdAt: number;
  text: string;
  tag: Post["tag"];
  location?: string;
  mediaUrl?: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  author?: {
    id: number;
    username: string;
    display_name?: string | null;
    avatar_url?: string | null;
    location?: string | null;
  };
};

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

export default function DashboardPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("community");
  const [query, setQuery] = useState("");

  // cached user
  const [me, setMe] = useState<ApiMeResponse["user"] | null>(() => {
    const u = getUser<ApiMeResponse["user"]>();
    return u ?? null;
  });

  // sidebar profile fields
  const [profile, setProfile] = useState<PublicProfile | null>(() => {
    try {
      const raw = localStorage.getItem("breedlink_user");
      if (!raw) return null;
      const u = JSON.parse(raw);
      return {
        username: u.username,
        display_name: u.display_name ?? null,
        bio: u.bio ?? null,
        location: u.location ?? null,
        avatar_url: u.avatar_url ?? null,
        created_at: u.created_at,
      };
    } catch {
      return null;
    }
  });

  const [authLoading, setAuthLoading] = useState(true);

  // --- Real infinite feed state ---
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedCursor, setFeedCursor] = useState<string | null>(null);
  const [feedHasNext, setFeedHasNext] = useState(true);

  // Composer state (real)
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const [postText, setPostText] = useState("");
  const [postTag, setPostTag] = useState<Post["tag"]>("Litter Update");
  const [postLoc, setPostLoc] = useState("");
  const [posting, setPosting] = useState(false);

  const subtitle = useMemo(() => {
    return tab === "community"
      ? "Real updates, verified discussions, and health-first transparency — like X, but for ethical breeding."
      : "Browse match-ready dogs with clearer records, filtering, and verification layers (coming next).";
  }, [tab]);

  // Protect route + load /users/me
  useEffect(() => {
    const s = getSession();
    const token = getToken();

    if (!s || !token) {
      setAuthLoading(false);
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
        if (!res.ok) throw new Error("Failed to load");

        const data = (await res.json()) as ApiMeResponse;
        if (cancelled) return;

        setMe(data.user);

        try {
          localStorage.setItem("breedlink_user", JSON.stringify(data.user));
        } catch {}

        setProfile({
          username: data.user.username,
          display_name: data.user.display_name ?? null,
          bio: data.user.bio ?? null,
          location: data.user.location ?? null,
          avatar_url: data.user.avatar_url ?? null,
          created_at: data.user.created_at,
        });
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

  // Premium profile display
  const profileName = useMemo(() => {
    const display = profile?.display_name?.trim();
    if (display) return display;

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
  }, [me, profile]);

  const profileHandle = useMemo(() => {
    if (me?.username) return "@" + me.username.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);

    if (me?.email) {
      const base = me.email.split("@")[0] || "user";
      return "@" + base.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
    }

    return "@breedlink";
  }, [me]);

  const initials = useMemo(() => {
    const parts = profileName.split(" ").filter(Boolean);
    const a = parts[0]?.[0] || "B";
    const b = parts[1]?.[0] || parts[0]?.[1] || "L";
    return (a + b).toUpperCase();
  }, [profileName]);

  const uiLocation = useMemo(() => {
    const loc = profile?.location?.trim();
    return loc ? loc : "Set your location";
  }, [profile]);

  const uiBio = useMemo(() => {
    const bio = profile?.bio?.trim();
    return bio ? bio : "Responsible breeder • Health-first matches";
  }, [profile]);

  function logout() {
    clearSession();
    localStorage.removeItem("breedlink_token");
    localStorage.removeItem("breedlink_user");
    router.replace("/");
  }

  function mapApiToUi(p: ApiFeedPost): Post {
    const authorName = p.author?.display_name?.trim()
      ? p.author.display_name!
      : p.author?.username
      ? p.author.username.replace(/[._-]+/g, " ")
      : "BreedLink User";

    const authorHandle = p.author?.username ? `@${p.author.username}` : "@breedlink";

    return {
      id: p.id,
      authorName,
      authorHandle,
      location: p.location || p.author?.location || undefined,
      tag: p.tag,
      time: timeAgo(p.createdAt),
      text: sanitizeText(p.text),
      media: p.mediaUrl ? [{ type: "image", url: p.mediaUrl }] : undefined,
    };
  }

  async function loadFeedFirstPage() {
    const token = getToken();
    if (!token) return;

    setFeedLoading(true);
    try {
      const res = await fetch(`${API_BASE}/posts?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (res.status === 401 || res.status === 403) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to load feed");

      const data = (await res.json()) as { posts: ApiFeedPost[]; nextCursor: string | null };
      const mapped = (data.posts || []).map(mapApiToUi);

      setPosts(mapped);
      setFeedCursor(data.nextCursor);
      setFeedHasNext(!!data.nextCursor);
    } catch {
      clearSession();
      localStorage.removeItem("breedlink_token");
      localStorage.removeItem("breedlink_user");
      router.replace("/login");
    } finally {
      setFeedLoading(false);
    }
  }

  async function loadMoreFeed() {
    if (loadingMore || feedLoading) return;
    if (!feedHasNext) return;

    const token = getToken();
    if (!token) return;

    setLoadingMore(true);
    try {
      const url = `${API_BASE}/posts?limit=10&cursor=${encodeURIComponent(feedCursor || "")}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Failed");

      const data = (await res.json()) as { posts: ApiFeedPost[]; nextCursor: string | null };
      const mapped = (data.posts || []).map(mapApiToUi);

      setPosts((prev) => [...prev, ...mapped]);
      setFeedCursor(data.nextCursor);
      setFeedHasNext(!!data.nextCursor);
    } catch {
      // soft fail
    } finally {
      setLoadingMore(false);
    }
  }

  async function createPost() {
    const token = getToken();
    if (!token) return;

    const clean = sanitizeText(postText.trim());
    if (!clean) return;

    setPosting(true);
    try {
      const res = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: clean,
          tag: postTag,
          location: postLoc.trim() || undefined,
          mediaUrl: "",
        }),
      });

      if (res.status === 401 || res.status === 403) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to create");

      const data = (await res.json()) as { post: ApiFeedPost };

      const authorName = profile?.display_name?.trim()
        ? profile.display_name!
        : me?.username
        ? me.username.replace(/[._-]+/g, " ")
        : "You";
      const authorHandle = me?.username ? `@${me.username}` : "@you";

      const optimistic: Post = {
        id: data.post?.id || `tmp_${Date.now()}`,
        authorName,
        authorHandle,
        location: (postLoc.trim() || uiLocation) ?? undefined,
        tag: postTag,
        time: "now",
        text: clean,
      };

      setPosts((prev) => [optimistic, ...prev]);
      setPostText("");
      setPostLoc("");
      setPostTag("Litter Update");

      setTimeout(() => composerRef.current?.focus(), 50);
    } catch {
      clearSession();
      localStorage.removeItem("breedlink_token");
      localStorage.removeItem("breedlink_user");
      router.replace("/login");
    } finally {
      setPosting(false);
    }
  }

  // Load feed when community tab is active and auth done
  useEffect(() => {
    if (authLoading) return;
    if (tab !== "community") return;
    loadFeedFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, tab]);

  // Infinite scroll (real)
  useEffect(() => {
    if (tab !== "community") return;

    function onScroll() {
      if (loadingMore || feedLoading) return;
      const scrollY = window.scrollY || window.pageYOffset;
      const viewportH = window.innerHeight;
      const docH = document.documentElement.scrollHeight;

      if (scrollY + viewportH >= docH - 450) {
        loadMoreFeed();
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, loadingMore, feedLoading, feedHasNext, feedCursor]);

  if (authLoading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: "110px 40px 44px",
          background: "radial-gradient(circle at top, #141414 0%, #0b0b0b 55%, #090909 100%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ opacity: 0.75, fontWeight: 900, fontSize: 14 }}>Loading your account…</div>
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <div style={{ ...card, height: 120, opacity: 0.6 }} />
            <div style={{ ...card, height: 220, opacity: 0.45 }} />
            <div style={{ ...card, height: 220, opacity: 0.35 }} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "110px 40px 44px",
        background: "radial-gradient(circle at top, #141414 0%, #0b0b0b 55%, #090909 100%)",
        color: "white",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      }}
    >
      {/* TOP BAR */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 84,
          zIndex: 50,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(10,10,10,0.65)",
          backdropFilter: "blur(14px)",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            height: "100%",
            padding: "0 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          {/* LOGO */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 220 }}>
            <img
              src="/logo.png"
              alt="BreedLink"
              onClick={() => router.push("/")}
              style={{ height: 100, objectFit: "contain", cursor: "pointer" }}
            />
          </div>

          {/* Center: Search */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
                backdropFilter: "blur(10px)",
                width: 520,
                maxWidth: "52vw",
              }}
            >
              <span style={{ opacity: 0.7 }}>🔎</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search breeds, location, tags…"
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "white",
                  fontSize: 14,
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setTab("marketplace");
                }}
              />
            </div>
          </div>

          {/* Right */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 320,
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() => router.push("/")}
              style={{ ...ghostMini, width: 40, height: 40, borderRadius: 14, fontSize: 16 }}
              aria-label="Home"
              title="Home"
            >
              🏠
            </button>

            <div style={{ position: "relative" }}>
              <button
                onClick={() => alert("Notifications coming next 👀")}
                style={{ ...ghostMini, width: 40, height: 40, borderRadius: 14, fontSize: 16 }}
                aria-label="Notifications"
                title="Notifications"
              >
                🔔
              </button>

              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  background: ACCENT,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 10,
                  fontWeight: 900,
                  boxShadow: "0 8px 18px rgba(70,129,244,0.45)",
                }}
              >
                3
              </span>
            </div>

            <button onClick={() => setTab("marketplace")} style={{ ...primaryBtn, padding: "12px 16px" }}>
              Marketplace →
            </button>

            <button onClick={logout} style={{ ...ghostBtn, padding: "12px 14px" }} title="Logout">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "320px 1fr 340px",
          gap: 18,
          alignItems: "start",
        }}
      >
        {/* LEFT SIDEBAR */}
        <aside style={{ position: "sticky", top: 110 }}>
          <UserSidebar
            name={profileName}
            handle={profileHandle}
            location={uiLocation}
            initials={initials}
            subtitle={subtitle}
            tagline={uiBio}
            onEditProfile={() => router.push("/profile")}
            onCreatePost={() => {
              setTab("community");
              setTimeout(() => composerRef.current?.focus(), 50);
            }}
          />
        </aside>

        {/* CENTER COLUMN */}
        <section>
          {/* Tabs */}
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                display: "inline-flex",
                gap: 8,
                padding: 6,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(10px)",
              }}
            >
              <button onClick={() => setTab("community")} style={tabBtn(tab === "community")}>
                Community
              </button>
              <button onClick={() => setTab("marketplace")} style={tabBtn(tab === "marketplace")}>
                Marketplace
              </button>
            </div>
          </div>

          {/* COMPOSER */}
          {tab === "community" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={card}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <Avatar initials={initials} />
                <div style={{ flex: 1 }}>
                  <textarea
                    ref={(el) => {
                      composerRef.current = el;
                    }}
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder="Share an update — health records, availability, advice, or progress."
                    style={{
                      width: "100%",
                      minHeight: 90,
                      resize: "vertical",
                      padding: "12px 14px",
                      borderRadius: 16,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.03)",
                      color: "white",
                      outline: "none",
                      fontSize: 14,
                      lineHeight: 1.5,
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      marginTop: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <select
                      value={postTag}
                      onChange={(e) => setPostTag(e.target.value as Post["tag"])}
                      style={{
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.03)",
                        color: "white",
                        padding: "10px 12px",
                        borderRadius: 999,
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      <option>Litter Update</option>
                      <option>Stud Available</option>
                      <option>Looking for match</option>
                      <option>Health Test Results</option>
                      <option>Advice</option>
                    </select>

                    <input
                      value={postLoc}
                      onChange={(e) => setPostLoc(e.target.value)}
                      placeholder="Location (optional) e.g. Olympia, WA"
                      style={{
                        flex: 1,
                        minWidth: 220,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.03)",
                        color: "white",
                        padding: "10px 12px",
                        borderRadius: 999,
                        outline: "none",
                        fontSize: 13,
                      }}
                    />

                    <div style={{ flex: 1 }} />

                    <button
                      style={{
                        ...primaryBtn,
                        opacity: posting ? 0.75 : 1,
                        cursor: posting ? "not-allowed" : "pointer",
                      }}
                      onClick={createPost}
                      disabled={posting}
                    >
                      {posting ? "Posting…" : "Post"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* FEED */}
          {tab === "community" ? (
            <>
              {feedLoading && posts.length === 0 ? (
                <div style={{ marginTop: 12, opacity: 0.7, fontWeight: 800 }}>Loading feed…</div>
              ) : null}

              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>

              <div style={{ marginTop: 14, opacity: 0.65, fontSize: 13, textAlign: "center" }}>
                {loadingMore ? "Loading more…" : feedHasNext ? "Scroll for more" : "You’re all caught up"}
              </div>
            </>
          ) : (
            <MarketplaceMock />
          )}
        </section>

        {/* RIGHT SIDEBAR */}
        <aside style={{ position: "sticky", top: 110 }}>
          <DiscoverySidebar onGoMarketplace={() => setTab("marketplace")} />
        </aside>
      </div>
    </main>
  );
}

/* ---------- LEFT SIDEBAR ---------- */

function UserSidebar({
  name,
  handle,
  tagline,
  location,
  initials,
  subtitle,
  onEditProfile,
  onCreatePost,
}: {
  name: string;
  handle: string;
  tagline: string;
  location: string;
  initials: string;
  subtitle: string;
  onEditProfile: () => void;
  onCreatePost: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              onClick={() => (window.location.href = "/profile")}
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "linear-gradient(135deg, rgba(70,129,244,0.28), rgba(255,255,255,0.04))",
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
                cursor: "pointer",
              }}
              title="View profile"
            >
              {initials}
            </button>

            <div>
              <div style={{ fontWeight: 900 }}>{name}</div>
              <div style={{ opacity: 0.7 }}>{handle}</div>
            </div>
          </div>

          <div ref={menuRef} style={{ position: "relative" }}>
            <button onClick={() => setMenuOpen((v) => !v)} style={{ ...ghostMini, width: 40, height: 40 }}>
              ⋯
            </button>

            {menuOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 44,
                  width: 180,
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(10,10,10,0.9)",
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => (window.location.href = "/profile")}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "transparent",
                    border: "none",
                    color: "white",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  View profile
                </button>

                <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />

                <button
                  onClick={() => onEditProfile()}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "transparent",
                    border: "none",
                    color: "white",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  Edit profile
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>{tagline}</div>
        <div style={{ marginTop: 8, opacity: 0.7 }}>📍 {location}</div>
        <div style={{ marginTop: 12, opacity: 0.7 }}>{subtitle}</div>

        <div style={{ marginTop: 14 }}>
          <button style={{ ...primaryBtn, width: "100%" }} onClick={onCreatePost}>
            Create post
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={card}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Quick Access</div>

        <div style={{ display: "grid", gap: 8 }}>
          <QuickRow label="Saved items" value="12" />
          <QuickRow label="Groups" value="3" />
          <QuickRow label="Connections" value="48" />
          <QuickRow label="Events" value="1" />
        </div>

        <div style={{ marginTop: 12, opacity: 0.75 }}>Tip: Profiles with verification build trust faster.</div>
      </motion.div>
    </div>
  );
}

function QuickRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 12px",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div style={{ opacity: 0.85, fontWeight: 800 }}>{label}</div>
      <div
        style={{
          fontSize: 12,
          padding: "6px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ---------- RIGHT SIDEBAR (Discovery) ---------- */

function DiscoverySidebar({ onGoMarketplace }: { onGoMarketplace: () => void }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={card}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Recommended Breeders</div>
        <div style={{ display: "grid", gap: 10 }}>
          <RecommendRow name="Northwest Bulldogs" meta="French Bulldog • Tacoma" />
          <RecommendRow name="Evergreen Kennels" meta="Rottweiler • Seattle" />
          <RecommendRow name="RainCity Retrievers" meta="Golden • Olympia" />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={card}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Trending</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <TagPill text="#HealthTesting" />
          <TagPill text="#StudAvailable" />
          <TagPill text="#LitterUpdate" />
          <TagPill text="#OFA" />
          <TagPill text="#PennHIP" />
          <TagPill text="#Advice" />
        </div>

        <button style={{ ...ghostBtn, width: "100%", marginTop: 12 }} onClick={onGoMarketplace}>
          Browse matches →
        </button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={card}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Events near you</div>
        <EventRow title="AKC Meetup" meta="Seattle • Saturday" />
        <EventRow title="Vet Screening Day" meta="Tacoma • Next week" />
        <EventRow title="Training Workshop" meta="Olympia • Feb 24" />
      </motion.div>
    </div>
  );
}

function RecommendRow({ name, meta }: { name: string; meta: string }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <Avatar initials={name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontWeight: 900,
            fontSize: 14,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {name}
        </div>
        <div style={{ opacity: 0.7, fontSize: 12 }}>{meta}</div>
      </div>
      <button style={{ ...pill, padding: "8px 12px" }}>Follow</button>
    </div>
  );
}

function TagPill({ text }: { text: string }) {
  return (
    <span
      style={{
        fontSize: 12,
        padding: "8px 12px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.03)",
        opacity: 0.95,
      }}
    >
      {text}
    </span>
  );
}

function EventRow({ title, meta }: { title: string; meta: string }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        marginBottom: 10,
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 14 }}>{title}</div>
      <div style={{ opacity: 0.7, fontSize: 12, marginTop: 4 }}>{meta}</div>
    </div>
  );
}

/* ---------- CENTER FEED (X-style Post) ---------- */

function PostCard({ post }: { post: Post }) {
  const initials = post.authorName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={postCard}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Avatar initials={initials} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontWeight: 900 }}>{post.authorName}</span>{" "}
              <span style={{ opacity: 0.65 }}>{post.authorHandle}</span>
              <span style={{ opacity: 0.45 }}> • {post.time}</span>
              {post.location ? <span style={{ opacity: 0.55 }}> • {post.location}</span> : null}
            </div>
            <button style={ghostMini} aria-label="More">
              ⋯
            </button>
          </div>

          <div style={{ marginTop: 8 }}>
            <span style={tagBadge}>{post.tag}</span>
          </div>

          <div style={{ marginTop: 10, opacity: 0.9, lineHeight: 1.55 }}>{post.text}</div>

          {post.media?.length ? (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {post.media.map((m, idx) =>
                m.type === "image" ? (
                  <div
                    key={idx}
                    style={{
                      width: "100%",
                      height: 280,
                      borderRadius: 18,
                      border: "1px solid rgba(255,255,255,0.10)",
                      backgroundImage: `url(${m.url})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                ) : (
                  <video
                    key={idx}
                    controls
                    style={{
                      width: "100%",
                      borderRadius: 18,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.35)",
                    }}
                    src={m.url}
                  />
                )
              )}
            </div>
          ) : null}

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={actionPill}>🤍 Like</button>
            <button style={actionPill}>💬 Comment</button>
            <button style={actionPill}>↗ Share</button>
            <button style={actionPill}>🔖 Save</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "linear-gradient(135deg, rgba(70,129,244,0.28), rgba(255,255,255,0.04))",
        display: "grid",
        placeItems: "center",
        fontWeight: 900,
        flex: "0 0 auto",
      }}
      title="User avatar"
      aria-label="User avatar"
    >
      {initials}
    </div>
  );
}

/* ---------- Marketplace mock ---------- */

function MarketplaceMock() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
      <DogTile name="Luna" breed="French Bulldog" age="2 yrs" tag="Verified" />
      <DogTile name="Atlas" breed="Doberman" age="3 yrs" tag="Health Docs" />
      <DogTile name="Milo" breed="Golden Retriever" age="1 yr" tag="Available" />
      <DogTile name="Nova" breed="Rottweiler" age="2 yrs" tag="Verified" />
      <DogTile name="Koda" breed="Husky" age="4 yrs" tag="Stud" />
      <DogTile name="Bella" breed="Poodle" age="2 yrs" tag="Health Docs" />
    </div>
  );
}

function DogTile({ name, breed, age, tag }: { name: string; breed: string; age: string; tag: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={card}>
      <div
        style={{
          height: 140,
          borderRadius: 16,
          background: "linear-gradient(135deg, rgba(70,129,244,0.22), rgba(255,255,255,0.04))",
          border: "1px solid rgba(255,255,255,0.08)",
          marginBottom: 12,
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>{name}</div>
        <span
          style={{
            fontSize: 12,
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          {tag}
        </span>
      </div>
      <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
        {breed} • {age}
      </div>
      <button style={{ ...primaryBtn, width: "100%", marginTop: 12 }}>View details</button>
    </motion.div>
  );
}

/* ---------- Styles ---------- */

const card: React.CSSProperties = {
  padding: 16,
  borderRadius: 22,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 12px 34px rgba(0,0,0,0.45)",
  backdropFilter: "blur(10px)",
};

const postCard: React.CSSProperties = {
  padding: 16,
  borderRadius: 22,
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 12px 34px rgba(0,0,0,0.45)",
  backdropFilter: "blur(10px)",
};

const primaryBtn: React.CSSProperties = {
  background: ACCENT,
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 16,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(70,129,244,0.30)",
  transition: "0.2s ease",
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: "white",
  border: "1px solid rgba(255,255,255,0.18)",
  padding: "12px 18px",
  borderRadius: 16,
  cursor: "pointer",
  fontWeight: 800,
};

function tabBtn(active: boolean): React.CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 800,
    color: "white",
    background: active ? "rgba(70,129,244,0.26)" : "transparent",
  };
}

const pill: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.03)",
  color: "white",
  padding: "10px 12px",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 700,
};

const actionPill: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.03)",
  color: "white",
  padding: "8px 12px",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 700,
};

const ghostMini: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.03)",
  color: "white",
  width: 34,
  height: 34,
  borderRadius: 12,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
};

const tagBadge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(70,129,244,0.12)",
  fontSize: 12,
  fontWeight: 800,
};
