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
  authorId?: number; // ✅ for delete permission
  authorName: string;
  authorHandle: string;
  authorUsername?: string; // ✅ NEW: for profile navigation
  authorAvatarUrl?: string | null; // ✅ NEW: show avatar images
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

type UploadResponse = {
  files: { url: string; type: string; name: string; size: number }[];
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

function isProbablyVideo(url: string) {
  const u = (url || "").toLowerCase().trim();
  return (
    u.endsWith(".mp4") ||
    u.endsWith(".webm") ||
    u.endsWith(".mov") ||
    u.includes("youtube.com/") ||
    u.includes("youtu.be/") ||
    u.includes("vimeo.com/")
  );
}

function toAbsoluteMediaUrl(url: string) {
  const u = (url || "").trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/uploads/")) return `${API_BASE}${u}`;
  return u;
}

function isVideoFile(file: File | null) {
  if (!file) return false;
  return (file.type || "").startsWith("video/");
}

export default function DashboardPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("community");
  const [query, setQuery] = useState("");

  const [me, setMe] = useState<ApiMeResponse["user"] | null>(() => {
    const u = getUser<ApiMeResponse["user"]>();
    return u ?? null;
  });

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

  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedCursor, setFeedCursor] = useState<string | null>(null);
  const [feedHasNext, setFeedHasNext] = useState(true);

  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  const [postText, setPostText] = useState("");
  const [postTag, setPostTag] = useState<Post["tag"]>("Litter Update");
  const [posting, setPosting] = useState(false);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");

  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    if (!mediaFile) {
      setMediaPreview("");
      return;
    }
    const url = URL.createObjectURL(mediaFile);
    setMediaPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [mediaFile]);

  const subtitle = useMemo(() => {
    // ✅ Removed subtitle to reduce clutter
    return "";
  }, []);

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
    return "@lincani";
  }, [me]);

  const initials = useMemo(() => {
    const parts = profileName.split(" ").filter(Boolean);
    const a = parts[0]?.[0] || "L";
    const b = parts[1]?.[0] || parts[0]?.[1] || "C";
    return (a + b).toUpperCase();
  }, [profileName]);

  const uiBio = useMemo(() => {
    const bio = profile?.bio?.trim();
    return bio ? bio : "Health-first matches • Responsible breeding";
  }, [profile]);

  const myAvatarUrl = useMemo(() => {
    const raw = profile?.avatar_url ?? me?.avatar_url ?? null;
    if (!raw?.trim()) return null;
    return toAbsoluteMediaUrl(raw);
  }, [profile?.avatar_url, me?.avatar_url]);

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
      : "Lincani User";

    const authorHandle = p.author?.username ? `@${p.author.username}` : "@lincani";

    const mu = toAbsoluteMediaUrl(p.mediaUrl || "");
    const hasMedia = !!mu;

    const avatarAbs = p.author?.avatar_url?.trim() ? toAbsoluteMediaUrl(p.author.avatar_url) : null;

    return {
      id: p.id,
      authorId: p.author?.id,
      authorName,
      authorHandle,
      authorUsername: p.author?.username || undefined,
      authorAvatarUrl: avatarAbs,
      location: p.location || p.author?.location || undefined,
      tag: p.tag,
      time: timeAgo(p.createdAt),
      text: sanitizeText(p.text),
      media: hasMedia ? [{ type: isProbablyVideo(mu) ? "video" : "image", url: mu }] : undefined,
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

  // ✅ upload: returns BOTH relative and absolute
  async function uploadSingleMedia(file: File, token: string): Promise<{ rel: string; abs: string }> {
    const fd = new FormData();
    fd.append("files", file);

    const res = await fetch(`${API_BASE}/posts/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    if (res.status === 401 || res.status === 403) throw new Error("Unauthorized");
    if (!res.ok) throw new Error("Upload failed");

    const data = (await res.json()) as UploadResponse;
    const first = data?.files?.[0];
    const rel = (first?.url || "").trim();
    if (!rel) throw new Error("Upload returned no url");

    return { rel, abs: toAbsoluteMediaUrl(rel) };
  }

  async function createPostRequest(token: string, payload: { text: string; tag: Post["tag"]; mediaUrl?: string }) {
    const res = await fetch(`${API_BASE}/posts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status === 401 || res.status === 403) throw new Error("Unauthorized");
    return res;
  }

  async function createPost() {
    const token = getToken();
    if (!token) return;

    const clean = sanitizeText(postText.trim());
    if (!clean) return;

    setPosting(true);
    try {
      let uploaded: { rel: string; abs: string } | null = null;
      if (mediaFile) {
        uploaded = await uploadSingleMedia(mediaFile, token);
      }

      // 1) Try absolute
      let res = await createPostRequest(token, {
        text: clean,
        tag: postTag,
        mediaUrl: uploaded?.abs || undefined,
      });

      // 2) Retry with relative
      if (!res.ok && uploaded?.rel) {
        res = await createPostRequest(token, {
          text: clean,
          tag: postTag,
          mediaUrl: uploaded.rel,
        });
      }

      if (!res.ok) throw new Error("Failed to create");

      const data = (await res.json()) as { post: ApiFeedPost };

      const mapped = mapApiToUi(data.post);
      setPosts((prev) => [mapped, ...prev]);

      // truth refresh
      await loadFeedFirstPage();

      setPostText("");
      setPostTag("Litter Update");
      setMediaFile(null);
      if (mediaInputRef.current) mediaInputRef.current.value = "";

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

  // ✅ DELETE POST (author only, server enforces too)
  async function deletePost(postId: string) {
    const token = getToken();
    if (!token) return;

    const idNum = Number(postId);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      alert("Invalid post id");
      return;
    }

    const ok = confirm("Delete this post? This can’t be undone.");
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/posts/${encodeURIComponent(postId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) throw new Error("Unauthorized");

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Delete failed");
        return;
      }

      setPosts((prev) => prev.filter((p) => p.id !== postId));
      await loadFeedFirstPage();
    } catch {
      clearSession();
      localStorage.removeItem("breedlink_token");
      localStorage.removeItem("breedlink_user");
      router.replace("/login");
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (tab !== "community") return;
    loadFeedFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, tab]);

  useEffect(() => {
    if (tab !== "community") return;

    function onScroll() {
      if (loadingMore || feedLoading) return;

      const scrollY = window.scrollY || window.pageYOffset;
      const viewportH = window.innerHeight;
      const docH = document.documentElement.scrollHeight;

      setShowTop(scrollY > 520);

      if (scrollY + viewportH >= docH - 450) loadMoreFeed();
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, loadingMore, feedLoading, feedHasNext, feedCursor]);

  if (authLoading) {
    return (
      <main style={pageBg}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div style={{ opacity: 0.75, fontWeight: 900, fontSize: 13, letterSpacing: 0.2, color: TEXT_MID }}>
            Loading your account…
          </div>
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div style={{ ...card, height: 124, opacity: 0.65 }} />
            <div style={{ ...card, height: 240, opacity: 0.45 }} />
            <div style={{ ...card, height: 240, opacity: 0.35 }} />
          </div>
        </div>
      </main>
    );
  }

  const canPost = !!sanitizeText(postText.trim()) && !posting;

  return (
    <main style={pageBg}>
      <div style={topBar}>
        <div style={topBarInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 220 }}>
            <img
              src="/logo.png"
              alt="Lincani"
              onClick={() => router.push("/")}
              style={{
                height: 54,
                width: "auto",
                objectFit: "contain",
                cursor: "pointer",
                filter: "drop-shadow(0 16px 34px rgba(0,0,0,0.55))",
              }}
            />
          </div>

          <div style={vSep} />

          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <div style={searchShell}>
              <span style={{ opacity: 0.72, fontSize: 14, color: TEXT_MID }}>⌕</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search breeds, tags…"
                style={searchInput}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setTab("marketplace");
                }}
              />
              <div style={searchHint}>Enter → Marketplace</div>
            </div>
          </div>

          <div style={vSep} />

          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 340, justifyContent: "flex-end" }}>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/")}
              style={{ ...ghostMini, width: 40, height: 40, borderRadius: 14, fontSize: 16 }}
              aria-label="Home"
              title="Home"
            >
              🏠
            </motion.button>

            <div style={{ position: "relative" }}>
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => alert("Notifications coming next 👀")}
                style={{ ...ghostMini, width: 40, height: 40, borderRadius: 14, fontSize: 16 }}
                aria-label="Notifications"
                title="Notifications"
              >
                🔔
              </motion.button>
              <span style={notifDot}>3</span>
            </div>

            <div style={hSep} />

            <AccountMenu
              initials={initials}
              avatarUrl={myAvatarUrl}
              name={profileName}
              handle={profileHandle}
              tagline={uiBio}
              onProfile={() => router.push("/profile")}
              onLogout={logout}
            />
          </div>
        </div>
      </div>

      <div style={layoutGrid}>
        <aside style={{ position: "sticky", top: 108 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={quietCard}>
              <div style={sideTitle}>Quick Actions</div>
              <div style={{ display: "grid", gap: 10 }}>
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.985 }}
                  style={{ ...primaryBtn, width: "100%" }}
                  onClick={() => {
                    setTab("community");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    setTimeout(() => composerRef.current?.focus(), 50);
                  }}
                >
                  Create post
                </motion.button>

                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.985 }}
                  style={{ ...ghostBtn, width: "100%" }}
                  onClick={() => router.push("/profile")}
                >
                  Edit profile
                </motion.button>

                <div style={divider} />

                <div style={{ fontSize: 12, color: TEXT_MID, lineHeight: 1.55 }}>Consistent, honest updates build trust fast.</div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={quietCard}>
              <div style={sideTitle}>Trust & Quality</div>
              <div style={{ display: "grid", gap: 10 }}>
                <TrustPill label="Profile completeness" value="Good" tone="good" />
                <TrustPill label="Verification" value="Coming soon" tone="neutral" />
                <TrustPill label="Transparency" value="High" tone="good" />
              </div>
            </motion.div>
          </div>
        </aside>

        <section style={{ minWidth: 0 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={centerTitleRow}>
              <div style={{ minWidth: 0 }}>
                <div style={centerTitle}>Dashboard</div>
                {subtitle ? <div style={centerSubtitle}>{subtitle}</div> : null}
              </div>

              <div style={tabsShell}>
                <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} onClick={() => setTab("community")} style={tabBtn(tab === "community")}>
                  Community
                </motion.button>
                <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} onClick={() => setTab("marketplace")} style={tabBtn(tab === "marketplace")}>
                  Marketplace
                </motion.button>
              </div>
            </div>

            <div style={{ ...divider, marginTop: 14 }} />
          </div>

          {tab === "community" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={heroComposerCard}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <Avatar initials={initials} avatarUrl={myAvatarUrl} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={composerHeaderRow}>
                    <div>
                      <div style={composerTitle}>Create post</div>
                    </div>
                  </div>

                  <div style={{ ...dividerSoft, marginTop: 12, marginBottom: 12 }} />

                  <textarea
                    ref={(el) => {
                      composerRef.current = el;
                    }}
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder="Share an update…"
                    style={composerArea}
                  />

                  <div style={composerControls}>
                    <select value={postTag} onChange={(e) => setPostTag(e.target.value as Post["tag"])} style={selectPill} disabled={posting}>
                      <option>Litter Update</option>
                      <option>Stud Available</option>
                      <option>Looking for match</option>
                      <option>Health Test Results</option>
                      <option>Advice</option>
                    </select>

                    <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: 260 }}>
                      <label
                        style={{
                          ...pill,
                          padding: "10px 14px",
                          display: "inline-flex",
                          gap: 10,
                          alignItems: "center",
                          opacity: posting ? 0.7 : 1,
                          cursor: posting ? "not-allowed" : "pointer",
                        }}
                      >
                        📎 Add media
                        <input
                          ref={mediaInputRef}
                          type="file"
                          accept="image/*,video/*"
                          style={{ display: "none" }}
                          disabled={posting}
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            setMediaFile(f);
                          }}
                        />
                      </label>

                      {mediaFile ? (
                        <>
                          <div style={fileChip} title={mediaFile.name}>
                            {mediaFile.name}
                          </div>
                          <motion.button
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.985 }}
                            style={{ ...ghostMini, width: 36, height: 36, opacity: posting ? 0.7 : 1 }}
                            onClick={() => {
                              if (posting) return;
                              setMediaFile(null);
                              if (mediaInputRef.current) mediaInputRef.current.value = "";
                            }}
                            aria-label="Remove media"
                            title="Remove"
                            disabled={posting}
                          >
                            ✕
                          </motion.button>
                        </>
                      ) : null}
                    </div>

                    <div style={{ flex: 1 }} />

                    <motion.button
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.985 }}
                      style={{
                        ...primaryBtn,
                        opacity: canPost ? 1 : 0.55,
                        cursor: canPost ? "pointer" : "not-allowed",
                      }}
                      onClick={createPost}
                      disabled={!canPost}
                    >
                      {posting ? "Posting…" : "Post"}
                    </motion.button>
                  </div>

                  {mediaPreview ? (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 12, color: TEXT_MID, marginBottom: 8 }}>Preview</div>
                      {isVideoFile(mediaFile) ? (
                        <video controls style={{ ...mediaVideo, maxHeight: 320 }} src={mediaPreview} />
                      ) : (
                        <div style={{ ...mediaImage, height: 220, backgroundImage: `url(${mediaPreview})` }} />
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.div>
          )}

          {tab === "community" ? (
            <>
              {feedLoading && posts.length === 0 ? (
                <div style={{ marginTop: 12, color: TEXT_MID, fontWeight: 900, letterSpacing: 0.15 }}>Loading feed…</div>
              ) : null}

              <div style={feedWrap}>
                {posts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    currentUserId={me?.id ?? null}
                    currentUsername={me?.username ?? null}
                    onDelete={deletePost}
                    onVisitUser={(username) => {
                      if (!username?.trim()) return;
                      if (username === me?.username) {
                        router.push("/profile");
                        return;
                      }
                      const ok = confirm(`Visit @${username}'s profile?`);
                      if (!ok) return;
                      router.push(`/u/${encodeURIComponent(username)}`);
                    }}
                  />
                ))}
              </div>

              <div style={feedFooter}>{loadingMore ? "Loading more…" : feedHasNext ? "Scroll for more" : "You’re all caught up"}</div>
            </>
          ) : (
            <MarketplaceMock />
          )}
        </section>

        <aside style={{ position: "sticky", top: 108 }}>
          <DiscoverySidebar onGoMarketplace={() => setTab("marketplace")} />
        </aside>
      </div>

      {tab === "community" && (
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          style={floatingCreate}
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            setTimeout(() => composerRef.current?.focus(), 50);
          }}
          aria-label="Create post"
          title="Create post"
        >
          +
        </motion.button>
      )}

      {showTop && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          style={floatingTop}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Scroll to top"
          title="Scroll to top"
        >
          ↑
        </motion.button>
      )}
    </main>
  );
}

/* ---------- Account Menu ---------- */

function AccountMenu({
  initials,
  avatarUrl,
  name,
  handle,
  tagline,
  onProfile,
  onLogout,
}: {
  initials: string;
  avatarUrl: string | null;
  name: string;
  handle: string;
  tagline: string;
  onProfile: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} onClick={() => setOpen((v) => !v)} style={accountChip} aria-label="Account menu" title="Account">
        <span style={accountAvatar}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
          ) : (
            initials
          )}
        </span>
        <span style={{ minWidth: 0 }}>
          <div style={accountName}>{name}</div>
          <div style={accountHandle}>{handle}</div>
        </span>
        <span style={{ opacity: 0.75, color: TEXT_MID }}>▾</span>
      </motion.button>

      {open && (
        <div style={accountMenuInward}>
          <div style={{ padding: 12 }}>
            <div style={{ fontWeight: 1000, letterSpacing: 0.1, color: TEXT_HIGH }}>{name}</div>
            <div style={{ marginTop: 4, fontSize: 12, color: TEXT_MID }}>{handle}</div>
            <div style={{ marginTop: 10, fontSize: 12, color: TEXT_LOW, lineHeight: 1.5 }}>{tagline}</div>
          </div>

          <div style={menuDivider} />

          <button
            onClick={() => {
              setOpen(false);
              onProfile();
            }}
            style={menuItem}
          >
            View / Edit profile
          </button>

          <div style={menuDivider} />

          <button
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            style={menuItem}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- RIGHT SIDEBAR ---------- */

function DiscoverySidebar({ onGoMarketplace }: { onGoMarketplace: () => void }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={quietCard}>
        <div style={sideTitle}>Recommended Breeders</div>
        <div style={{ display: "grid", gap: 10 }}>
          <RecommendRow name="Northwest Bulldogs" meta="French Bulldog • Tacoma" />
          <RecommendRow name="Evergreen Kennels" meta="Rottweiler • Seattle" />
          <RecommendRow name="RainCity Retrievers" meta="Golden • Olympia" />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={quietCard}>
        <div style={sideTitle}>Trending</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <TagPill text="#HealthTesting" />
          <TagPill text="#StudAvailable" />
          <TagPill text="#LitterUpdate" />
          <TagPill text="#OFA" />
          <TagPill text="#PennHIP" />
          <TagPill text="#Advice" />
        </div>

        <div style={{ ...divider, marginTop: 14, marginBottom: 12 }} />

        <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} style={{ ...ghostBtn, width: "100%" }} onClick={onGoMarketplace}>
          Browse matches →
        </motion.button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={quietCard}>
        <div style={sideTitle}>Events near you</div>
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
      <Avatar initials={name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()} avatarUrl={null} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={recommendName}>{name}</div>
        <div style={{ fontSize: 12, color: TEXT_MID }}>{meta}</div>
      </div>
      <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} style={{ ...pill, padding: "8px 12px" }}>
        Follow
      </motion.button>
    </div>
  );
}

function TagPill({ text }: { text: string }) {
  return <span style={tagPill}>{text}</span>;
}

function EventRow({ title, meta }: { title: string; meta: string }) {
  return (
    <div style={eventRow}>
      <div style={{ fontWeight: 950, fontSize: 14, letterSpacing: 0.1, color: TEXT_HIGH }}>{title}</div>
      <div style={{ fontSize: 12, marginTop: 4, color: TEXT_MID }}>{meta}</div>
    </div>
  );
}

/* ---------- FEED ---------- */

function PostCard({
  post,
  currentUserId,
  currentUsername,
  onDelete,
  onVisitUser,
}: {
  post: Post;
  currentUserId: number | null;
  currentUsername: string | null;
  onDelete: (postId: string) => void;
  onVisitUser: (username: string) => void;
}) {
  const initials = post.authorName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const canDelete = !!currentUserId && !!post.authorId && currentUserId === post.authorId;

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const clickable = !!post.authorUsername;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={postCardPremium}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div
          onClick={() => {
            if (!clickable || !post.authorUsername) return;
            // self -> /profile, others -> confirm + /u/[username]
            if (post.authorUsername === currentUsername) {
              onVisitUser(post.authorUsername);
              return;
            }
            onVisitUser(post.authorUsername);
          }}
          style={{
            cursor: clickable ? "pointer" : "default",
          }}
          title={clickable ? "Visit profile" : "User avatar"}
        >
          <Avatar initials={initials} avatarUrl={post.authorAvatarUrl ?? null} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={postHeaderLine}>
                <span style={postAuthor}>{post.authorName}</span>
                <span style={postHandle}>{post.authorHandle}</span>
                <span style={postTime}>• {post.time}</span>
                {post.location ? <span style={postLoc}>• {post.location}</span> : null}
              </div>

              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={tagBadge}>{post.tag}</span>
              </div>
            </div>

            <div ref={menuRef} style={{ position: "relative" }}>
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.985 }}
                style={ghostMini}
                aria-label="More"
                onClick={() => setOpen((v) => !v)}
                title="More"
              >
                ⋯
              </motion.button>

              {open && (
                <div style={postMenu}>
                  {canDelete ? (
                    <button
                      style={postMenuDanger}
                      onClick={() => {
                        setOpen(false);
                        onDelete(post.id);
                      }}
                    >
                      Delete post
                    </button>
                  ) : (
                    <div style={postMenuMuted}>Only the author can delete</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={postBody}>{post.text}</div>

          {post.media?.length ? (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {post.media.map((m, idx) =>
                m.type === "image" ? (
                  <div key={idx} style={{ ...mediaImage, backgroundImage: `url(${m.url})` }} />
                ) : (
                  <video key={idx} controls style={mediaVideo} src={m.url} />
                )
              )}
            </div>
          ) : null}

          <div style={{ ...dividerSoft, marginTop: 14, marginBottom: 12 }} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} style={actionPill}>
              🤍 Like
            </motion.button>
            <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} style={actionPill}>
              💬 Comment
            </motion.button>
            <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} style={actionPill}>
              ↗ Share
            </motion.button>
            <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} style={actionPill}>
              🔖 Save
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Avatar({ initials, avatarUrl }: { initials: string; avatarUrl: string | null }) {
  return (
    <div style={avatarShell} aria-label="User avatar">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 14 }} />
      ) : (
        initials
      )}
    </div>
  );
}

/* ---------- Marketplace mock ---------- */

function MarketplaceMock() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={quietCard}>
      <div style={dogMedia} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 1000, letterSpacing: 0.1, color: TEXT_HIGH }}>{name}</div>
        <span style={miniChip}>{tag}</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: TEXT_MID }}>
        {breed} • {age}
      </div>
      <div style={{ ...dividerSoft, marginTop: 14, marginBottom: 12 }} />
      <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} style={{ ...primaryBtn, width: "100%" }}>
        View details
      </motion.button>
    </motion.div>
  );
}

/* ---------- Sidebar helpers ---------- */

function TrustPill({ label, value, tone }: { label: string; value: string; tone: "good" | "neutral" }) {
  const border = tone === "good" ? "rgba(70,129,244,0.26)" : "rgba(201,179,126,0.22)";
  const bg = tone === "good" ? "rgba(70,129,244,0.10)" : "rgba(201,179,126,0.08)";
  return (
    <div style={{ ...trustRow, border: `1px solid ${border}`, background: bg }}>
      <div style={{ fontSize: 12, color: TEXT_MID }}>{label}</div>
      <div style={{ fontSize: 12, color: TEXT_HIGH, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

/* ---------- Styles ---------- */

const TEXT_HIGH = "rgba(244,241,235,0.96)";
const TEXT_MID = "rgba(214,208,200,0.72)";
const TEXT_LOW = "rgba(214,208,200,0.50)";

const pageBg: React.CSSProperties = {
  minHeight: "100vh",
  padding: "104px 40px 44px",
  background:
    "radial-gradient(1100px 680px at 50% -10%, rgba(70,129,244,0.10), rgba(0,0,0,0) 56%), radial-gradient(900px 520px at 85% 10%, rgba(255,255,255,0.03), rgba(0,0,0,0) 60%), linear-gradient(180deg, #0e0f12 0%, #0b0c0f 55%, #090a0c 100%)",
  color: TEXT_HIGH,
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
};

const topBar: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  height: 80,
  zIndex: 50,
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  background:
    "linear-gradient(180deg, rgba(14,15,18,0.86), rgba(14,15,18,0.62)), radial-gradient(1000px 260px at 50% 0%, rgba(255,255,255,0.04), rgba(0,0,0,0))",
  backdropFilter: "blur(18px)",
};

const topBarInner: React.CSSProperties = {
  maxWidth: 1240,
  margin: "0 auto",
  height: "100%",
  padding: "0 40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
};

const layoutGrid: React.CSSProperties = {
  maxWidth: 1240,
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "290px 1fr 340px",
  gap: 18,
  alignItems: "start",
};

const surface: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 22px 70px rgba(0,0,0,0.55)",
  backdropFilter: "blur(12px)",
};

const card: React.CSSProperties = {
  ...surface,
  padding: 16,
  background: "rgba(255,255,255,0.04)",
};

const quietCard: React.CSSProperties = {
  ...surface,
  padding: 16,
  background: "linear-gradient(180deg, rgba(255,255,255,0.030), rgba(255,255,255,0.014))",
};

const postCardPremium: React.CSSProperties = {
  ...surface,
  padding: 16,
  background: "linear-gradient(180deg, rgba(255,255,255,0.022), rgba(255,255,255,0.012))",
};

const heroComposerCard: React.CSSProperties = {
  ...surface,
  padding: 18,
  background: "linear-gradient(180deg, rgba(255,255,255,0.018), rgba(255,255,255,0.012) 55%, rgba(70,129,244,0.06))",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 26px 84px rgba(0,0,0,0.62)",
};

const divider: React.CSSProperties = {
  height: 1,
  width: "100%",
  background: "linear-gradient(90deg, rgba(255,255,255,0.00), rgba(255,255,255,0.10), rgba(255,255,255,0.08), rgba(255,255,255,0.00))",
};

const dividerSoft: React.CSSProperties = {
  height: 1,
  width: "100%",
  background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.10), rgba(255,255,255,0))",
  opacity: 0.75,
};

const vSep: React.CSSProperties = {
  width: 1,
  height: 28,
  background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.14), rgba(255,255,255,0.02))",
  opacity: 0.85,
};

const hSep: React.CSSProperties = {
  width: 1,
  height: 28,
  background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.14), rgba(255,255,255,0.02))",
  opacity: 0.85,
  margin: "0 2px",
};

const searchShell: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.030), rgba(255,255,255,0.014))",
  boxShadow: "0 16px 44px rgba(0,0,0,0.45)",
  backdropFilter: "blur(12px)",
  width: 600,
  maxWidth: "56vw",
};

const searchInput: React.CSSProperties = {
  width: "100%",
  border: "none",
  outline: "none",
  background: "transparent",
  color: TEXT_HIGH,
  fontSize: 14,
  letterSpacing: 0.15,
};

const searchHint: React.CSSProperties = {
  fontSize: 11,
  color: TEXT_LOW,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.02)",
  whiteSpace: "nowrap",
};

const notifDot: React.CSSProperties = {
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
  boxShadow: "0 10px 24px rgba(70,129,244,0.45)",
  color: "white",
};

const centerTitleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 12,
};

const centerTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 1000,
  letterSpacing: 0.2,
  color: TEXT_HIGH,
};

const centerSubtitle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 13,
  color: TEXT_MID,
  lineHeight: 1.5,
  maxWidth: 720,
};

const tabsShell: React.CSSProperties = {
  display: "inline-flex",
  gap: 8,
  padding: 6,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.02)",
  backdropFilter: "blur(12px)",
};

function tabBtn(active: boolean): React.CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: 14,
    border: "none",
    cursor: "pointer",
    fontWeight: 950,
    color: TEXT_HIGH,
    letterSpacing: 0.15,
    background: active ? "linear-gradient(180deg, rgba(70,129,244,0.24), rgba(70,129,244,0.10))" : "transparent",
    boxShadow: active ? "0 10px 22px rgba(70,129,244,0.10)" : "none",
  };
}

const primaryBtn: React.CSSProperties = {
  background: `linear-gradient(180deg, ${ACCENT}, rgba(70,129,244,0.86))`,
  color: "white",
  border: "none",
  padding: "12px 18px",
  borderRadius: 16,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 14px 34px rgba(70,129,244,0.30)",
  transition: "0.2s ease",
  letterSpacing: 0.15,
};

const ghostBtn: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(255,255,255,0.020), rgba(255,255,255,0.010))",
  color: TEXT_HIGH,
  border: "1px solid rgba(255,255,255,0.16)",
  padding: "12px 18px",
  borderRadius: 16,
  cursor: "pointer",
  fontWeight: 900,
  boxShadow: "0 14px 34px rgba(0,0,0,0.30)",
  backdropFilter: "blur(12px)",
};

const ghostMini: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.02)",
  color: TEXT_HIGH,
  width: 34,
  height: 34,
  borderRadius: 12,
  cursor: "pointer",
  display: "grid",
  placeItems: "center",
  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
  backdropFilter: "blur(10px)",
};

const pill: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.02)",
  color: TEXT_HIGH,
  padding: "10px 12px",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 850,
  letterSpacing: 0.1,
};

const fileChip: React.CSSProperties = {
  fontSize: 12,
  color: TEXT_MID,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.02)",
  padding: "8px 10px",
  borderRadius: 999,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: 280,
};

const actionPill: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.02)",
  color: TEXT_HIGH,
  padding: "8px 12px",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 850,
  letterSpacing: 0.1,
};

const tagBadge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.03)",
  fontSize: 12,
  fontWeight: 950,
  letterSpacing: 0.15,
  color: TEXT_HIGH,
};

const composerHeaderRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
};

const composerTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 1000,
  letterSpacing: 0.15,
  color: TEXT_HIGH,
};

const composerArea: React.CSSProperties = {
  width: "100%",
  minHeight: 98,
  resize: "vertical",
  padding: "12px 14px",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.020), rgba(255,255,255,0.010))",
  color: TEXT_HIGH,
  outline: "none",
  fontSize: 14,
  lineHeight: 1.65,
  letterSpacing: 0.12,
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02), 0 18px 40px rgba(0,0,0,0.22)",
};

const composerControls: React.CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 12,
  flexWrap: "wrap",
  alignItems: "center",
};

const selectPill: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.02)",
  color: TEXT_HIGH,
  padding: "10px 12px",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 900,
  outline: "none",
  letterSpacing: 0.1,
};

const avatarShell: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "linear-gradient(135deg, rgba(70,129,244,0.24), rgba(255,255,255,0.04))",
  display: "grid",
  placeItems: "center",
  fontWeight: 950,
  flex: "0 0 auto",
  letterSpacing: 0.35,
  boxShadow: "0 18px 40px rgba(0,0,0,0.40)",
  color: TEXT_HIGH,
  overflow: "hidden",
};

const feedWrap: React.CSSProperties = {
  display: "grid",
  gap: 14,
  marginTop: 14,
};

const feedFooter: React.CSSProperties = {
  marginTop: 14,
  color: TEXT_LOW,
  fontSize: 13,
  textAlign: "center",
  letterSpacing: 0.1,
};

const postHeaderLine: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  flexWrap: "wrap",
};

const postAuthor: React.CSSProperties = { fontWeight: 950, letterSpacing: 0.1, color: TEXT_HIGH };
const postHandle: React.CSSProperties = { color: TEXT_MID };
const postTime: React.CSSProperties = { color: TEXT_MID, opacity: 0.7 };
const postLoc: React.CSSProperties = { color: TEXT_MID, opacity: 0.65 };

const postBody: React.CSSProperties = {
  marginTop: 10,
  color: TEXT_HIGH,
  opacity: 0.92,
  lineHeight: 1.7,
  letterSpacing: 0.1,
  whiteSpace: "pre-wrap",
};

const mediaImage: React.CSSProperties = {
  width: "100%",
  height: 320,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  backgroundSize: "cover",
  backgroundPosition: "center",
  boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
};

const mediaVideo: React.CSSProperties = {
  width: "100%",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.35)",
  boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
};

const tagPill: React.CSSProperties = {
  fontSize: 12,
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.02)",
  color: TEXT_HIGH,
  opacity: 0.95,
  letterSpacing: 0.12,
  fontWeight: 850,
};

const eventRow: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.012)",
  marginBottom: 10,
};

const recommendName: React.CSSProperties = {
  fontWeight: 1000,
  fontSize: 14,
  letterSpacing: 0.1,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  color: TEXT_HIGH,
};

const sideTitle: React.CSSProperties = { fontWeight: 1000, marginBottom: 10, letterSpacing: 0.15, color: TEXT_HIGH };

const trustRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 12px",
  borderRadius: 14,
};

const miniChip: React.CSSProperties = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.03)",
  letterSpacing: 0.1,
  color: TEXT_HIGH,
};

const dogMedia: React.CSSProperties = {
  height: 190,
  borderRadius: 16,
  background: "linear-gradient(135deg, rgba(70,129,244,0.18), rgba(255,255,255,0.03))",
  border: "1px solid rgba(255,255,255,0.08)",
  marginBottom: 12,
  boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
};

const floatingCreate: React.CSSProperties = {
  position: "fixed",
  right: 26,
  bottom: 26,
  width: 54,
  height: 54,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.12)",
  background: `linear-gradient(180deg, ${ACCENT}, rgba(70,129,244,0.86))`,
  color: "white",
  fontWeight: 1000,
  fontSize: 26,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  boxShadow: "0 18px 50px rgba(70,129,244,0.28), 0 18px 60px rgba(0,0,0,0.55)",
  zIndex: 60,
};

const floatingTop: React.CSSProperties = {
  position: "fixed",
  right: 26,
  bottom: 90,
  width: 46,
  height: 46,
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(15,15,15,0.72)",
  color: TEXT_HIGH,
  fontWeight: 950,
  fontSize: 18,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  boxShadow: "0 16px 44px rgba(0,0,0,0.55)",
  zIndex: 60,
};

const accountChip: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.020), rgba(255,255,255,0.010))",
  boxShadow: "0 16px 44px rgba(0,0,0,0.40)",
  cursor: "pointer",
  minWidth: 190,
  maxWidth: 240,
};

const accountAvatar: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 14,
  display: "grid",
  placeItems: "center",
  fontWeight: 1000,
  letterSpacing: 0.35,
  color: TEXT_HIGH,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(70,129,244,0.18))",
  overflow: "hidden",
};

const accountName: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 950,
  letterSpacing: 0.12,
  color: TEXT_HIGH,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const accountHandle: React.CSSProperties = {
  fontSize: 11,
  color: TEXT_MID,
  letterSpacing: 0.12,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const accountMenuInward: React.CSSProperties = {
  position: "absolute",
  right: 0,
  top: 52,
  width: 240,
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(12,13,16,0.92)",
  backdropFilter: "blur(14px)",
  boxShadow: "0 26px 84px rgba(0,0,0,0.70)",
  overflow: "hidden",
  zIndex: 80,
  transform: "translateX(-170px) translateY(-10px)",
};

const menuItem: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  background: "transparent",
  border: "none",
  color: TEXT_HIGH,
  textAlign: "left",
  cursor: "pointer",
  fontWeight: 900,
  letterSpacing: 0.12,
};

const menuDivider: React.CSSProperties = {
  height: 1,
  background: "rgba(255,255,255,0.08)",
};

// ✅ Post menu styles
const postMenu: React.CSSProperties = {
  position: "absolute",
  right: 0,
  top: 40,
  width: 190,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(12,13,16,0.92)",
  backdropFilter: "blur(14px)",
  boxShadow: "0 24px 70px rgba(0,0,0,0.70)",
  overflow: "hidden",
  zIndex: 90,
};

const postMenuDanger: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  background: "transparent",
  border: "none",
  color: "rgba(255,140,140,0.95)",
  textAlign: "left",
  cursor: "pointer",
  fontWeight: 950,
  letterSpacing: 0.12,
};

const postMenuMuted: React.CSSProperties = {
  padding: "12px",
  fontSize: 12,
  color: TEXT_MID,
};
