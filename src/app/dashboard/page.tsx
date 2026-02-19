"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { clearSession, getSession, getToken, getUser } from "@/lib/auth";
import { API_BASE } from "@/lib/api";
import { demoPosts, demoMarketplace } from "@/lib/demoSeed";
import StoriesBar from "@/components/StoriesBar";



const ACCENT = "#4681f4";

/* -------------------------------- Types -------------------------------- */

type Tab = "community" | "network";

type PostTag =
  | "Announcement"
  | "Litter Update"
  | "Program Update"
  | "Breeding Advice"
  | "Health Testing"
  | "Stud Available"
  | "Looking for Match"
  | "Mentorship"
  | "Success Story"
  | "Question"
  | "Event / Meetup"
  | "Resources";

type Post = {
  id: string;
  authorId?: number;
  authorName: string;
  authorHandle: string;
  authorUsername?: string;
  authorAvatarUrl?: string | null;
  location?: string;
  tag: PostTag;
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
  tag: PostTag;
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

type Toast = {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  msg?: string;
};

/* ------------------------------ Helpers -------------------------------- */

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function pid(id: string | number) {
  return String(id);
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

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeForSearch(s: string) {
  return (s || "").toLowerCase().trim();
}

function fmtCount(n: number) {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}m`;
}

function commentLikeKey(postId: string, commentId: string) {
  return `${postId}:${commentId}`;
}

/* ---------------------- Premium username styling ----------------------- */

const PREMIUM_GRADIENTS = [
  // ice/silver
  "linear-gradient(90deg, rgba(245,246,255,0.95), rgba(186,203,255,0.95))",
  // champagne/gold (subtle)
  "linear-gradient(90deg, rgba(255,244,214,0.95), rgba(201,179,126,0.95))",
  // sapphire
  "linear-gradient(90deg, rgba(166,205,255,0.95), rgba(70,129,244,0.95))",
  // violet
  "linear-gradient(90deg, rgba(219,203,255,0.95), rgba(156,122,255,0.95))",
  // mint
  "linear-gradient(90deg, rgba(184,255,232,0.95), rgba(86,245,162,0.95))",
  // rose (very muted)
  "linear-gradient(90deg, rgba(255,219,232,0.92), rgba(255,160,198,0.92))",
] as const;

function hashStr(input: string) {
  const s = (input || "").trim();
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 0;
}

function premiumNameStyle(seed: string): React.CSSProperties {
  const idx = hashStr(seed) % PREMIUM_GRADIENTS.length;
  return {
    backgroundImage: PREMIUM_GRADIENTS[idx],
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    textShadow: "0 10px 26px rgba(70,129,244,0.10)",
  };
}

/* ----------------------------- Local Store ----------------------------- */

const LS = {
  draft: "lincani_draft_v2",
  likes: "lincani_likes_v2",
  saves: "lincani_saves_v2",
  comments: "lincani_comments_v2",
  shares: "lincani_shares_v2",
  commentLikes: "lincani_comment_likes_v2",
};

type LikeMap = Record<string, boolean>;
type SaveMap = Record<string, boolean>;
type ShareMap = Record<string, number>;
type CommentLikeMap = Record<string, boolean>;

type Comment = {
  id: string;
  postId: string;
  author: string;
  text: string;
  createdAt: number;
  likes: number;
};

type CommentMap = Record<string, Comment[]>;

/* -------------------------------- Page -------------------------------- */

export default function DashboardPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("community");
  console.log("TAB VALUE:", tab);
  const [query, setQuery] = useState("");

  const [authLoading, setAuthLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean>(() => {
    const s = getSession();
    const t = getToken();
    return !!s && !!t;
  });

  const [me, setMe] = useState<ApiMeResponse["user"] | null>(() => {
    const u = getUser<ApiMeResponse["user"]>();
    return u ?? null;
  });

  const [profile, setProfile] = useState<PublicProfile | null>(() => {
    if (typeof window === "undefined") return null;
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

  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedCursor, setFeedCursor] = useState<string | null>(null);
  const [feedHasNext, setFeedHasNext] = useState(true);

  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  const [postText, setPostText] = useState(() => {
    if (typeof window === "undefined") return "";
    return safeJsonParse<{ text: string; tag: PostTag }>(localStorage.getItem(LS.draft), {
      text: "",
      tag: "Announcement",
    }).text;
  });

  const [postTag, setPostTag] = useState<PostTag>(() => {
    if (typeof window === "undefined") return "Announcement";
    return safeJsonParse<{ text: string; tag: PostTag }>(localStorage.getItem(LS.draft), {
      text: "",
      tag: "Announcement",
    }).tag;
  });

  const [posting, setPosting] = useState(false);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>("");

  const [showTop, setShowTop] = useState(false);

  const [likes, setLikes] = useState<LikeMap>(() => {
    if (typeof window === "undefined") return {};
    return safeJsonParse<LikeMap>(localStorage.getItem(LS.likes), {});
  });
  const [saves, setSaves] = useState<SaveMap>(() => {
    if (typeof window === "undefined") return {};
    return safeJsonParse<SaveMap>(localStorage.getItem(LS.saves), {});
  });
  const [comments, setComments] = useState<CommentMap>(() => {
    if (typeof window === "undefined") return {};
    return safeJsonParse<CommentMap>(localStorage.getItem(LS.comments), {});
  });
  const [commentLikes, setCommentLikes] = useState<CommentLikeMap>(() => {
    if (typeof window === "undefined") return {};
    return safeJsonParse<CommentLikeMap>(localStorage.getItem(LS.commentLikes), {});
  });
  const [shares, setShares] = useState<ShareMap>(() => {
    if (typeof window === "undefined") return {};
    return safeJsonParse<ShareMap>(localStorage.getItem(LS.shares), {});
  });

  const [tagFilter, setTagFilter] = useState<PostTag | "All">("All");
  const [viewMode, setViewMode] = useState<"All" | "Saved">("All");
  const [sortMode, setSortMode] = useState<"Newest" | "Popular">("Newest");

  const [openCommentsMap, setOpenCommentsMap] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const [toasts, setToasts] = useState<Toast[]>([]);
  function toast(t: Omit<Toast, "id">) {
    const id = uid("toast");
    setToasts((p) => [...p, { ...t, id }]);
    setTimeout(() => {
      setToasts((p) => p.filter((x) => x.id !== id));
    }, 2600);
  }

  const [lightbox, setLightbox] = useState<{
    open: boolean;
    type: "image" | "video";
    url: string;
    title?: string;
  } | null>(null);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // ✅ prevents “double-like” on comment clicks (rapid duplicate events / edge-case bubbling)
  const commentLikeGuardRef = useRef<Record<string, number>>({});

  /* ------------------------- Persist local maps ------------------------- */

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LS.likes, JSON.stringify(likes));
    } catch {}
  }, [likes]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LS.saves, JSON.stringify(saves));
    } catch {}
  }, [saves]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LS.comments, JSON.stringify(comments));
    } catch {}
  }, [comments]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LS.commentLikes, JSON.stringify(commentLikes));
    } catch {}
  }, [commentLikes]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LS.shares, JSON.stringify(shares));
    } catch {}
  }, [shares]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LS.draft, JSON.stringify({ text: postText, tag: postTag }));
    } catch {}
  }, [postText, postTag]);

  useEffect(() => {
    if (!mediaFile) {
      setMediaPreview("");
      return;
    }
    const url = URL.createObjectURL(mediaFile);
    setMediaPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [mediaFile]);

  /* ------------------------------ Auth load ----------------------------- */

  useEffect(() => {
    const s = getSession();
    const token = getToken();

    if (!s || !token) {
      setAuthed(false);
      setAuthLoading(false);
      router.replace("/login");
      return;
    }

    setAuthed(true);

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
        try {
          localStorage.removeItem("breedlink_token");
          localStorage.removeItem("breedlink_user");
        } catch {}
        if (!cancelled) {
          setAuthed(false);
          router.replace("/login");
        }
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
    return bio ? bio : "Breeder networking • Health-first programs • Transparency";
  }, [profile]);

  function logout() {
    clearSession();
    try {
      localStorage.removeItem("breedlink_token");
      localStorage.removeItem("breedlink_user");
    } catch {}
    router.replace("/");
  }

  /* ------------------------------ Feed API ------------------------------ */

  function mapApiToUi(p: ApiFeedPost): Post {
    const authorName = p.author?.display_name?.trim()
      ? p.author.display_name!
      : p.author?.username
      ? p.author.username.replace(/[._-]+/g, " ")
      : "Lincani User";

    const authorHandle = p.author?.username ? `@${p.author.username}` : "@lincani";
    const mu = toAbsoluteMediaUrl(p.mediaUrl || "");
    const avatarAbs = p.author?.avatar_url?.trim() ? toAbsoluteMediaUrl(p.author.avatar_url) : null;

    return {
      id: pid(p.id),
      authorId: p.author?.id,
      authorName,
      authorHandle,
      authorUsername: p.author?.username || undefined,
      authorAvatarUrl: avatarAbs,
      location: p.location || p.author?.location || undefined,
      tag: p.tag,
      time: timeAgo(p.createdAt),
      text: sanitizeText(p.text),
      media: mu ? [{ type: isProbablyVideo(mu) ? "video" : "image", url: mu }] : undefined,
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
      try {
        localStorage.removeItem("breedlink_token");
        localStorage.removeItem("breedlink_user");
      } catch {}
      setAuthed(false);
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

  async function createPostRequest(token: string, payload: { text: string; tag: PostTag; mediaUrl?: string }) {
    const res = await fetch(`${API_BASE}/posts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
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
      if (mediaFile) uploaded = await uploadSingleMedia(mediaFile, token);

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

      toast({ type: "success", title: "Posted", msg: "Your update is live." });

      await loadFeedFirstPage();

      setPostText("");
      setPostTag("Announcement");
      setMediaFile(null);
      if (mediaInputRef.current) mediaInputRef.current.value = "";
      try {
        localStorage.removeItem(LS.draft);
      } catch {}

      setTimeout(() => composerRef.current?.focus(), 50);
    } catch {
      toast({ type: "error", title: "Post failed", msg: "Session expired or server error." });
      clearSession();
      try {
        localStorage.removeItem("breedlink_token");
        localStorage.removeItem("breedlink_user");
      } catch {}
      setAuthed(false);
      router.replace("/login");
    } finally {
      setPosting(false);
    }
  }

  async function deletePost(postId: string) {
    const token = getToken();
    if (!token) return;

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
        toast({ type: "error", title: "Delete failed", msg: data?.error || "Try again." });
        return;
      }

      toast({ type: "success", title: "Deleted", msg: "Post removed." });
      setPosts((prev) => prev.filter((p) => pid(p.id) !== postId));
      await loadFeedFirstPage();
    } catch {
      toast({ type: "error", title: "Session expired", msg: "Please log in again." });
      clearSession();
      try {
        localStorage.removeItem("breedlink_token");
        localStorage.removeItem("breedlink_user");
      } catch {}
      setAuthed(false);
      router.replace("/login");
    }
  }

  /* ------------------------------ Lifecycle ----------------------------- */

  useEffect(() => {
    if (authLoading) return;
    if (!authed) return;
    if (tab !== "community") return;
    loadFeedFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, authed, tab]);

  useEffect(() => {
    function onScroll() {
      const scrollY = window.scrollY || window.pageYOffset;
      setShowTop(scrollY > 520);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (tab !== "community") return;
    if (!feedHasNext) return;

    const el = loadMoreRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit) loadMoreFeed();
      },
      { root: null, rootMargin: "420px", threshold: 0.01 }
    );

    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, feedHasNext, feedCursor, feedLoading, loadingMore]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const inp = document.getElementById("dash-search") as HTMLInputElement | null;
        inp?.focus();
      }
      if (e.key === "Escape") {
        setLightbox(null);
      }
    }
    window.addEventListener("keydown", onKey as any);
    return () => window.removeEventListener("keydown", onKey as any);
  }, []);

  const canPost = !!sanitizeText(postText.trim()) && !posting;

  const seededPosts: Post[] = posts.length ? posts : ((demoPosts as unknown) as Post[]);
  const usingDemoPosts = posts.length === 0;

  const savedCount = useMemo(() => Object.values(saves).filter(Boolean).length, [saves]);
  const likedCount = useMemo(() => Object.values(likes).filter(Boolean).length, [likes]);

  const filteredPosts = useMemo(() => {
    let list = seededPosts.slice().map((p) => ({ ...p, id: pid(p.id) }));

    if (viewMode === "Saved") list = list.filter((p) => !!saves[pid(p.id)]);
    if (tagFilter !== "All") list = list.filter((p) => p.tag === tagFilter);

    const q = normalizeForSearch(query);
    if (q) {
      list = list.filter((p) => {
        const hay = normalizeForSearch(`${p.authorName} ${p.authorHandle} ${p.location || ""} ${p.tag} ${p.text}`);
        return hay.includes(q);
      });
    }

    if (sortMode === "Popular") {
      list.sort((a, b) => {
        const aid = pid(a.id);
        const bid = pid(b.id);
        const al = likes[aid] ? 1 : 0;
        const bl = likes[bid] ? 1 : 0;
        const ac = comments[aid]?.length || 0;
        const bc = comments[bid]?.length || 0;
        const as = saves[aid] ? 1 : 0;
        const bs = saves[bid] ? 1 : 0;
        const ash = shares[aid] || 0;
        const bsh = shares[bid] || 0;
        return bl * 3 + bc * 2 + bs + bsh - (al * 3 + ac * 2 + as + ash);
      });
    }

    return list;
  }, [seededPosts, viewMode, tagFilter, sortMode, query, saves, likes, comments, shares]);

  const seededNetwork =
    (demoMarketplace as unknown) as {
      id: string;
      title: string;
      location: string;
      priceLabel: string;
      badge: string;
      image: string;
    }[];

  const networkFiltered = useMemo(() => {
    const q = normalizeForSearch(query);
    if (!q) return seededNetwork;
    return seededNetwork.filter((x) => normalizeForSearch(`${x.title} ${x.location} ${x.badge} ${x.priceLabel}`).includes(q));
  }, [seededNetwork, query]);

  function toggleLike(postId: string) {
    const id = pid(postId);
    setLikes((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleSave(postId: string) {
    const id = pid(postId);
    setSaves((prev) => {
      const nextVal = !prev[id];
      const next = { ...prev, [id]: nextVal };
      toast({
        type: "info",
        title: nextVal ? "Saved" : "Removed from Saved",
        msg: nextVal ? "You can view it in Saved." : "Post unsaved.",
      });
      return next;
    });
  }

  // ✅ Share copies DIRECT LINK, not text
  async function sharePost(post: Post) {
    const link = `https://lincani.com/post/${encodeURIComponent(pid(post.id))}`;
    try {
      await navigator.clipboard.writeText(link);
      setShares((prev) => ({ ...prev, [pid(post.id)]: (prev[pid(post.id)] || 0) + 1 }));
      toast({ type: "success", title: "Copied link", msg: "Direct post link copied." });
    } catch {
      toast({ type: "error", title: "Copy failed", msg: "Browser blocked clipboard access." });
    }
  }

  function toggleCommentsOpen(postId: string) {
    const id = pid(postId);
    setOpenCommentsMap((p) => ({ ...p, [id]: !p[id] }));
  }

  function addComment(postId: string) {
    const id = pid(postId);
    const raw = commentDrafts[id] || "";
    const clean = sanitizeText(raw.trim());
    if (!clean) return;

    const c: Comment = {
      id: uid("c"),
      postId: id,
      author: profileHandle,
      text: clean,
      createdAt: Date.now(),
      likes: 0,
    };

    setComments((prev) => {
      const list = prev[id] ? [...prev[id]] : [];
      list.unshift(c);
      return { ...prev, [id]: list };
    });

    setCommentDrafts((prev) => ({ ...prev, [id]: "" }));
    toast({ type: "success", title: "Comment added" });
  }

  // ✅ Fixed: comment-like double count (single atomic update, guarded)
  function toggleCommentLike(postId: string, commentId: string) {
    const id = pid(postId);
    const ck = commentLikeKey(id, commentId);

    const now = Date.now();
    const last = commentLikeGuardRef.current[ck] || 0;
    if (now - last < 220) return; // guards accidental double-fire
    commentLikeGuardRef.current[ck] = now;

    const currentlyLiked = !!commentLikes[ck];
    const nextLiked = !currentlyLiked;
    const delta = nextLiked ? 1 : -1;

    setCommentLikes((prev) => ({ ...prev, [ck]: nextLiked }));

    setComments((cm) => {
      const list = cm[id] ? [...cm[id]] : [];
      const idx = list.findIndex((x) => x.id === commentId);
      if (idx === -1) return cm;
      const current = list[idx];
      list[idx] = { ...current, likes: Math.max(0, (current.likes || 0) + delta) };
      return { ...cm, [id]: list };
    });
  }

  const chars = postText.length;
  const maxChars = 500;
  const overLimit = chars > maxChars;

  return (
    <main style={pageBg}>
      {/* Responsive + layout fixes (prevents right sidebar cutoff + removes horizontal overflow) */}
      <style jsx global>{`
        html,
        body {
          overflow-x: hidden;
        }

       /* Make native <select> dropdown options readable (dark theme) */
select option,
select optgroup {
  background: #0e0f12 !important;
  color: rgba(244,241,235,0.96) !important;
}


        @media (max-width: 1100px) {
          .dashGrid {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          }
          .dashLeft {
            position: static !important;
            top: auto !important;
          }
          .dashRight {
            position: static !important;
            top: auto !important;
            grid-column: 1 / -1;
          }
        }
        @media (max-width: 820px) {
          .dashGrid {
            grid-template-columns: 1fr;
          }
          .dashLeft,
          .dashRight {
            grid-column: 1 / -1;
          }
        }
        @media (max-width: 720px) {
          .dashPad {
            padding-left: 18px !important;
            padding-right: 18px !important;
          }
          .topInner {
            padding-left: 18px !important;
            padding-right: 18px !important;
          }
        }
      `}</style>

      <ToastStack toasts={toasts} />

      <AnimatePresence>
        {lightbox?.open ? (
          <Lightbox key="lb" type={lightbox.type} url={lightbox.url} title={lightbox.title} onClose={() => setLightbox(null)} />
        ) : null}
      </AnimatePresence>

      <div style={topBar}>
        <div style={topBarInner} className="topInner">
          {/* ✅ Single logo (no duplicates) in the nav brand slot */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 220 }}>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => router.push("/")}
              style={{
                border: "none",
                background: "transparent",
                padding: 0,
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                borderRadius: 14,
              }}
              aria-label="Lincani home"
              title="Home"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Lincani"
                style={{
                  height: 54,
                  width: "auto",
                  objectFit: "contain",
                  filter: "drop-shadow(0 16px 34px rgba(0,0,0,0.55))",
                }}
              />
            </motion.button>
          </div>

          <div style={vSep} />

          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <div style={searchShell}>
              <span style={{ opacity: 0.72, fontSize: 14, color: TEXT_MID }}>⌕</span>
              <input
                id="dash-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posts, tags, breeders…  (Ctrl+K)"
                style={searchInput}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setTab("network");
                }}
              />
              <div style={searchHint}>Enter → Network</div>
            </div>
          </div>

          <div style={vSep} />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 260,
              justifyContent: "flex-end",
            }}
          >
            <motion.button
              whileHover={{ y: -1, boxShadow: "0 18px 44px rgba(0,0,0,0.42)" }}
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
                whileHover={{ y: -1, boxShadow: "0 18px 44px rgba(0,0,0,0.42)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toast({ type: "info", title: "Notifications", msg: "We’ll wire this to backend next." })}
                style={{ ...ghostMini, width: 40, height: 40, borderRadius: 14, fontSize: 16 }}
                aria-label="Notifications"
                title="Notifications"
              >
                🔔
              </motion.button>
              <span style={notifDot}>3</span>
            </div>

            <motion.button
              whileHover={{ y: -1, boxShadow: "0 18px 44px rgba(0,0,0,0.42)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setViewMode((v) => (v === "All" ? "Saved" : "All"))}
              style={{ ...ghostMini, width: 40, height: 40, borderRadius: 14, fontSize: 16 }}
              aria-label="Saved"
              title="Saved"
            >
              🔖
            </motion.button>

            <motion.button
              whileHover={{ y: -1, boxShadow: "0 18px 44px rgba(0,0,0,0.42)" }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/profile")}
              style={{ ...ghostMini, width: 40, height: 40, borderRadius: 14, fontSize: 16 }}
              aria-label="Profile"
              title="Profile"
            >
              👤
            </motion.button>

            <motion.button
              whileHover={{ y: -1, boxShadow: "0 18px 44px rgba(0,0,0,0.42)" }}
              whileTap={{ scale: 0.98 }}
              onClick={logout}
              style={{ ...ghostMini, width: 40, height: 40, borderRadius: 14, fontSize: 16 }}
              aria-label="Sign out"
              title="Sign out"
            >
              ⎋
            </motion.button>
          </div>
        </div>
      </div>

      <div style={layoutGrid} className="dashGrid dashPad">
        <aside style={{ position: "sticky", top: 108 }} className="dashLeft">
          <div style={{ display: "grid", gap: 12 }}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 320, damping: 26 }} style={quietCard}>
              <div style={sideTitle}>Quick Actions</div>
              <div style={{ display: "grid", gap: 10 }}>
                <motion.button
                  whileHover={{ y: -1, boxShadow: "0 18px 46px rgba(70,129,244,0.18)" }}
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

                <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} style={{ ...ghostBtn, width: "100%" }} onClick={() => router.push("/profile")}>
                  Edit profile
                </motion.button>

                <div style={divider} />

                <div style={{ fontSize: 12, color: TEXT_MID, lineHeight: 1.55 }}>
                  Tip: Use <b>Ctrl+K</b> to search fast.
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 320, damping: 26 }} style={quietCard}>
              <div style={sideTitle}>Filters</div>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <FilterChip active={viewMode === "All"} onClick={() => setViewMode("All")} label="All posts" />
                  <FilterChip active={viewMode === "Saved"} onClick={() => setViewMode((v) => (v === "Saved" ? "All" : "Saved"))} label={`Saved (${savedCount})`} />
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <FilterChip active={tagFilter === "All"} onClick={() => setTagFilter("All")} label="All tags" />
                  {POST_TAGS.map((t) => (
                    <FilterChip key={t} active={tagFilter === t} onClick={() => setTagFilter((prev) => (prev === t ? "All" : t))} label={t} />
                  ))}
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <FilterChip active={sortMode === "Newest"} onClick={() => setSortMode((s) => (s === "Newest" ? "Popular" : "Newest"))} label="Newest" />
                  <FilterChip active={sortMode === "Popular"} onClick={() => setSortMode((s) => (s === "Popular" ? "Newest" : "Popular"))} label="Popular" />
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 320, damping: 26 }} style={quietCard}>
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
                <div style={centerSubtitle}>
                  {authLoading ? "Checking session…" : authed ? "Community + breeder network in one premium hub." : "Redirecting to sign in…"}
                </div>
              </div>

              <div style={tabsShell}>
                <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} onClick={() => setTab("community")} style={tabBtn(tab === "community")}>
                  Community
                </motion.button>
                <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} onClick={() => setTab("network")} style={tabBtn(tab === "network")}>
                  Network
                </motion.button>
              </div>
            </div>

            <div style={{ ...divider, marginTop: 14 }} />
          </div>
          <div style={{ marginBottom: 12 }}>
  <StoriesBar />
</div>


          {tab === "community" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              style={{
                ...heroComposerCard,
                opacity: authed ? 1 : 0.65,
                pointerEvents: authed ? ("auto" as const) : ("none" as const),
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 0, height: 0 }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={composerHeaderRow}>
                    <div>
                      <div style={composerTitle}>Create post</div>
                      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ ...miniChip, opacity: 0.95 }}>Draft autosaves</span>
                        <span style={{ ...miniChip, opacity: 0.95 }}>
                          {chars}/{maxChars}
                        </span>
                        {overLimit ? (
                          <span style={{ ...miniChip, borderColor: "rgba(255,140,140,0.35)", background: "rgba(255,140,140,0.08)" }}>Too long</span>
                        ) : null}
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.985 }}
                      style={{ ...ghostMini, width: 44, height: 44, borderRadius: 16, fontSize: 16 }}
                      onClick={() => {
                        setPostText("");
                        setPostTag("Announcement");
                        setMediaFile(null);
                        if (mediaInputRef.current) mediaInputRef.current.value = "";
                        try {
                          localStorage.removeItem(LS.draft);
                        } catch {}
                        toast({ type: "info", title: "Draft cleared" });
                      }}
                      title="Clear draft"
                      aria-label="Clear draft"
                    >
                      🧹
                    </motion.button>
                  </div>

                  <div style={{ ...dividerSoft, marginTop: 12, marginBottom: 12 }} />

                  <textarea
                    ref={(el) => {
                      composerRef.current = el;
                    }}
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder="Share an update…"
                    style={{ ...composerArea, borderColor: overLimit ? "rgba(255,140,140,0.35)" : (composerArea.borderColor as any) }}
                  />

                  <div style={composerControls}>
                    <select
  value={buildFeedFilterValue(viewMode, sortMode, tagFilter)}
  onChange={(e) => {
    const parsed = parseFeedFilterValue(e.target.value);
    if (parsed.view) setViewMode(parsed.view);
    if (parsed.sort) setSortMode(parsed.sort);
    if (parsed.tag) setTagFilter(parsed.tag);
  }}
  style={selectPill}
  disabled={posting}
>
  <optgroup label="View">
    <option value={buildFeedFilterValue("All", sortMode, tagFilter)}>All posts</option>
    <option value={buildFeedFilterValue("Saved", sortMode, tagFilter)}>Saved</option>
  </optgroup>

  <optgroup label="Sort">
    <option value={buildFeedFilterValue(viewMode, "Newest", tagFilter)}>Newest</option>
    <option value={buildFeedFilterValue(viewMode, "Popular", tagFilter)}>Popular</option>
  </optgroup>

  <optgroup label="Tags">
    <option value={buildFeedFilterValue(viewMode, sortMode, "All")}>All tags</option>
    {POST_TAGS.map((t) => (
      <option key={t} value={buildFeedFilterValue(viewMode, sortMode, t)}>
        {t}
      </option>
    ))}
  </optgroup>
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
                      whileHover={{ y: -1, boxShadow: "0 18px 50px rgba(70,129,244,0.24)" }}
                      whileTap={{ scale: 0.985 }}
                      style={{
                        ...primaryBtn,
                        opacity: canPost && !overLimit ? 1 : 0.55,
                        cursor: canPost && !overLimit ? "pointer" : "not-allowed",
                      }}
                      onClick={() => {
                        if (overLimit) {
                          toast({ type: "error", title: "Too long", msg: "Keep posts under 500 characters." });
                          return;
                        }
                        createPost();
                      }}
                      disabled={!canPost || overLimit}
                    >
                      {posting ? "Posting…" : "Post"}
                    </motion.button>
                  </div>

                  {mediaPreview ? (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 12, color: TEXT_MID, marginBottom: 8 }}>Preview</div>
                      {isVideoFile(mediaFile) ? (
                        <video controls style={{ ...mediaVideo, maxHeight: 360 }} src={mediaPreview} />
                      ) : (
                        <div style={{ ...mediaImage, height: 260, backgroundImage: `url(${mediaPreview})` }} />
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.div>
          )}

          {tab === "community" ? (
            <>
              {!authed ? (
                <div style={{ ...quietCard, marginTop: 14 }}>
                  <div style={{ fontWeight: 1000, letterSpacing: 0.1 }}>Sign-in required</div>
                  <div style={{ marginTop: 8, fontSize: 12, color: TEXT_MID, lineHeight: 1.55 }}>Your session is missing or expired. Redirecting to login…</div>
                  <div style={{ marginTop: 12 }}>
                    <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} style={primaryBtn} onClick={() => router.replace("/login")}>
                      Go to login
                    </motion.button>
                  </div>
                </div>
              ) : null}

              {feedLoading && posts.length === 0 ? (
                <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
                  <SkeletonPostCard />
                  <SkeletonPostCard />
                  <SkeletonPostCard />
                </div>
              ) : null}

              {usingDemoPosts && !feedLoading ? (
                <div style={{ marginTop: 12, fontSize: 12, color: TEXT_MID, opacity: 0.9 }}>Showing demo posts until the community starts posting.</div>
              ) : null}

              <div style={feedWrap}>
                {filteredPosts.map((p) => {
                  const id = pid(p.id);
                  const list = comments[id] || [];
                  const isOpen = !!openCommentsMap[id];

                  return (
                    <PostCard
                      key={id}
                      post={{ ...p, id }}
                      currentUserId={me?.id ?? null}
                      currentUsername={me?.username ?? null}
                      saved={!!saves[id]}
                      liked={!!likes[id]}
                      sharesCount={shares[id] || 0}
                      commentCount={list.length}
                      commentsList={list}
                      isCommentsOpen={isOpen}
                      commentDraft={commentDrafts[id] || ""}
                      onCommentDraft={(v) => setCommentDrafts((prev) => ({ ...prev, [id]: v }))}
                      onToggleComments={() => toggleCommentsOpen(id)}
                      onAddComment={() => addComment(id)}
                      onToggleCommentLike={(commentId) => toggleCommentLike(id, commentId)}
                      commentLiked={(commentId) => !!commentLikes[commentLikeKey(id, commentId)]}
                      onDelete={deletePost}
                      onLike={() => toggleLike(id)}
                      onSave={() => toggleSave(id)}
                      onShare={() => sharePost(p)}
                      onOpenMedia={(m) => {
                        setLightbox({
                          open: true,
                          type: m.type,
                          url: m.url,
                          title: `${p.authorHandle} • ${p.tag}`,
                        });
                      }}
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
                      isOnline={p.authorUsername ? p.authorUsername === me?.username : false}
                    />
                  );
                })}
              </div>

              <div ref={loadMoreRef} style={{ height: 1 }} />

              <div style={feedFooter}>{loadingMore ? "Loading more…" : feedHasNext ? "Keep scrolling" : "You’re all caught up"}</div>
            </>
          ) : (
            <NetworkMock items={networkFiltered} />
          )}
        </section>

        <aside style={{ position: "sticky", top: 108 }} className="dashRight">
          <DiscoverySidebar
            name={profileName}
            handle={profileHandle}
            initials={initials}
            bio={uiBio}
            savedCount={savedCount}
            likedCount={likedCount}
            onGoNetwork={() => setTab("network")}
            onGoProfile={() => router.push("/profile")}
          />
        </aside>
      </div>

      {tab === "community" && (
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          style={{
            ...floatingCreate,
            opacity: authed ? 1 : 0.55,
            cursor: authed ? "pointer" : "not-allowed",
          }}
          onClick={() => {
            if (!authed) return;
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

/* ----------------------------- UI Components ---------------------------- */

const POST_TAGS: PostTag[] = [
  "Announcement",
  "Litter Update",
  "Program Update",
  "Health Testing",
  "Stud Available",
  "Looking for Match",
  "Breeding Advice",
  "Mentorship",
  "Question",
  "Success Story",
  "Event / Meetup",
  "Resources",
];

function buildFeedFilterValue(viewMode: "All" | "Saved", sortMode: "Newest" | "Popular", tagFilter: PostTag | "All") {
  return `view:${viewMode}|sort:${sortMode}|tag:${tagFilter}`;
}

function parseFeedFilterValue(v: string): { view?: "All" | "Saved"; sort?: "Newest" | "Popular"; tag?: PostTag | "All" } {
  const out: any = {};
  const parts = (v || "").split("|");
  for (const p of parts) {
    const [k, raw] = p.split(":");
    if (!k) continue;
    const val = (raw || "").trim();
    if (k === "view" && (val === "All" || val === "Saved")) out.view = val;
    if (k === "sort" && (val === "Newest" || val === "Popular")) out.sort = val;
    if (k === "tag") out.tag = val as any;
  }
  return out;
}


function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      style={{
        ...miniChip,
        cursor: "pointer",
        borderColor: active ? "rgba(70,129,244,0.40)" : "rgba(255,255,255,0.12)",
        background: active ? "rgba(70,129,244,0.12)" : "rgba(255,255,255,0.03)",
      }}
    >
      {label}
    </motion.button>
  );
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div style={toastWrap}>
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            style={{
              ...toastCard,
              borderColor:
                t.type === "success" ? "rgba(86,245,162,0.26)" : t.type === "error" ? "rgba(255,140,140,0.26)" : "rgba(70,129,244,0.22)",
              background:
                t.type === "success"
                  ? "linear-gradient(180deg, rgba(86,245,162,0.10), rgba(255,255,255,0.02))"
                  : t.type === "error"
                  ? "linear-gradient(180deg, rgba(255,140,140,0.10), rgba(255,255,255,0.02))"
                  : "linear-gradient(180deg, rgba(70,129,244,0.10), rgba(255,255,255,0.02))",
            }}
          >
            <div style={{ fontWeight: 1000, letterSpacing: 0.1 }}>{t.title}</div>
            {t.msg ? <div style={{ marginTop: 6, fontSize: 12, color: TEXT_MID, lineHeight: 1.45 }}>{t.msg}</div> : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Lightbox({ type, url, title, onClose }: { type: "image" | "video"; url: string; title?: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={lightboxBackdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} style={lightboxCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 1000, color: TEXT_HIGH, letterSpacing: 0.1, fontSize: 13 }}>{title || "Media"}</div>
          <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} style={{ ...ghostMini, width: 38, height: 38 }} onClick={onClose} aria-label="Close" title="Close">
            ✕
          </motion.button>
        </div>

        <div style={{ marginTop: 12 }}>
          {type === "image" ? (
            <div style={{ ...mediaImage, height: 460, backgroundImage: `url(${url})` }} />
          ) : (
            <video controls style={{ ...mediaVideo, maxHeight: 560 }} src={url} />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function SkeletonPostCard() {
  return (
    <div style={{ ...postCardPremium, padding: 16, opacity: 0.9 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 16, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.10)" }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 12, width: 180, borderRadius: 999, background: "rgba(255,255,255,0.07)" }} />
          <div style={{ height: 10, width: 120, borderRadius: 999, background: "rgba(255,255,255,0.06)", marginTop: 10 }} />
          <div style={{ height: 10, width: "92%", borderRadius: 999, background: "rgba(255,255,255,0.05)", marginTop: 16 }} />
          <div style={{ height: 10, width: "86%", borderRadius: 999, background: "rgba(255,255,255,0.05)", marginTop: 10 }} />
          <div style={{ height: 10, width: "68%", borderRadius: 999, background: "rgba(255,255,255,0.05)", marginTop: 10 }} />
          <div style={{ height: 210, borderRadius: 18, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", marginTop: 16 }} />
        </div>
      </div>
    </div>
  );
}

function DiscoverySidebar({
  name,
  handle,
  initials,
  bio,
  savedCount,
  likedCount,
  onGoNetwork,
  onGoProfile,
}: {
  name: string;
  handle: string;
  initials: string;
  bio: string;
  savedCount: number;
  likedCount: number;
  onGoNetwork: () => void;
  onGoProfile: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 320, damping: 26 }} style={quietCard}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Avatar initials={initials} avatarUrl={null} online size={54} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 1000, letterSpacing: 0.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", ...premiumNameStyle(handle) }}>{name}</div>
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: TEXT_LOW, lineHeight: 1.55 }}>{bio}</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          <div style={statRow}>
            <div style={{ fontSize: 12, color: TEXT_MID }}>Saved</div>
            <div style={statNum}>{savedCount}</div>
          </div>
          <div style={statRow}>
            <div style={{ fontSize: 12, color: TEXT_MID }}>Likes</div>
            <div style={statNum}>{likedCount}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} style={{ ...ghostBtn, flex: 1 }} onClick={onGoProfile}>
            Profile
          </motion.button>
          <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} style={{ ...primaryBtn, flex: 1 }} onClick={onGoNetwork}>
            Network
          </motion.button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 320, damping: 26 }} style={quietCard}>
        <div style={sideTitle}>Recommended Breeders</div>
        <div style={{ display: "grid", gap: 10 }}>
          <RecommendRow name="Northwest Bulldogs" meta="French Bulldog • Tacoma" />
          <RecommendRow name="Evergreen Kennels" meta="Rottweiler • Seattle" />
          <RecommendRow name="RainCity Retrievers" meta="Golden • Olympia" />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 320, damping: 26 }} style={quietCard}>
        <div style={sideTitle}>Trending</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <TagPill text="#HealthTesting" />
          <TagPill text="#Mentorship" />
          <TagPill text="#StudAvailable" />
          <TagPill text="#LitterUpdate" />
          <TagPill text="#Resources" />
        </div>

        <div style={{ ...divider, marginTop: 14, marginBottom: 12 }} />

        <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} style={{ ...ghostBtn, width: "100%" }} onClick={onGoNetwork}>
          Find breeders →
        </motion.button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 320, damping: 26 }} style={quietCard}>
        <div style={sideTitle}>Events near you</div>
        <EventRow title="Breeder Roundtable" meta="Seattle • Saturday" />
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

function PostCard({
  post,
  currentUserId,
  currentUsername,
  saved,
  liked,
  sharesCount,
  commentCount,
  commentsList,
  isCommentsOpen,
  commentDraft,
  onCommentDraft,
  onToggleComments,
  onAddComment,
  onToggleCommentLike,
  commentLiked,
  onDelete,
  onVisitUser,
  onLike,
  onSave,
  onShare,
  onOpenMedia,
  isOnline,
}: {
  post: Post;
  currentUserId: number | null;
  currentUsername: string | null;
  saved: boolean;
  liked: boolean;
  sharesCount: number;
  commentCount: number;
  commentsList: Comment[];
  isCommentsOpen: boolean;
  commentDraft: string;
  onCommentDraft: (v: string) => void;
  onToggleComments: () => void;
  onAddComment: () => void;
  onToggleCommentLike: (commentId: string) => void;
  commentLiked: (commentId: string) => boolean;
  onDelete: (postId: string) => void;
  onVisitUser: (username: string) => void;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onOpenMedia: (m: { type: "image" | "video"; url: string }) => void;
  isOnline: boolean;
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

  const topComment = useMemo(() => {
    if (!commentsList?.length) return null;
    let best = commentsList[0];
    for (const c of commentsList) {
      if ((c.likes || 0) > (best.likes || 0)) best = c;
      else if ((c.likes || 0) === (best.likes || 0) && c.createdAt > best.createdAt) best = c;
    }
    return best;
  }, [commentsList]);

  const authorSeed = post.authorUsername || post.authorHandle || post.authorName;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.01, boxShadow: "0 30px 90px rgba(0,0,0,0.70)" }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      style={postCardPremium}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div
          onClick={() => {
            if (!clickable || !post.authorUsername) return;
            onVisitUser(post.authorUsername);
          }}
          style={{ cursor: clickable ? "pointer" : "default" }}
          title={clickable ? "Visit profile" : "User avatar"}
        >
          <Avatar initials={initials} avatarUrl={post.authorAvatarUrl ?? null} online={isOnline} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={postHeaderLine}>
                <span
  style={{
    ...postAuthor,
    ...premiumNameStyle(authorSeed),
    cursor: clickable ? "pointer" : "default",
  }}
  onClick={() => {
    if (!clickable || !post.authorUsername) return;
    onVisitUser(post.authorUsername);
  }}
  title={clickable ? "Visit profile" : undefined}
>
  {post.authorName}
</span>

                <span style={postTime}>• {post.time}</span>
                {post.location ? <span style={postLoc}>• {post.location}</span> : null}
              </div>

              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={tagBadge}>{post.tag}</span>
                {saved ? <span style={{ ...miniChip, borderColor: "rgba(70,129,244,0.35)", background: "rgba(70,129,244,0.10)" }}>Saved</span> : null}
              </div>
            </div>

            <div ref={menuRef} style={{ position: "relative" }}>
              <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} style={ghostMini} aria-label="More" onClick={() => setOpen((v) => !v)} title="More">
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
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.995 }}
                    style={{ ...mediaImage, backgroundImage: `url(${m.url})`, cursor: "pointer" }}
                    title="Open"
                    onClick={() => onOpenMedia(m)}
                  />
                ) : (
                  <motion.video
                    key={idx}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.995 }}
                    controls
                    style={{ ...mediaVideo, cursor: "pointer" } as any}
                    src={m.url}
                    onClick={() => onOpenMedia(m)}
                  />
                )
              )}
            </div>
          ) : null}

          <div style={{ ...dividerSoft, marginTop: 14, marginBottom: 12 }} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <motion.button
              whileHover={{ y: -1, boxShadow: "0 18px 44px rgba(70,129,244,0.14)" }}
              whileTap={{ scale: 0.985 }}
              style={{
                ...actionPill,
                borderColor: liked ? "rgba(70,129,244,0.40)" : (actionPill.border as any),
                background: liked ? "rgba(70,129,244,0.10)" : (actionPill.background as any),
              }}
              onClick={onLike}
            >
              {liked ? "💙 Like" : "🤍 Like"}
            </motion.button>

            <motion.button
              whileHover={{ y: -1, boxShadow: "0 18px 44px rgba(70,129,244,0.12)" }}
              whileTap={{ scale: 0.985 }}
              style={{
                ...actionPill,
                borderColor: isCommentsOpen ? "rgba(70,129,244,0.32)" : (actionPill.border as any),
                background: isCommentsOpen ? "rgba(70,129,244,0.08)" : (actionPill.background as any),
              }}
              onClick={onToggleComments}
            >
              💬 Comment {commentCount ? <span style={{ marginLeft: 6, opacity: 0.9 }}>({fmtCount(commentCount)})</span> : null}
            </motion.button>

            <motion.button whileHover={{ y: -1, boxShadow: "0 18px 44px rgba(0,0,0,0.35)" }} whileTap={{ scale: 0.985 }} style={actionPill} onClick={onShare}>
              ↗ Share
            </motion.button>

            <motion.button
              whileHover={{ y: -1, boxShadow: "0 18px 44px rgba(70,129,244,0.12)" }}
              whileTap={{ scale: 0.985 }}
              style={{
                ...actionPill,
                borderColor: saved ? "rgba(70,129,244,0.40)" : (actionPill.border as any),
                background: saved ? "rgba(70,129,244,0.10)" : (actionPill.background as any),
              }}
              onClick={onSave}
            >
              {saved ? "🔖 Saved" : "🔖 Save"}
            </motion.button>
          </div>

          <div style={countsLine}>
            <span style={countsStrong}>{liked ? 1 : 0}</span> likes • <span style={countsStrong}>{fmtCount(commentCount)}</span> comments •{" "}
            <span style={countsStrong}>{fmtCount(sharesCount)}</span> shares
          </div>

          {!isCommentsOpen ? (
            <div style={commentPreviewRow}>
              {commentCount > 0 ? (
                <>
                  {topComment ? (
                    <div style={commentPreviewText} title={`${topComment.author}: ${topComment.text}`}>
                      <span style={{ fontWeight: 950, marginRight: 8, ...premiumNameStyle(topComment.author) }}>{topComment.author}</span>
                      <span style={{ color: TEXT_MID }}>{topComment.text}</span>
                      <span style={{ marginLeft: 10, fontSize: 11, color: TEXT_LOW }}>
                        • {fmtCount(topComment.likes || 0)} like{(topComment.likes || 0) === 1 ? "" : "s"}
                      </span>
                    </div>
                  ) : (
                    <div style={commentPreviewText}>
                      <span style={{ color: TEXT_MID }}>Comments available</span>
                    </div>
                  )}

                  <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} style={viewCommentsBtn} onClick={onToggleComments}>
                    View all {fmtCount(commentCount)} comments
                  </motion.button>
                </>
              ) : (
                <div style={{ fontSize: 12, color: TEXT_MID, lineHeight: 1.5 }}>No comments yet.</div>
              )}
            </div>
          ) : null}

          <AnimatePresence initial={false}>
            {isCommentsOpen && (
              <motion.div
                key="comments"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                style={{ marginTop: 12 }}
              >
                <div style={commentPanel}>
                  <div style={commentPanelHeader}>
                    <div style={{ fontWeight: 1000, letterSpacing: 0.1, color: TEXT_HIGH }}>Comments</div>
                    <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} style={closeCommentsBtn} onClick={onToggleComments} aria-label="Close comments" title="Close">
                      ✕
                    </motion.button>
                  </div>

                  <div style={commentScrollArea}>
                    {commentsList.length ? (
                      commentsList.map((c) => {
                        const likedC = commentLiked(c.id);
                        return (
                          <motion.div
                            key={c.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 360, damping: 28 }}
                            style={commentCard}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                              <div style={{ fontWeight: 950, letterSpacing: 0.1, ...premiumNameStyle(c.author) }}>{c.author}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ fontSize: 11, color: TEXT_LOW }}>{timeAgo(c.createdAt)}</div>
                                <motion.button
                                  whileHover={{ y: -1 }}
                                  whileTap={{ scale: 0.985 }}
                                  onClick={() => onToggleCommentLike(c.id)}
                                  style={{
                                    ...commentLikeBtn,
                                    borderColor: likedC ? "rgba(70,129,244,0.40)" : "rgba(255,255,255,0.12)",
                                    background: likedC ? "rgba(70,129,244,0.10)" : "rgba(255,255,255,0.02)",
                                  }}
                                  title="Like comment"
                                  aria-label="Like comment"
                                >
                                  {likedC ? "💙" : "🤍"} <span style={{ fontSize: 12, fontWeight: 900, color: TEXT_HIGH }}>{fmtCount(c.likes || 0)}</span>
                                </motion.button>
                              </div>
                            </div>

                            <div style={commentText}>{c.text}</div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <div style={{ fontSize: 12, color: TEXT_MID, lineHeight: 1.55 }}>No comments yet. Be the first.</div>
                    )}
                  </div>

                  <div style={{ ...dividerSoft, marginTop: 12, marginBottom: 12 }} />

                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <textarea value={commentDraft} onChange={(e) => onCommentDraft(e.target.value)} placeholder="Add a comment…" style={{ ...composerArea, minHeight: 74 }} />
                    <motion.button
                      whileHover={{ y: -1, boxShadow: "0 18px 50px rgba(70,129,244,0.20)" }}
                      whileTap={{ scale: 0.985 }}
                      style={{ ...primaryBtn, padding: "12px 16px", borderRadius: 16 }}
                      onClick={onAddComment}
                      disabled={!sanitizeText(commentDraft.trim())}
                    >
                      Post
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function Avatar({ initials, avatarUrl, online, size = 48 }: { initials: string; avatarUrl: string | null; online?: boolean; size?: number }) {
  const radius = Math.round(size * 0.33);
  const dotSize = Math.max(9, Math.round(size * 0.2));

  return (
    <div style={{ ...avatarShell, width: size, height: size, borderRadius: radius, position: "relative" }} aria-label="User avatar">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: radius }} />
      ) : (
        initials
      )}

      
    </div>
  );
}

/* --------------------------- Network (Mock) ----------------------------- */

function NetworkMock({ items }: { items: { id: string; title: string; location: string; priceLabel: string; badge: string; image: string }[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
      {items.map((it) => (
        <NetworkTile key={it.id} item={it} />
      ))}
    </div>
  );
}

function NetworkTile({ item }: { item: { title: string; location: string; priceLabel: string; badge: string; image: string } }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      style={quietCard}
    >
      <div style={{ ...dogMedia, backgroundImage: `url(${item.image})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div style={{ fontWeight: 1000, letterSpacing: 0.1, color: TEXT_HIGH, lineHeight: 1.2 }}>{item.title}</div>
        <span style={miniChip}>{item.badge}</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: TEXT_MID }}>
        {item.location} • <span style={{ color: TEXT_HIGH, fontWeight: 900 }}>{item.priceLabel}</span>
      </div>
      <div style={{ ...dividerSoft, marginTop: 14, marginBottom: 12 }} />
      <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.985 }} style={{ ...primaryBtn, width: "100%" }}>
        View profile
      </motion.button>
    </motion.div>
  );
}

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

/* ------------------------------- Styles -------------------------------- */

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
  overflowX: "hidden",
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
  maxWidth: 1480,
  margin: "0 auto",
  height: "100%",
  padding: "0 28px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 16,
};

const layoutGrid: React.CSSProperties = {
  maxWidth: 1480,
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "minmax(240px, 260px) minmax(0, 1fr) minmax(280px, 320px)",
  gap: 18,
  alignItems: "start",
  overflowX: "visible",
};

const surface: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 22px 70px rgba(0,0,0,0.55)",
  backdropFilter: "blur(12px)",
};

const quietCard: React.CSSProperties = {
  ...surface,
  padding: 14,
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
  background:
    "linear-gradient(90deg, rgba(255,255,255,0.00), rgba(255,255,255,0.10), rgba(255,255,255,0.08), rgba(255,255,255,0.00))",
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
  width: 620,
  maxWidth: "58vw",
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

const commentLikeBtn: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.02)",
  color: TEXT_HIGH,
  padding: "8px 10px",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 900,
  letterSpacing: 0.12,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
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
  background: "rgba(255,255,255,0.03)",
  color: TEXT_HIGH,
  padding: "10px 14px",
  borderRadius: 999,
  cursor: "pointer",
  fontWeight: 950,
  outline: "none",
  letterSpacing: 0.12,
  boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
  backdropFilter: "blur(10px)",
  WebkitAppearance: "none",
  MozAppearance: "none",
  appearance: "none",
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

const postAuthor: React.CSSProperties = { fontWeight: 950, letterSpacing: 0.1 };
const postHandle: React.CSSProperties = {
  color: "rgba(214,208,200,0.65)",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 0.2,
};

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
  height: 360,
  maxHeight: 460,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundColor: "rgba(255,255,255,0.02)",
  boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
  overflow: "hidden",
};

const mediaVideo: React.CSSProperties = {
  width: "100%",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(0,0,0,0.35)",
  boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
};

const countsLine: React.CSSProperties = {
  marginTop: 10,
  fontSize: 12,
  color: TEXT_MID,
  letterSpacing: 0.1,
};

const countsStrong: React.CSSProperties = {
  color: TEXT_HIGH,
  fontWeight: 900,
};

const commentPreviewRow: React.CSSProperties = {
  marginTop: 10,
  display: "grid",
  gap: 10,
};

const commentPreviewText: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1.5,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  opacity: 0.92,
};

const viewCommentsBtn: React.CSSProperties = {
  alignSelf: "flex-start",
  border: "none",
  background: "transparent",
  color: "rgba(214,208,200,0.78)",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: 0.12,
  cursor: "pointer",
  padding: 0,
};

const commentPanel: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.016), rgba(255,255,255,0.010))",
  padding: 12,
  boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
  backdropFilter: "blur(12px)",
};

const commentPanelHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginBottom: 10,
};

const closeCommentsBtn: React.CSSProperties = {
  ...ghostMini,
  width: 34,
  height: 34,
  borderRadius: 12,
};

const commentScrollArea: React.CSSProperties = {
  maxHeight: 220,
  overflowY: "auto",
  display: "grid",
  gap: 10,
  paddingRight: 6,
};

const commentText: React.CSSProperties = {
  marginTop: 8,
  fontSize: 13,
  color: TEXT_HIGH,
  opacity: 0.92,
  lineHeight: 1.55,
  whiteSpace: "pre-wrap",
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

const sideTitle: React.CSSProperties = {
  fontWeight: 1000,
  marginBottom: 10,
  letterSpacing: 0.15,
  color: TEXT_HIGH,
};

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
  height: 200,
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

const statRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.02)",
};

const statNum: React.CSSProperties = {
  fontWeight: 1000,
  color: TEXT_HIGH,
  letterSpacing: 0.2,
};

const toastWrap: React.CSSProperties = {
  position: "fixed",
  right: 18,
  top: 92,
  zIndex: 200,
  display: "grid",
  gap: 10,
  width: 280,
  pointerEvents: "none",
};

const toastCard: React.CSSProperties = {
  pointerEvents: "none",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
  padding: "12px 12px",
  boxShadow: "0 22px 60px rgba(0,0,0,0.60)",
  backdropFilter: "blur(14px)",
};

const lightboxBackdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 210,
  background: "rgba(0,0,0,0.62)",
  backdropFilter: "blur(8px)",
  display: "grid",
  placeItems: "center",
  padding: 20,
};

const lightboxCard: React.CSSProperties = {
  width: "min(980px, 94vw)",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(12,13,16,0.92)",
  boxShadow: "0 26px 90px rgba(0,0,0,0.72)",
  padding: 14,
};

const commentCard: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.02)",
  padding: 12,
};
