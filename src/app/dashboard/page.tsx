"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  Camera,
  CheckCircle,
  ChevronUp,
  Home,
  MessageCircle,
  MoreHorizontal,
  Search,
  Settings,
  Store,
  Video,
} from "lucide-react";
import { clearSession, getSession, getToken, getUser } from "@/lib/auth";
import { API_BASE } from "@/lib/api";
import { demoMarketplace, demoPosts } from "@/lib/demoSeed";

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

type PublicProfile = {
  username: string;
  display_name?: string | null;
  bio?: string | null;
  location?: string | null;
  avatar_url?: string | null;
  created_at?: string;
};

type Toast = {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  msg?: string;
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

function sanitizeText(input: string) {
  const s = (input || "").trim();
  if (!s) return "";
  const banned = [
    /\bnigg(?:a|er|ers|as)\b/gi,
    /\bfag(?:got|gots)?\b/gi,
    /\bretard(?:ed|s)?\b/gi,
  ];
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

function commentLikeKey(postId: string, commentId: string) {
  return `${postId}:${commentId}`;
}

function initialsFromName(name: string) {
  const parts = name.split(" ").filter(Boolean);
  const a = parts[0]?.[0] || "L";
  const b = parts[1]?.[0] || parts[0]?.[1] || "U";
  return (a + b).toUpperCase();
}

const LS = {
  draft: "lincani_dashboard_draft_v4",
  likes: "lincani_dashboard_likes_v4",
  saves: "lincani_dashboard_saves_v4",
  comments: "lincani_dashboard_comments_v4",
  shares: "lincani_dashboard_shares_v4",
  commentLikes: "lincani_dashboard_comment_likes_v4",
};

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

function isValidPostTag(value: unknown): value is PostTag {
  return typeof value === "string" && POST_TAGS.includes(value as PostTag);
}

function normalizePostTag(value: unknown, fallback: PostTag = "Announcement"): PostTag {
  return isValidPostTag(value) ? value : fallback;
}

function toBackendTagVariants(tag: PostTag): string[] {
  const normalized = normalizePostTag(tag);
  const lower = normalized.toLowerCase();
  const collapsed = lower
    .replace(/\s*\/\s*/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const variants = [
    normalized,
    lower,
    collapsed,
    collapsed.replace(/\s+/g, "_"),
    collapsed.replace(/\s+/g, "-"),
  ].filter(Boolean);

  return [...new Set(variants)];
}

export default function DashboardPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("community");
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

  const [postText, setPostText] = useState(() => {
    if (typeof window === "undefined") return "";
    const saved = safeJsonParse<{ text: string; tag: unknown }>(
      localStorage.getItem(LS.draft),
      { text: "", tag: "Announcement" }
    );
    return typeof saved.text === "string" ? saved.text : "";
  });

  const [postTag, setPostTag] = useState<PostTag>(() => {
    if (typeof window === "undefined") return "Announcement";
    const saved = safeJsonParse<{ text: string; tag: unknown }>(
      localStorage.getItem(LS.draft),
      { text: "", tag: "Announcement" }
    );
    return normalizePostTag(saved.tag);
  });

  const [posting, setPosting] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState("");

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

  const [openCommentsMap, setOpenCommentsMap] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showTop, setShowTop] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [openPostMenuId, setOpenPostMenuId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{
    open: boolean;
    type: "image" | "video";
    url: string;
    title?: string;
  } | null>(null);

  const [query, setQuery] = useState("");
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const commentLikeGuardRef = useRef<Record<string, number>>({});

  function toast(t: Omit<Toast, "id">) {
    const id = uid("toast");
    setToasts((p) => [...p, { ...t, id }]);
    setTimeout(() => {
      setToasts((p) => p.filter((x) => x.id !== id));
    }, 2600);
  }

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
      } catch (err) {
        const isUnauthorized = err instanceof Error && err.message === "Unauthorized";
        if (isUnauthorized) {
          clearSession();
          try {
            localStorage.removeItem("breedlink_token");
            localStorage.removeItem("breedlink_user");
          } catch {}
          if (!cancelled) {
            setAuthed(false);
            router.replace("/login");
          }
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
    if (me?.username) return `@${me.username}`;
    if (me?.email) return `@${me.email.split("@")[0]}`;
    return "@lincani";
  }, [me]);

  function mapApiToUi(p: ApiFeedPost): Post {
    const authorName = p.author?.display_name?.trim()
      ? p.author.display_name!
      : p.author?.username
      ? p.author.username.replace(/[._-]+/g, " ")
      : "Lincani User";

    const authorHandle = p.author?.username ? `@${p.author.username}` : "@lincani";
    const mu = toAbsoluteMediaUrl(p.mediaUrl || "");
    const avatarAbs = p.author?.avatar_url?.trim()
      ? toAbsoluteMediaUrl(p.author.avatar_url)
      : null;

    return {
      id: pid(p.id),
      authorId: p.author?.id,
      authorName,
      authorHandle,
      authorUsername: p.author?.username || undefined,
      authorAvatarUrl: avatarAbs,
      location: p.location || p.author?.location || undefined,
      tag: normalizePostTag(p.tag),
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
    } catch (err) {
      const isUnauthorized = err instanceof Error && err.message === "Unauthorized";
      if (isUnauthorized) {
        clearSession();
        try {
          localStorage.removeItem("breedlink_token");
          localStorage.removeItem("breedlink_user");
        } catch {}
        setAuthed(false);
        router.replace("/login");
        return;
      }
      toast({ type: "error", title: "Feed unavailable", msg: "Could not load posts right now." });
    } finally {
      setFeedLoading(false);
    }
  }

  async function loadMoreFeed() {
    if (loadingMore || feedLoading || !feedHasNext) return;
    const token = getToken();
    if (!token) return;

    setLoadingMore(true);
    try {
      const url = `${API_BASE}/posts?limit=10&cursor=${encodeURIComponent(feedCursor || "")}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (res.status === 401 || res.status === 403) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed");

      const data = (await res.json()) as { posts: ApiFeedPost[]; nextCursor: string | null };
      const mapped = (data.posts || []).map(mapApiToUi);

      setPosts((prev) => [...prev, ...mapped]);
      setFeedCursor(data.nextCursor);
      setFeedHasNext(!!data.nextCursor);
    } catch (err) {
      const isUnauthorized = err instanceof Error && err.message === "Unauthorized";
      if (isUnauthorized) {
        clearSession();
        try {
          localStorage.removeItem("breedlink_token");
          localStorage.removeItem("breedlink_user");
        } catch {}
        setAuthed(false);
        router.replace("/login");
      }
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

  async function createPostRequest(
    token: string,
    payload: { text: string; tag: string; mediaUrl?: string }
  ) {
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

    const safeTag = normalizePostTag(postTag);
    const primaryTagVariants = toBackendTagVariants(safeTag);
    const fallbackTag: PostTag = "Announcement";
    const fallbackTagVariants = toBackendTagVariants(fallbackTag);

    setPosting(true);

    try {
      let uploaded: { rel: string; abs: string } | null = null;

      if (mediaFile) {
        uploaded = await uploadSingleMedia(mediaFile, token);
      }

      const mediaCandidates = [uploaded?.abs, uploaded?.rel, undefined].filter(
        (value, index, arr) => arr.indexOf(value) === index
      ) as Array<string | undefined>;

      const triedTags = new Set<string>();
      let finalResponse: Response | null = null;
      let finalPublishedTag = safeTag;
      let lastBackendError = "";

      const attemptPost = async (tagCandidate: string, isFallbackTag = false) => {
        if (triedTags.has(tagCandidate)) return false;
        triedTags.add(tagCandidate);

        for (const mediaUrl of mediaCandidates) {
          const res = await createPostRequest(token, {
            text: clean,
            tag: tagCandidate,
            mediaUrl,
          });

          if (res.ok) {
            finalResponse = res;
            finalPublishedTag = isFallbackTag ? fallbackTag : safeTag;
            return true;
          }

          const data = await res.json().catch(() => null);
          lastBackendError =
            typeof data?.error === "string"
              ? data.error
              : typeof data?.message === "string"
              ? data.message
              : "";

          if (!(res.status === 400 && /tag/i.test(lastBackendError))) {
            finalResponse = res;
            return true;
          }
        }

        return false;
      };

      for (const tagCandidate of primaryTagVariants) {
        const done = await attemptPost(tagCandidate, false);
        if (done) break;
      }

      const shouldTryFallbackTag =
        !finalResponse &&
        primaryTagVariants.every((candidate) => triedTags.has(candidate)) &&
        /tag/i.test(lastBackendError || "invalid tag");

      if (shouldTryFallbackTag) {
        for (const tagCandidate of fallbackTagVariants) {
          const done = await attemptPost(tagCandidate, true);
          if (done) break;
        }
      }

      const responseOk = Boolean((finalResponse as Response | null)?.ok);

if (!responseOk) {
        if (/tag/i.test(lastBackendError)) {
          toast({
            type: "error",
            title: "Invalid tag",
            msg: lastBackendError || "The API rejected every tag format for this post.",
          });
          setPostTag(fallbackTag);
          return;
        }

        toast({
          type: "error",
          title: "Post failed",
          msg: lastBackendError || "Could not create post.",
        });
        return;
      }

      toast({
        type: finalPublishedTag === safeTag ? "success" : "info",
        title: finalPublishedTag === safeTag ? "Posted" : "Tag reset",
        msg:
          finalPublishedTag === safeTag
            ? "Your update is live."
            : "Your update is live. The API only accepted the default Announcement tag.",
      });

      await loadFeedFirstPage();

      setPostText("");
      setPostTag(fallbackTag);
      setMediaFile(null);

      if (mediaInputRef.current) {
        mediaInputRef.current.value = "";
      }

      try {
        localStorage.removeItem(LS.draft);
      } catch {}

      setTimeout(() => composerRef.current?.focus(), 50);
    } catch (err) {
      if (err instanceof Error && err.message === "Unauthorized") {
        toast({
          type: "error",
          title: "Session expired",
          msg: "Please log in again.",
        });

        clearSession();

        try {
          localStorage.removeItem("breedlink_token");
          localStorage.removeItem("breedlink_user");
        } catch {}

        setAuthed(false);
        router.replace("/login");
        return;
      }

      toast({
        type: "error",
        title: "Post failed",
        msg: "Something went wrong. Please try again.",
      });
    } finally {
      setPosting(false);
    }
  }

  async function deletePost(postId: string) {
    const token = getToken();
    if (!token) return;

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
      setDeletePostId(null);
      setOpenPostMenuId(null);
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
      if (e.key === "Escape") setLightbox(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

    useEffect(() => {
    function handleClickAway() {
      setOpenPostMenuId(null);
    }

    if (!openPostMenuId) return;

    document.addEventListener("click", handleClickAway);
    return () => document.removeEventListener("click", handleClickAway);
  }, [openPostMenuId]);

  const seededPosts: Post[] = posts.length ? posts : (demoPosts as unknown as Post[]);

  const filteredPosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return seededPosts;
    return seededPosts.filter((p) =>
      `${p.authorName} ${p.authorHandle} ${p.text} ${p.tag} ${p.location || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [seededPosts, query]);

  const networkFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = demoMarketplace as unknown as {
      id: string;
      title: string;
      location: string;
      priceLabel: string;
      badge: string;
      image: string;
    }[];
    if (!q) return items;
    return items.filter((x) =>
      `${x.title} ${x.location} ${x.priceLabel} ${x.badge}`.toLowerCase().includes(q)
    );
  }, [query]);

  function toggleLike(postId: string) {
    const id = pid(postId);
    setLikes((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleSave(postId: string) {
    const id = pid(postId);
    setSaves((prev) => ({ ...prev, [id]: !prev[id] }));
  }

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
  }

  function toggleCommentLike(postId: string, commentId: string) {
    const id = pid(postId);
    const ck = commentLikeKey(id, commentId);

    const now = Date.now();
    const last = commentLikeGuardRef.current[ck] || 0;
    if (now - last < 220) return;
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

  const sidebarName = profileName;
  const sidebarAvatar = profile?.avatar_url ? toAbsoluteMediaUrl(profile.avatar_url) : null;

  return (
    <main style={pageBg}>
      <style jsx global>{`
        html,
        body {
          overflow-x: hidden;
          background: #1e1e1e;
          font-family: Inter, var(--font-geist-sans), system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        * {
          box-sizing: border-box;
        }

        textarea,
        input,
        select,
        button {
          font-family: inherit;
          appearance: none;
          -webkit-appearance: none;
          outline: none;
        }

        button {
          box-shadow: none;
        }

        button:focus,
        button:focus-visible,
        input:focus,
        input:focus-visible,
        textarea:focus,
        textarea:focus-visible,
        select:focus,
        select:focus-visible {
          outline: none;
          box-shadow: none;
        }

        textarea::placeholder,
        input::placeholder {
          color: rgba(170, 170, 170, 0.72);
        }

        textarea::-webkit-scrollbar,
        input::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        textarea::-webkit-scrollbar-thumb,
        input::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
        }

        @media (max-width: 1440px) {
          .dash-shell {
            width: 100%;
            padding-left: 22px;
            padding-right: 22px;
          }
        }

        @media (max-width: 1280px) {
          .dash-grid {
            grid-template-columns: 1fr;
            width: 100%;
          }

          .dash-left,
          .dash-right {
            position: static !important;
            width: 100% !important;
          }

          .dash-center {
            width: 100% !important;
          }
        }
      `}</style>

      <ToastStack toasts={toasts} />

      <AnimatePresence>
        {lightbox?.open ? (
          <Lightbox
            key="lb"
            type={lightbox.type}
            url={lightbox.url}
            title={lightbox.title}
            onClose={() => setLightbox(null)}
          />
        ) : null}
      </AnimatePresence>

      <TopBar query={query} onQuery={setQuery} avatarUrl={sidebarAvatar} />

      <div className="dash-shell" style={shell}>
        <div className="dash-grid" style={grid}>
          <aside className="dash-left" style={leftCol}>
            <LeftNav
              activeTab={tab}
              onCommunity={() => setTab("community")}
              onNetwork={() => setTab("network")}
              onProfile={() => router.push("/profile")}
            />
          </aside>

          <section className="dash-center" style={centerCol}>
            {tab === "community" ? (
              <>
                <ComposerCard
                  postText={postText}
                  onPostText={setPostText}
                  postTag={postTag}
                  onPostTag={(v) => setPostTag(normalizePostTag(v))}
                  posting={posting}
                  onCreatePost={createPost}
                  mediaPreview={mediaPreview}
                  mediaFile={mediaFile}
                  mediaInputRef={mediaInputRef}
                  composerRef={composerRef}
                  avatarUrl={sidebarAvatar}
                  onMedia={(f) => setMediaFile(f)}
                  onClearMedia={() => {
                    setMediaFile(null);
                    if (mediaInputRef.current) mediaInputRef.current.value = "";
                  }}
                />

                <div style={{ height: 18 }} />

                {feedLoading && posts.length === 0 ? (
                  <div style={{ display: "grid", gap: 18 }}>
                    <SkeletonFeedCard />
                    <SkeletonFeedCard />
                  </div>
                ) : null}

                {!authed ? (
                  <div style={emptyCard}>
                    <div style={emptyTitle}>Sign-in required</div>
                    <div style={emptyText}>Your session is missing or expired.</div>
                  </div>
                ) : null}

                <div style={{ display: "grid", gap: 18 }}>
                  {filteredPosts.map((p) => {
                    const id = pid(p.id);
                    const list = comments[id] || [];
                    return (
                      <FeedPostCard
                        key={id}
                        post={{ ...p, id }}
                        currentUserId={me?.id ?? null}
                        currentUsername={me?.username ?? null}
                        liked={!!likes[id]}
                        saved={!!saves[id]}
                        sharesCount={shares[id] || 0}
                        commentsList={list}
                        commentDraft={commentDrafts[id] || ""}
                        isCommentsOpen={!!openCommentsMap[id]}
                        onCommentDraft={(v) =>
                          setCommentDrafts((prev) => ({ ...prev, [id]: v }))
                        }
                        commentLiked={(commentId) => !!commentLikes[commentLikeKey(id, commentId)]}
                        onToggleComments={() => toggleCommentsOpen(id)}
                        onAddComment={() => addComment(id)}
                        onToggleCommentLike={(commentId) => toggleCommentLike(id, commentId)}
                        onDelete={deletePost}
                        onLike={() => toggleLike(id)}
                        onSave={() => toggleSave(id)}
                        onShare={() => sharePost(p)}
                        onOpenMedia={(m) =>
                          setLightbox({
                            open: true,
                            type: m.type,
                            url: m.url,
                            title: `${p.authorHandle} • ${p.tag}`,
                          })
                        }
                        menuOpen={openPostMenuId === id}
                        onToggleMenu={() => setOpenPostMenuId(openPostMenuId === id ? null : id)}
                        onRequestDelete={() => {
                          setOpenPostMenuId(null);
                          setDeletePostId(id);
                        }}
                      />
                    );
                  })}
                </div>

                <div ref={loadMoreRef} style={{ height: 1 }} />
                <div style={loadMoreText}>{loadingMore ? "Loading more…" : ""}</div>
              </>
            ) : (
              <NetworkGrid items={networkFiltered} />
            )}
          </section>

          <aside className="dash-right" style={rightCol}>
            <RightRail
              name={sidebarName}
              handle={profileHandle}
              avatarUrl={sidebarAvatar}
              onGoNetwork={() => setTab("network")}
            />
          </aside>
        </div>
      </div>

      {showTop ? (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          style={floatingTop}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <ChevronUp size={18} />
        </motion.button>
      ) : null}

      {deletePostId && (
        <div
          onClick={() => setDeletePostId(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 380,
              background: "#0f1117",
              borderRadius: 16,
              padding: 28,
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>Delete Post</h3>

            <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 22 }}>This action cannot be undone.</p>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setDeletePostId(null)}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "transparent",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                onClick={() => deletePost(deletePostId)}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "#ff3b3b",
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function TopBar({
  query,
  onQuery,
  avatarUrl,
}: {
  query: string;
  onQuery: (v: string) => void;
  avatarUrl: string | null;
}) {
  const router = useRouter();

  return (
    <motion.header initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={topbar}>
      <div style={topbarInner}>
        <button
          type="button"
          onClick={() => router.push("/")}
          style={logoButton}
          aria-label="Go to homepage"
          title="Go to homepage"
        >
          <div style={logoBox}>L</div>
          <div>
            <div style={logoText}>Lincani</div>
            <div style={logoSub}>TRUSTED BREEDER NETWORK</div>
          </div>
        </button>

        <div style={searchWrap}>
          <Search size={15} color="rgba(148,148,148,0.92)" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search breeders, posts, events..."
            style={searchInput}
          />
        </div>

        <div style={topActions}>
          <button
            type="button"
            style={homeTopBtn}
            onClick={() => router.push("/")}
            aria-label="Go to homepage"
            title="Home"
          >
            <Home size={15} color="#f5f7ff" />
          </button>

          <button style={iconBtn} aria-label="Messages">
            <MessageCircle size={14} color="rgba(223,223,223,0.92)" />
            <span style={orangeDot} />
          </button>

          <button style={iconBtn} aria-label="Notifications">
            <Bell size={14} color="rgba(223,223,223,0.92)" />
            <span style={orangeDot} />
          </button>

          <button
            onClick={() => router.push("/profile")}
            style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer" }}
          >
            <Avatar avatarUrl={avatarUrl} initials="LU" size={42} />
          </button>
        </div>
      </div>
    </motion.header>
  );
}

function LeftNav({
  activeTab,
  onCommunity,
  onNetwork,
  onProfile,
}: {
  activeTab: "community" | "network";
  onCommunity: () => void;
  onNetwork: () => void;
  onProfile: () => void;
}) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const items = [
    { key: "community", label: "Dashboard", icon: Home, badge: null },
    { key: "network", label: "Network", icon: Store, badge: "12" },
    { key: "messages", label: "Messages", icon: MessageCircle, badge: "3" },
    { key: "health", label: "Health Records", icon: Calendar, badge: null },
    { key: "events", label: "Events", icon: Calendar, badge: null },
    { key: "settings", label: "Settings", icon: Settings, badge: null },
  ] as const;

  return (
    <motion.div initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} style={leftCard}>
      <div style={{ display: "grid", gap: 5, alignContent: "start" }}>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            (item.key === "community" && activeTab === "community") ||
            (item.key === "network" && activeTab === "network");

          const onClick = () => {
            if (item.key === "community") return onCommunity();
            if (item.key === "network") return onNetwork();
            if (item.key === "settings") return onProfile();
          };

          return (
            <motion.button
              key={item.label}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.985 }}
              style={navRow(isActive, hoveredKey === item.key)}
              onClick={onClick}
              onMouseEnter={() => setHoveredKey(item.key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <Icon size={15} color={isActive ? "#ffffff" : "rgba(194,194,194,0.9)"} />
              <span style={navText(isActive)}>{item.label}</span>
              {item.badge ? (
                item.key === "messages" ? (
                  <span style={redBadge}>{item.badge}</span>
                ) : (
                  <span style={greyBadge}>{item.badge}</span>
                )
              ) : null}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

function ComposerCard({
  postText,
  onPostText,
  postTag,
  onPostTag,
  posting,
  onCreatePost,
  mediaPreview,
  mediaFile,
  mediaInputRef,
  composerRef,
  avatarUrl,
  onMedia,
  onClearMedia,
}: {
  postText: string;
  onPostText: (v: string) => void;
  postTag: PostTag;
  onPostTag: (v: PostTag) => void;
  posting: boolean;
  onCreatePost: () => void;
  mediaPreview: string;
  mediaFile: File | null;
  mediaInputRef: React.RefObject<HTMLInputElement | null>;
  composerRef: React.RefObject<HTMLTextAreaElement | null>;
  avatarUrl: string | null;
  onMedia: (f: File | null) => void;
  onClearMedia: () => void;
}) {
  const canPost = !!sanitizeText(postText.trim());

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={composerCard}>
      <div style={composerTop}>
        <Avatar initials="LU" avatarUrl={avatarUrl} size={48} />
        <textarea
          ref={composerRef}
          value={postText}
          onChange={(e) => onPostText(e.target.value)}
          placeholder="Share your breeding journey, milestones, or questions..."
          style={composerTextarea}
        />
      </div>

      {mediaPreview ? (
        <div style={{ marginTop: 14 }}>
          {isVideoFile(mediaFile) ? (
            <video controls src={mediaPreview} style={composerPreviewVideo} />
          ) : (
            <div
              style={{
                ...composerPreviewImage,
                backgroundImage: `url(${mediaPreview})`,
              }}
            />
          )}
        </div>
      ) : null}

      <div style={composerDivider} />

      <div style={composerBottom}>
        <div style={composerTools}>
          <label style={toolBtn}>
            <Camera size={15} />
            <span>Photo</span>
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/*,video/*"
              style={{ display: "none" }}
              onChange={(e) => onMedia(e.target.files?.[0] || null)}
            />
          </label>

          <label style={toolBtn}>
            <Video size={15} />
            <span>Video</span>
            <input
              type="file"
              accept="video/*"
              style={{ display: "none" }}
              onChange={(e) => onMedia(e.target.files?.[0] || null)}
            />
          </label>

          <div style={toolBtnStatic}>
            <Calendar size={15} />
            <span>Event</span>
          </div>

          <select value={postTag} onChange={(e) => onPostTag(normalizePostTag(e.target.value))} style={tagSelect}>
            {POST_TAGS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {mediaFile ? (
            <button type="button" style={clearMediaBtn} onClick={onClearMedia}>
              Remove
            </button>
          ) : null}
        </div>

        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.985 }}
          style={{
            ...postButton,
            opacity: canPost && !posting ? 1 : 0.56,
            cursor: canPost && !posting ? "pointer" : "not-allowed",
          }}
          onClick={onCreatePost}
          disabled={!canPost || posting}
        >
          {posting ? "Posting..." : "Post"}
        </motion.button>
      </div>
    </motion.div>
  );
}

function FeedPostCard({
  post,
  currentUserId,
  currentUsername,
  liked,
  saved,
  sharesCount,
  commentsList,
  commentDraft,
  isCommentsOpen,
  commentLiked,
  onCommentDraft,
  onToggleComments,
  onAddComment,
  onToggleCommentLike,
  onDelete,
  onLike,
  onSave,
  onShare,
  onOpenMedia,
  menuOpen,
  onToggleMenu,
  onRequestDelete,
}: {
  post: Post;
  currentUserId: number | null;
  currentUsername: string | null;
  liked: boolean;
  saved: boolean;
  sharesCount: number;
  commentsList: Comment[];
  commentDraft: string;
  isCommentsOpen: boolean;
  commentLiked: (commentId: string) => boolean;
  onCommentDraft: (v: string) => void;
  onToggleComments: () => void;
  onAddComment: () => void;
  onToggleCommentLike: (commentId: string) => void;
  onDelete: (postId: string) => void;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onOpenMedia: (m: { type: "image" | "video"; url: string }) => void;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onRequestDelete: () => void;
}) {
  const router = useRouter();
  const canDelete = !!currentUserId && !!post.authorId && currentUserId === post.authorId;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
      style={feedCard}
    >
      <div style={feedHead}>
        <div
          onClick={() => {
            if (currentUsername && post.authorUsername === currentUsername) {
              router.push("/profile");
            } else if (post.authorUsername) {
              router.push(`/profile/${post.authorUsername}`);
            }
          }}
          style={{ display: "flex", gap: 12, cursor: "pointer" }}
        >
          <Avatar
            avatarUrl={post.authorAvatarUrl ?? null}
            initials={initialsFromName(post.authorName)}
            size={48}
          />

          <div>
            <div style={feedAuthorRow}>
              <span style={feedAuthorName}>{post.authorName}</span>
              <CheckCircle size={13} color="#F6B21A" fill="#F6B21A" />
            </div>
            <div style={feedMeta}>
              {post.authorHandle} · {post.time}
            </div>
          </div>
        </div>

        <div style={{ position: "relative" }}>
          <button
  style={menuButton}
  onClick={(e) => {
    e.stopPropagation();
    onToggleMenu();
  }}
>
            <MoreHorizontal size={16} />
          </button>

          {menuOpen ? (
            <div
  onClick={(e) => e.stopPropagation()}
  style={{
    position: "absolute",
    right: 0,
    top: 36,
    background: "#0f1117",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
    zIndex: 10,
    minWidth: 160,
  }}
>
              <button
                style={profileMenuButton}
                onClick={() => {
                  onToggleMenu();
                }}
              >
                ✏️ Edit Post
              </button>

              {canDelete ? (
                <button style={profileMenuButton} onClick={onRequestDelete}>
                  🗑 Delete Post
                </button>
              ) : (
                <div style={menuMuted}>Only the author can delete</div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div style={feedText}>{post.text}</div>

      {post.media?.length ? (
        <div style={{ marginTop: 14 }}>
          {post.media.map((m, i) =>
            m.type === "image" ? (
              <div
                key={i}
                onClick={() => onOpenMedia(m)}
                style={{ ...feedImage, backgroundImage: `url(${m.url})` }}
              />
            ) : (
              <video
                key={i}
                controls
                src={m.url}
                style={feedVideo}
                onClick={() => onOpenMedia(m)}
              />
            )
          )}
        </div>
      ) : null}

      <div style={postActions}>
        <button style={actionBtn} onClick={onLike}>
          <span style={{ color: liked ? "#ff9b9b" : "rgba(197,197,197,0.9)" }}>♥</span>
          <span>{liked ? "Liked" : "Like"}</span>
        </button>

        <button style={actionBtn} onClick={onToggleComments}>
          <MessageCircle size={15} />
          <span>{commentsList.length}</span>
        </button>

        <button style={actionBtn} onClick={onShare}>
          <span>↗</span>
          <span>{sharesCount}</span>
        </button>

        <button style={actionBtn} onClick={onSave}>
          <span>{saved ? "★" : "☆"}</span>
          <span>{saved ? "Saved" : "Save"}</span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isCommentsOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            style={commentsWrap}
          >
            <div style={{ display: "grid", gap: 8 }}>
              {commentsList.length ? (
                commentsList.map((c) => {
                  const likedState = commentLiked(c.id);
                  return (
                    <div key={c.id} style={commentCard}>
                      <div style={commentTop}>
                        <span style={commentAuthor}>{c.author}</span>
                        <button
                          style={commentLikeBtn(likedState)}
                          onClick={() => onToggleCommentLike(c.id)}
                        >
                          {likedState ? "♥" : "♡"} {c.likes}
                        </button>
                      </div>
                      <div style={commentText}>{c.text}</div>
                    </div>
                  );
                })
              ) : (
                <div style={commentEmpty}>No comments yet.</div>
              )}
            </div>

            <div style={{ height: 10 }} />

            <div style={commentInputRow}>
              <textarea
                value={commentDraft}
                onChange={(e) => onCommentDraft(e.target.value)}
                placeholder="Add a comment..."
                style={commentInput}
              />
              <button style={postButtonSmall} onClick={onAddComment}>
                Post
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  );
}

function RightRail({
  name,
  handle,
  avatarUrl,
  onGoNetwork,
}: {
  name: string;
  handle: string;
  avatarUrl: string | null;
  onGoNetwork: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={rightCard}>
        <div style={rightCardHeader}>
          <span style={rightHeaderText}>✨ Suggested for you</span>
        </div>

        <div style={suggestList}>
          <SuggestRow
            name="Jennifer Collins"
            handle="@labradorlegacy"
            avatar="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop"
          />
          <SuggestRow
            name="David Park"
            handle="@premierPoodles"
            avatar="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop"
          />
          <SuggestRow
            name="Lisa Chen"
            handle="@goldenhearthranch"
            avatar="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop"
          />
        </div>

        <div style={rightCardFooterLink}>Show more ↗</div>
      </div>

      <div style={rightCard}>
        <div style={rightCardHeader}>
          <span style={rightHeaderText}>📅 Upcoming Events</span>
        </div>

        <div style={eventsWrap}>
          <EventTile title="Virtual Breeder Meetup" date="Tomorrow" time="2:00 PM" count="42 attending" />
          <EventTile title="Health Testing Workshop" date="Mar 15" time="10:00 AM" count="28 attending" />
          <EventTile title="Breeding Best Practices" date="Mar 22" time="3:00 PM" count="36 attending" />
        </div>

        <div style={rightCardFooterLink}>View all events ↗</div>
      </div>

      <div style={profileRailCard}>
        <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
          <Avatar avatarUrl={avatarUrl} initials={initialsFromName(name)} size={46} />
          <div>
            <div style={profileRailName}>{name}</div>
            <div style={profileRailHandle}>{handle}</div>
          </div>
        </div>

        <div style={profileRailBio}>
          Premium breeder profile connected to your live dashboard logic.
        </div>

        <button style={networkBtn} onClick={onGoNetwork}>
          Open Network
        </button>
      </div>
    </div>
  );
}

function SuggestRow({
  name,
  handle,
  avatar,
}: {
  name: string;
  handle: string;
  avatar: string;
}) {
  return (
    <div style={suggestRow}>
      <img src={avatar} alt={name} style={suggestAvatar} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={suggestName}>
          {name} <span style={{ color: "#F6B21A" }}>●</span>
        </div>
        <div style={suggestHandle}>{handle}</div>
      </div>
      <button style={followBtn}>Follow</button>
    </div>
  );
}

function EventTile({
  title,
  date,
  time,
  count,
}: {
  title: string;
  date: string;
  time: string;
  count: string;
}) {
  return (
    <div style={eventTile}>
      <div style={eventTitle}>{title}</div>
      <div style={eventMetaRow}>
        <div style={eventDate}>{date}</div>
        <div style={eventTime}>{time}</div>
      </div>
      <div style={eventCount}>{count}</div>
    </div>
  );
}

function NetworkGrid({
  items,
}: {
  items: {
    id: string;
    title: string;
    location: string;
    priceLabel: string;
    badge: string;
    image: string;
  }[];
}) {
  return (
    <div style={networkGrid}>
      {items.map((it) => (
        <div key={it.id} style={networkCard}>
          <div style={{ ...networkImage, backgroundImage: `url(${it.image})` }} />
          <div style={networkTitleRow}>
            <div style={networkTitle}>{it.title}</div>
            <div style={networkBadge}>{it.badge}</div>
          </div>
          <div style={networkMeta}>
            {it.location} · <span style={{ color: "#fff" }}>{it.priceLabel}</span>
          </div>
        </div>
      ))}
    </div>
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
                t.type === "success"
                  ? "rgba(74,222,128,0.24)"
                  : t.type === "error"
                  ? "rgba(248,113,113,0.24)"
                  : "rgba(245,158,11,0.24)",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13 }}>{t.title}</div>
            {t.msg ? (
              <div style={{ marginTop: 5, fontSize: 12, color: "rgba(212,212,212,0.72)" }}>
                {t.msg}
              </div>
            ) : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Lightbox({
  type,
  url,
  title,
  onClose,
}: {
  type: "image" | "video";
  url: string;
  title?: string;
  onClose: () => void;
}) {
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
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        style={lightboxCard}
      >
        <div style={lightboxHeader}>
          <div style={lightboxTitle}>{title || "Media"}</div>
          <button style={menuButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          {type === "image" ? (
            <div style={{ ...lightboxImage, backgroundImage: `url(${url})` }} />
          ) : (
            <video controls style={lightboxVideo} src={url} />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function SkeletonFeedCard() {
  return (
    <div style={feedCard}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={skeletonCircle} />
        <div style={{ flex: 1 }}>
          <div style={skeletonLine(150)} />
          <div style={{ height: 8 }} />
          <div style={skeletonLine(98)} />
          <div style={{ height: 16 }} />
          <div style={skeletonLine("94%")} />
          <div style={{ height: 8 }} />
          <div style={skeletonLine("80%")} />
          <div style={{ height: 14 }} />
          <div style={skeletonBox} />
        </div>
      </div>
    </div>
  );
}

function Avatar({
  initials,
  avatarUrl,
  size,
}: {
  initials: string;
  avatarUrl: string | null;
  size: number;
}) {
  return (
    <div style={{ ...avatarShell, width: size, height: size }}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="avatar"
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 999 }}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

const pageBg: React.CSSProperties = {
  minHeight: "100vh",
  background: `
linear-gradient(
180deg,
#03050a 0%,
#04060c 20%,
#05070e 40%,
#05070d 65%,
#04060a 85%,
#03050a 100%
),
linear-gradient(
90deg,
#02040a 0%,
#03050a 25%,
#04060c 50%,
#03050a 75%,
#02040a 100%
)
`,
  color: "#fff",
};

const topbar: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  height: 78,
  zIndex: 100,
  background: "linear-gradient(180deg, rgba(7,11,18,0.99) 0%, rgba(8,12,20,0.97) 100%)",
  borderBottom: "1px solid rgba(123,150,255,0.10)",
  backdropFilter: "blur(22px)",
  boxShadow: "0 10px 24px rgba(0,0,0,0.26), inset 0 -1px 0 rgba(76,111,255,0.08)",
};

const topbarInner: React.CSSProperties = {
  width: 1318,
  height: "100%",
  margin: "0 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const logoWrap: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 13,
  width: 240,
};

const logoButton: React.CSSProperties = {
  ...logoWrap,
  border: "none",
  background: "transparent",
  padding: 0,
  cursor: "pointer",
  textAlign: "left",
};

const logoBox: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 12,
  background: "linear-gradient(180deg, #5d8cff 0%, #3f6ef1 100%)",
  display: "grid",
  placeItems: "center",
  color: "#fff",
  fontSize: 22,
  fontWeight: 800,
  lineHeight: "36px",
  boxShadow:
    "0 0 0 1px rgba(255,176,31,0.12), 0 8px 18px rgba(66,107,255,0.24), 0 0 18px rgba(66,107,255,0.10)",
};

const logoText: React.CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  lineHeight: "20px",
  color: "#ffffff",
  letterSpacing: -0.3,
};

const logoSub: React.CSSProperties = {
  marginTop: 3,
  fontSize: 8.8,
  fontWeight: 700,
  letterSpacing: 1,
  color: "#7ea1ff",
  textTransform: "uppercase",
};

const searchWrap: React.CSSProperties = {
  width: 640,
  height: 54,
  borderRadius: 18,
  border: "1px solid rgba(123,150,255,0.14)",
  background: "linear-gradient(180deg, rgba(13,18,29,0.96) 0%, rgba(10,15,24,0.96) 100%)",
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "0 18px",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03), 0 0 0 1px rgba(76,111,255,0.05), 0 12px 22px rgba(0,0,0,0.18)",
};

const searchInput: React.CSSProperties = {
  width: "100%",
  border: "none",
  outline: "none",
  background: "transparent",
  color: "rgba(227,233,255,0.9)",
  fontSize: 14.5,
  fontWeight: 400,
  letterSpacing: 0,
};

const topActions: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
};

const iconBtn: React.CSSProperties = {
  position: "relative",
  width: 28,
  height: 28,
  borderRadius: 999,
  border: "none",
  background: "transparent",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

const homeTopBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 999,
  border: "1px solid rgba(123,150,255,0.16)",
  background: "linear-gradient(180deg, rgba(14,21,35,0.98) 0%, rgba(10,16,28,0.98) 100%)",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 6px 16px rgba(0,0,0,0.16)",
};

const orangeDot: React.CSSProperties = {
  position: "absolute",
  top: 4,
  right: 3,
  width: 7,
  height: 7,
  borderRadius: 999,
  background: "#4e7dff",
  boxShadow: "0 0 10px rgba(78,125,255,0.6)",
};

const shell: React.CSSProperties = {
  width: 1318,
  margin: "0 auto",
  paddingTop: 88,
  paddingBottom: 42,
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "220px 726px 310px",
  columnGap: 24,
  alignItems: "start",
};

const leftCol: React.CSSProperties = {
  position: "sticky",
  top: 88,
};

const centerCol: React.CSSProperties = {
  width: 726,
};

const rightCol: React.CSSProperties = {
  position: "sticky",
  top: 88,
};

const leftCard: React.CSSProperties = {
  width: 220,
  minHeight: 360,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.042)",
  background: "linear-gradient(180deg, rgba(70,70,70,0.12) 0%, rgba(36,36,36,0.22) 100%)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.028), 0 0 0 1px rgba(255,255,255,0.008)",
  padding: 14,
};

function navRow(active: boolean, hovered = false): React.CSSProperties {
  return {
    width: "100%",
    height: 46,
    borderRadius: 14,
    border: active
      ? "1px solid rgba(255,194,84,0.14)"
      : hovered
      ? "1px solid rgba(255,255,255,0.05)"
      : "1px solid transparent",
    background: active
      ? "linear-gradient(180deg, #F8A000 0%, #FF9300 100%)"
      : hovered
      ? "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.025) 100%)"
      : "transparent",
    display: "flex",
    alignItems: "center",
    gap: 13,
    padding: "0 18px",
    cursor: "pointer",
    position: "relative",
    textAlign: "left",
    transition: "all 160ms ease",
    boxShadow: active
      ? "0 10px 18px rgba(255,145,0,0.18), 0 0 20px rgba(255,153,0,0.09), inset 0 1px 0 rgba(255,255,255,0.12)"
      : hovered
      ? "inset 0 1px 0 rgba(255,255,255,0.04)"
      : "none",
  };
}

function navText(active: boolean): React.CSSProperties {
  return {
    fontSize: 13.8,
    fontWeight: active ? 700 : 500,
    color: active ? "#ffffff" : "rgba(214,214,214,0.86)",
    flex: 1,
    letterSpacing: -0.12,
  };
}

const redBadge: React.CSSProperties = {
  minWidth: 18,
  height: 18,
  borderRadius: 999,
  background: "#FF3A3A",
  color: "#fff",
  fontSize: 10.5,
  fontWeight: 700,
  display: "grid",
  placeItems: "center",
  padding: "0 5px",
  boxShadow: "0 0 14px rgba(255,58,58,0.28)",
};

const greyBadge: React.CSSProperties = {
  color: "rgba(133,133,133,0.92)",
  fontSize: 10.8,
  fontWeight: 500,
};

const composerCard: React.CSSProperties = {
  width: 726,
  borderRadius: 18,
  border: "1px solid rgba(118,146,255,0.10)",
  background: "linear-gradient(180deg, rgba(11,16,26,0.985) 0%, rgba(10,14,22,1) 100%)",
  boxShadow:
    "0 0 0 1px rgba(118,146,255,0.04), 0 16px 34px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.02)",
  padding: "18px 20px",
};

const composerTop: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
};

const composerTextarea: React.CSSProperties = {
  width: "100%",
  minHeight: 64,
  resize: "vertical",
  border: "none",
  outline: "none",
  background: "transparent",
  color: "rgba(236,236,236,0.94)",
  fontSize: 14,
  lineHeight: 1.55,
  paddingTop: 5,
  letterSpacing: -0.04,
};

const composerDivider: React.CSSProperties = {
  height: 1,
  marginTop: 14,
  background: "rgba(255,255,255,0.07)",
};

const composerBottom: React.CSSProperties = {
  marginTop: 15,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
};

const composerTools: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 22,
  flexWrap: "wrap",
  paddingLeft: 53,
};

const toolBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  fontSize: 12.5,
  color: "rgba(220,228,255,0.82)",
  cursor: "pointer",
};

const toolBtnStatic: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  fontSize: 12.5,
  color: "rgba(220,228,255,0.82)",
};

const tagSelect: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  opacity: 0,
  pointerEvents: "none",
  overflow: "hidden",
  border: "none",
  background: "transparent",
  color: "transparent",
  padding: 0,
  outline: "none",
  fontSize: 0,
};

const clearMediaBtn: React.CSSProperties = {
  height: 30,
  borderRadius: 9,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(52,52,52,0.88)",
  color: "#e7e7e7",
  padding: "0 10px",
  cursor: "pointer",
  fontSize: 11.5,
};

const postButton: React.CSSProperties = {
  width: 90,
  height: 36,
  border: "none",
  borderRadius: 12,
  background: "linear-gradient(180deg, #5d8cff 0%, #3f6ef1 100%)",
  color: "#fff",
  fontSize: 12.5,
  fontWeight: 700,
  boxShadow: "0 8px 18px rgba(66,107,255,0.24), inset 0 1px 0 rgba(255,255,255,0.14)",
};

const composerPreviewImage: React.CSSProperties = {
  width: "100%",
  height: 248,
  borderRadius: 14,
  backgroundPosition: "center",
  backgroundSize: "cover",
  backgroundRepeat: "no-repeat",
};

const composerPreviewVideo: React.CSSProperties = {
  width: "100%",
  maxHeight: 300,
  borderRadius: 14,
};

const feedCard: React.CSSProperties = {
  width: 726,
  borderRadius: 18,
  border: "1px solid rgba(118,146,255,0.10)",
  background: "linear-gradient(180deg, rgba(11,16,26,0.99) 0%, rgba(10,13,20,1) 100%)",
  boxShadow:
    "0 0 0 1px rgba(118,146,255,0.03), 0 14px 32px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.02)",
  padding: 18,
};

const feedHead: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
};

const feedAuthorRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
};

const feedAuthorName: React.CSSProperties = {
  fontSize: 13.5,
  fontWeight: 700,
  color: "#ffffff",
  letterSpacing: -0.12,
};

const feedMeta: React.CSSProperties = {
  marginTop: 3,
  fontSize: 11.5,
  color: "rgba(165,178,212,0.82)",
};

const feedText: React.CSSProperties = {
  marginTop: 13,
  fontSize: 12.8,
  lineHeight: 1.62,
  color: "rgba(241,241,241,0.95)",
  whiteSpace: "pre-wrap",
  letterSpacing: -0.03,
};

const feedImage: React.CSSProperties = {
  width: "100%",
  height: 542,
  borderRadius: 15,
  backgroundPosition: "center",
  backgroundSize: "cover",
  backgroundRepeat: "no-repeat",
  cursor: "pointer",
};

const feedVideo: React.CSSProperties = {
  width: "100%",
  borderRadius: 15,
  cursor: "pointer",
};

const menuButton: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.065)",
  background: "rgba(45,45,45,0.72)",
  color: "#d7d7d7",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};

const menuCard: React.CSSProperties = {
  position: "absolute",
  top: 36,
  right: 0,
  minWidth: 160,
  borderRadius: 11,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(26,26,26,0.98)",
  overflow: "hidden",
  zIndex: 10,
};

const deleteBtn: React.CSSProperties = {
  width: "100%",
  height: 54,
  border: "none",
  background: "transparent",
  color: "#f8b4b4",
  cursor: "pointer",
  fontSize: 12.5,
};

const menuMuted: React.CSSProperties = {
  padding: 11,
  color: "rgba(170,170,170,0.85)",
  fontSize: 11.75,
};

const profileMenuButton: React.CSSProperties = {
  display: "block",
  width: "160px",
  padding: "10px 14px",
  background: "transparent",
  border: "none",
  color: "white",
  fontSize: 13,
  textAlign: "left",
  cursor: "pointer",
};

const postActions: React.CSSProperties = {
  marginTop: 14,
  paddingTop: 12,
  borderTop: "1px solid rgba(255,255,255,0.055)",
  display: "flex",
  gap: 15,
  alignItems: "center",
  flexWrap: "wrap",
};

const actionBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "rgba(215,215,215,0.9)",
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  fontSize: 11.9,
  cursor: "pointer",
  padding: 0,
};

const commentsWrap: React.CSSProperties = {
  marginTop: 13,
  paddingTop: 12,
  borderTop: "1px solid rgba(255,255,255,0.055)",
};

const commentCard: React.CSSProperties = {
  borderRadius: 11,
  background: "rgba(62,62,62,0.44)",
  border: "1px solid rgba(255,255,255,0.06)",
  padding: 10,
};

const commentTop: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const commentAuthor: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#fff",
};

function commentLikeBtn(active: boolean): React.CSSProperties {
  return {
    border: "1px solid rgba(255,255,255,0.08)",
    background: active ? "rgba(255,166,0,0.14)" : "rgba(255,255,255,0.02)",
    color: active ? "#ffbe4a" : "rgba(213,213,213,0.85)",
    height: 24,
    padding: "0 8px",
    borderRadius: 999,
    fontSize: 11,
    cursor: "pointer",
  };
}

const commentText: React.CSSProperties = {
  marginTop: 7,
  fontSize: 12,
  lineHeight: 1.55,
  color: "rgba(230,230,230,0.92)",
};

const commentEmpty: React.CSSProperties = {
  fontSize: 12,
  color: "rgba(176,176,176,0.84)",
};

const commentInputRow: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
};

const commentInput: React.CSSProperties = {
  flex: 1,
  minHeight: 64,
  resize: "vertical",
  borderRadius: 11,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(45,45,45,0.76)",
  color: "#fff",
  padding: 11,
  outline: "none",
  fontSize: 12,
};

const postButtonSmall: React.CSSProperties = {
  width: 68,
  height: 34,
  border: "none",
  borderRadius: 10,
  background: "linear-gradient(180deg, #5d8cff 0%, #3f6ef1 100%)",
  color: "#fff",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(66,107,255,0.2)",
};

const rightCard: React.CSSProperties = {
  width: 310,
  borderRadius: 18,
  border: "1px solid rgba(118,146,255,0.10)",
  background: "linear-gradient(180deg, rgba(11,16,26,0.99) 0%, rgba(10,13,20,1) 100%)",
  overflow: "hidden",
  boxShadow:
    "0 0 0 1px rgba(118,146,255,0.03), 0 12px 24px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.02)",
};

const rightCardHeader: React.CSSProperties = {
  height: 54,
  borderBottom: "1px solid rgba(255,255,255,0.065)",
  padding: "0 14px",
  display: "flex",
  alignItems: "center",
};

const rightHeaderText: React.CSSProperties = {
  fontSize: 13.5,
  fontWeight: 700,
  color: "#fff",
  letterSpacing: -0.08,
};

const suggestList: React.CSSProperties = {
  padding: "12px 12px 10px 12px",
  display: "grid",
  gap: 12,
};

const suggestRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const suggestAvatar: React.CSSProperties = {
  width: 38,
  height: 54,
  borderRadius: 999,
  objectFit: "cover",
};

const suggestName: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 700,
  color: "#fff",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const suggestHandle: React.CSSProperties = {
  marginTop: 2,
  fontSize: 11.25,
  color: "rgba(160,173,206,0.82)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const followBtn: React.CSSProperties = {
  minWidth: 66,
  height: 28,
  padding: "0 12px",
  borderRadius: 10,
  border: "none",
  background: "linear-gradient(180deg, #5d8cff 0%, #3f6ef1 100%)",
  color: "#fff",
  fontSize: 11.5,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 8px 16px rgba(66,107,255,0.18), inset 0 1px 0 rgba(255,255,255,0.12)",
};

const rightCardFooterLink: React.CSSProperties = {
  height: 46,
  borderTop: "1px solid rgba(255,255,255,0.07)",
  padding: "0 14px",
  display: "flex",
  alignItems: "center",
  fontSize: 14.55,
  fontWeight: 700,
  color: "#F0B11D",
};

const eventsWrap: React.CSSProperties = {
  padding: 10,
  display: "grid",
  gap: 10,
};

const eventTile: React.CSSProperties = {
  borderRadius: 14,
  background: "linear-gradient(180deg, rgba(31,41,63,0.78) 0%, rgba(20,28,44,0.84) 100%)",
  padding: 14,
  border: "1px solid rgba(118,146,255,0.10)",
};

const eventTitle: React.CSSProperties = {
  fontSize: 12.4,
  fontWeight: 700,
  color: "#fff",
};

const eventMetaRow: React.CSSProperties = {
  marginTop: 12,
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  fontSize: 11.5,
  color: "rgba(220,220,220,0.88)",
};

const eventDate: React.CSSProperties = {
  color: "rgba(220,220,220,0.88)",
};

const eventTime: React.CSSProperties = {
  color: "rgba(220,220,220,0.88)",
};

const eventCount: React.CSSProperties = {
  marginTop: 7,
  fontSize: 10.8,
  color: "rgba(157,157,157,1)",
};

const profileRailCard: React.CSSProperties = {
  width: 310,
  borderRadius: 18,
  border: "1px solid rgba(118,146,255,0.10)",
  background: "linear-gradient(180deg, rgba(11,16,26,0.99) 0%, rgba(10,13,20,1) 100%)",
  padding: 14,
  boxShadow:
    "0 0 0 1px rgba(118,146,255,0.03), 0 12px 24px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.02)",
};

const profileRailName: React.CSSProperties = {
  fontSize: 13.25,
  fontWeight: 700,
  color: "#fff",
};

const profileRailHandle: React.CSSProperties = {
  marginTop: 3,
  fontSize: 11.25,
  color: "rgba(166,166,166,0.9)",
};

const profileRailBio: React.CSSProperties = {
  marginTop: 12,
  fontSize: 11.9,
  lineHeight: 1.55,
  color: "rgba(212,212,212,0.74)",
};

const networkBtn: React.CSSProperties = {
  marginTop: 12,
  width: "100%",
  height: 34,
  borderRadius: 11,
  border: "none",
  background: "linear-gradient(180deg, #5d8cff 0%, #3f6ef1 100%)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 12.5,
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(66,107,255,0.18), inset 0 1px 0 rgba(255,255,255,0.12)",
};

const networkGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 22,
};

const networkCard: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.06)",
  background: "linear-gradient(180deg, rgba(37,37,37,0.985) 0%, rgba(31,31,31,1) 100%)",
  padding: 12,
};

const networkImage: React.CSSProperties = {
  width: "100%",
  height: 208,
  borderRadius: 15,
  backgroundPosition: "center",
  backgroundSize: "cover",
  backgroundRepeat: "no-repeat",
};

const networkTitleRow: React.CSSProperties = {
  marginTop: 12,
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  alignItems: "flex-start",
};

const networkTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "#fff",
};

const networkBadge: React.CSSProperties = {
  height: 24,
  padding: "0 9px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  color: "rgba(235,235,235,0.88)",
  fontSize: 10.5,
  display: "inline-flex",
  alignItems: "center",
};

const networkMeta: React.CSSProperties = {
  marginTop: 7,
  fontSize: 11.9,
  color: "rgba(183,183,183,0.88)",
};

const avatarShell: React.CSSProperties = {
  borderRadius: 999,
  background: "linear-gradient(180deg, #6d6d6d 0%, #4e4e4e 100%)",
  border: "2px solid rgba(255,255,255,0.1)",
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
  color: "#fff",
  fontWeight: 700,
  fontSize: 14,
  boxShadow: "0 0 0 1px rgba(255,255,255,0.02)",
};

const toastWrap: React.CSSProperties = {
  position: "fixed",
  right: 18,
  top: 90,
  zIndex: 200,
  display: "grid",
  gap: 10,
  width: 280,
  pointerEvents: "none",
};

const toastCard: React.CSSProperties = {
  pointerEvents: "none",
  borderRadius: 14,
  border: "1px solid rgba(82,82,82,1)",
  background: "rgba(23,23,23,0.94)",
  padding: 12,
  boxShadow: "0 18px 42px rgba(0,0,0,0.5)",
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
  border: "1px solid rgba(82,82,82,1)",
  background: "rgba(23,23,23,0.96)",
  boxShadow: "0 26px 90px rgba(0,0,0,0.72)",
  padding: 14,
};

const lightboxHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
};

const lightboxTitle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 14,
  color: "#fff",
};

const lightboxImage: React.CSSProperties = {
  width: "100%",
  height: 460,
  borderRadius: 16,
  backgroundPosition: "center",
  backgroundSize: "cover",
  backgroundRepeat: "no-repeat",
};

const lightboxVideo: React.CSSProperties = {
  width: "100%",
  maxHeight: 560,
  borderRadius: 16,
};

const floatingTop: React.CSSProperties = {
  position: "fixed",
  right: 22,
  bottom: 22,
  width: 42,
  height: 46,
  borderRadius: 14,
  border: "1px solid rgba(82,82,82,1)",
  background: "rgba(23,23,23,0.9)",
  color: "#fff",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  zIndex: 60,
};

const emptyCard: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.07)",
  background: "rgba(37,37,37,0.98)",
  padding: 18,
  marginBottom: 14,
};

const emptyTitle: React.CSSProperties = {
  fontSize: 13.5,
  fontWeight: 700,
  color: "#fff",
};

const emptyText: React.CSSProperties = {
  marginTop: 5,
  fontSize: 14.55,
  color: "rgba(180,180,180,0.88)",
};

const loadMoreText: React.CSSProperties = {
  marginTop: 12,
  textAlign: "center",
  fontSize: 11.5,
  color: "rgba(150,150,150,0.86)",
};

const skeletonCircle: React.CSSProperties = {
  width: 42,
  height: 46,
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
};

function skeletonLine(width: number | string): React.CSSProperties {
  return {
    width,
    height: 9,
    borderRadius: 999,
    background: "rgba(255,255,255,0.07)",
  };
}

const skeletonBox: React.CSSProperties = {
  width: "100%",
  height: 260,
  borderRadius: 15,
  background: "rgba(255,255,255,0.05)",
};
