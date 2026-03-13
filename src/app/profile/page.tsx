"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { clearSession, getSession, getToken, getUser } from "@/lib/auth";
import { API_BASE } from "@/lib/api";

const ACCENT = "#4681f4";
const MY_POSTS_ENDPOINT = `${API_BASE}/posts/me`;

/* ------------------------------- Types ------------------------------- */

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
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
};

type Tab = "posts" | "dogs";

type ThemeConfig = {
  accentColor: string;
  bgColor: string;
  cardBg: string;
  textColor: string;
  font: string;
  customCSS: string;
  profileSong: string;
  backgroundImage: string;
  cardOpacity: number;
};

type UploadedDoc = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: number;
};

type DogCardData = {
  id: number;
  name: string;
  age: string;
  sex: string;
  color: string;
  image: string;
  price: number;
  status: string;
  description: string;
  healthTests: { name: string; result: string; verified: boolean }[];
  parents: { sire: string; dam: string };
};

/* ------------------------------ Storage ------------------------------ */

const LS_SOCIALS = "breedlink_socials";
const LS_MY_POSTS = "breedlink_my_posts";
const LS_THEME = "breedlink_profile_theme";
const LS_HEALTH_DOCS = "breedlink_health_docs";

function safeJson<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return safeJson(localStorage.getItem(key), fallback);
}

/* ------------------------------ Helpers ------------------------------ */

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

function resolveMediaUrl(url?: string) {
  const v = (url || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  const base = String(API_BASE || "").replace(/\/$/, "");
  return `${base}${v.startsWith("/") ? "" : "/"}${v}`;
}

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)$/i.test(url);
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

  const cleaned = (data.posts || []).map((p) => ({
    ...p,
    text: sanitizeText(p.text),
    views: Number.isFinite(Number(p.views)) ? Number(p.views) : 0,
    likes: Number.isFinite(Number(p.likes)) ? Number(p.likes) : 0,
    comments: Number.isFinite(Number(p.comments)) ? Number(p.comments) : 0,
    shares: Number.isFinite(Number(p.shares)) ? Number(p.shares) : 0,
  }));

  return { posts: cleaned, nextCursor: data.nextCursor ?? null };
}

/* ------------------------------ Theme ------------------------------- */

const defaultTheme: ThemeConfig = {
  accentColor: ACCENT,
  bgColor: "#0a0e16",
  cardBg: "rgba(20,24,35,0.6)",
  textColor: "#ffffff",
  font: "system-ui",
  customCSS: "",
  profileSong: "",
  backgroundImage: "",
  cardOpacity: 0.6,
};

const themes: Record<string, ThemeConfig> = {
  default: defaultTheme,
  purple: { ...defaultTheme, accentColor: "#a855f7", bgColor: "#0f0a1a" },
  green: { ...defaultTheme, accentColor: "#10b981", bgColor: "#0a1410" },
  red: { ...defaultTheme, accentColor: "#ef4444", bgColor: "#1a0a0a" },
  cyan: { ...defaultTheme, accentColor: "#06b6d4", bgColor: "#0a1418" },
  orange: { ...defaultTheme, accentColor: "#f97316", bgColor: "#1a1008" },
};

/* ------------------------ Figma-only additions ----------------------- */

const mockAchievements = [
  { id: 1, icon: "🏆", title: "100 Posts", desc: "Community contributor", unlocked: true },
  { id: 2, icon: "⭐", title: "Top Rated", desc: "5.0 average rating", unlocked: true },
  { id: 3, icon: "🎯", title: "Quick Responder", desc: "< 2hr response time", unlocked: true },
  { id: 4, icon: "💎", title: "Premium Member", desc: "Elite tier breeder", unlocked: true },
  { id: 5, icon: "🔥", title: "15 Year Veteran", desc: "Breeding since 2009", unlocked: true },
  { id: 6, icon: "✅", title: "100% Verified", desc: "All docs approved", unlocked: true },
];

const mockGallery = [
  "https://images.unsplash.com/photo-1568572933382-74d440642117?w=400",
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400",
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400",
  "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400",
  "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=400",
  "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400",
];

const mockReviews = [
  {
    id: 1,
    name: "Sarah M.",
    rating: 5,
    text: "Absolutely wonderful experience. Healthy puppy, strong communication, and complete documentation.",
    date: "2 weeks ago",
    avatar: "https://i.pravatar.cc/150?img=1",
  },
  {
    id: 2,
    name: "Michael R.",
    rating: 5,
    text: "Professional, transparent, and clearly serious about breeding standards.",
    date: "1 month ago",
    avatar: "https://i.pravatar.cc/150?img=2",
  },
  {
    id: 3,
    name: "Jennifer K.",
    rating: 5,
    text: "Best breeder we have worked with. Smooth process and excellent follow-up.",
    date: "2 months ago",
    avatar: "https://i.pravatar.cc/150?img=3",
  },
];

const mockActivity = [
  { id: 1, type: "post", text: "Posted a new litter update", time: "3 hours ago" },
  { id: 2, type: "doc", text: "Uploaded new health clearances", time: "2 days ago" },
  { id: 3, type: "review", text: "Received a 5-star review", time: "5 days ago" },
  { id: 4, type: "message", text: "Responded to 12 inquiries", time: "1 week ago" },
];

const mockDogs: DogCardData[] = [
  {
    id: 1,
    name: "Zeus",
    age: "10 weeks",
    sex: "Male",
    color: "Black & Tan",
    image: "https://images.unsplash.com/photo-1568572933382-74d440642117?w=800",
    price: 3500,
    status: "Available",
    description:
      "Exceptional male from champion bloodlines. Outstanding temperament, great structure, and excellent prey drive.",
    healthTests: [
      { name: "OFA Hips", result: "Excellent", verified: true },
      { name: "OFA Elbows", result: "Normal", verified: true },
      { name: "Cardiac", result: "Clear", verified: true },
      { name: "Embark DNA", result: "Clear", verified: true },
      { name: "DM", result: "Clear", verified: true },
      { name: "Eyes", result: "Clear", verified: true },
    ],
    parents: { sire: "V Zeus vom Haus Martin", dam: "SG Luna vom Kraftwerk" },
  },
  {
    id: 2,
    name: "Athena",
    age: "10 weeks",
    sex: "Female",
    color: "Sable",
    image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800",
    price: 3200,
    status: "Reserved",
    description:
      "Beautiful sable female with excellent focus, stable temperament, and strong working potential.",
    healthTests: [
      { name: "OFA Hips", result: "Good", verified: true },
      { name: "OFA Elbows", result: "Normal", verified: true },
      { name: "Cardiac", result: "Clear", verified: true },
      { name: "Embark DNA", result: "Clear", verified: true },
      { name: "DM", result: "Clear", verified: true },
      { name: "Eyes", result: "Clear", verified: true },
    ],
    parents: { sire: "V Zeus vom Haus Martin", dam: "SG Luna vom Kraftwerk" },
  },
  {
    id: 3,
    name: "Apollo",
    age: "10 weeks",
    sex: "Male",
    color: "Black & Red",
    image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800",
    price: 3500,
    status: "Available",
    description:
      "Stunning male with rich pigmentation, excellent bone structure, and ideal drive for sport or active homes.",
    healthTests: [
      { name: "OFA Hips", result: "Good", verified: true },
      { name: "OFA Elbows", result: "Normal", verified: true },
      { name: "Cardiac", result: "Clear", verified: true },
      { name: "Embark DNA", result: "Clear", verified: true },
      { name: "DM", result: "Clear", verified: true },
      { name: "Eyes", result: "Clear", verified: true },
    ],
    parents: { sire: "V Zeus vom Haus Martin", dam: "SG Luna vom Kraftwerk" },
  },
];

/* ------------------------------- Page ------------------------------- */

export default function ProfileHubPage() {
  const router = useRouter();

  const [authLoading, setAuthLoading] = useState(true);
  const [me, setMe] = useState<MeUser | null>(null);

  const [tab, setTab] = useState<Tab>("posts");
  const [socials, setSocials] = useState<Socials>(() => readLS(LS_SOCIALS, {}));
  const [posts, setPosts] = useState<MyPost[]>(() => readLS(LS_MY_POSTS, []));
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialPostsLoaded, setInitialPostsLoaded] = useState(false);

  const [editing, setEditing] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [shareMenu, setShareMenu] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [openPostMenuId, setOpenPostMenuId] = useState<string | null>(null);
  const [notifications] = useState(7);

  const [formDisplayName, setFormDisplayName] = useState("");
  const [formBio, setFormBio] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formAvatarUrl, setFormAvatarUrl] = useState("");
  const [formInstagram, setFormInstagram] = useState("");
  const [formTiktok, setFormTiktok] = useState("");
  const [formYoutube, setFormYoutube] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formX, setFormX] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [theme, setTheme] = useState<ThemeConfig>(() => readLS(LS_THEME, defaultTheme));
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>(() => readLS(LS_HEALTH_DOCS, []));

  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const healthDocsInputRef = useRef<HTMLInputElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMe(getUser<MeUser>());
  }, []);

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

  useEffect(() => {
    try {
      localStorage.setItem(LS_THEME, JSON.stringify(theme));
    } catch {}
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_HEALTH_DOCS, JSON.stringify(uploadedDocs));
    } catch {}
  }, [uploadedDocs]);

  useEffect(() => {
    if (!me) return;
    setFormDisplayName(me.display_name ?? "");
    setFormBio(me.bio ?? "");
    setFormLocation(me.location ?? "");
    setFormAvatarUrl(me.avatar_url ?? "");
  }, [me]);

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
      views += p.views ?? 0;
      likes += p.likes ?? 0;
      comments += p.comments ?? 0;
      shares += p.shares ?? 0;
    }

    const engagement = views > 0 ? Math.round(((likes + comments + shares) / views) * 1000) / 10 : 0;
    const avgViews = totalPosts ? Math.round(views / totalPosts) : 0;

    return { totalPosts, views, likes, comments, shares, engagement, avgViews };
  }, [posts]);

  const topPost = useMemo(() => {
    if (!posts.length) return null;
    return [...posts].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0];
  }, [posts]);

  const investorSignals = useMemo(() => {
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

  const memberSince = useMemo(() => {
    const source = me?.created_at;
    if (!source) return "—";
    const d = new Date(source);
    return Number.isNaN(d.getTime()) ? "—" : String(d.getFullYear());
  }, [me?.created_at]);

  const responseRate = useMemo(() => {
    if (!stats.totalPosts) return 92;
    return Math.min(99, Math.max(82, 86 + Math.round(stats.engagement / 2)));
  }, [stats.totalPosts, stats.engagement]);

  const responseTime = useMemo(() => {
    if (stats.totalPosts >= 8) return "< 1 hour";
    if (stats.totalPosts >= 3) return "< 4 hours";
    return "< 24 hours";
  }, [stats.totalPosts]);

  function updateTheme(updates: Partial<ThemeConfig>) {
    setTheme((prev) => ({ ...prev, ...updates }));
  }

  function logout() {
    clearSession();
    localStorage.removeItem("breedlink_token");
    localStorage.removeItem("breedlink_user");
    router.replace("/");
  }

  function handleAvatarFileChange(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;
      setFormAvatarUrl(result);
    };
    reader.readAsDataURL(file);
  }

  function handleHealthDocsChange(files: FileList | null) {
    if (!files || !files.length) return;

    const incoming = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      size: file.size,
      type: file.type || "file",
      uploadedAt: Date.now(),
    }));

    setUploadedDocs((prev) => [...incoming, ...prev]);
  }

  function removeHealthDoc(id: string) {
    setUploadedDocs((prev) => prev.filter((doc) => doc.id !== id));
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
      localStorage.setItem(LS_SOCIALS, JSON.stringify(nextSocials));
    } catch {
      const updated: MeUser = { ...me, ...payload };
      setMe(updated);
      localStorage.setItem("breedlink_user", JSON.stringify(updated));
      setSocials(nextSocials);
      localStorage.setItem(LS_SOCIALS, JSON.stringify(nextSocials));
    } finally {
      setSavingProfile(false);
      setEditing(false);
    }
  }

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
        localStorage.setItem(LS_MY_POSTS, JSON.stringify(first.posts));
      } catch {
        setInitialPostsLoaded(true);
        setHasMore(false);
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
  }, [initialPostsLoaded, cursor, hasMore, loadingMore]);

  const bgOverlayStyle = theme.backgroundImage
    ? {
        backgroundImage: `url(${theme.backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed" as const,
      }
    : {};

  if (authLoading) {
    return (
      <main style={{ ...pageWrap(theme), ...bgOverlayStyle }}>
        <div style={{ maxWidth: 1300, margin: "0 auto", color: "white" }}>
          <div style={{ fontWeight: 950, opacity: 0.75 }}>Loading profile…</div>
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div style={{ ...cardStyle(theme), height: 110, opacity: 0.55 }} />
            <div style={{ ...cardStyle(theme), height: 260, opacity: 0.45 }} />
            <div style={{ ...cardStyle(theme), height: 220, opacity: 0.35 }} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <div style={{ ...pageWrap(theme), ...bgOverlayStyle }}>
      {theme.customCSS ? <style>{theme.customCSS}</style> : null}
      {theme.profileSong ? (
        <audio autoPlay loop>
          <source src={theme.profileSong} />
        </audio>
      ) : null}

      {theme.backgroundImage ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: theme.bgColor,
            opacity: 0.92,
            zIndex: 0,
          }}
        />
      ) : null}

      <header style={topHeader(theme)}>
        <div style={topHeaderInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              onClick={() => router.push("/dashboard")}
              style={logoBadge(theme)}
              role="button"
              aria-label="Go to dashboard"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div
              onClick={() => router.push("/dashboard")}
              style={brandWordmark(theme)}
              role="button"
              aria-label="Go to dashboard"
            >
              Lincani
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => router.push("/dashboard")} style={iconButton(theme)} title="Dashboard">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </button>

            <button style={{ ...iconButton(theme), position: "relative" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {notifications > 0 ? <span style={notifBadge}>{notifications}</span> : null}
            </button>

            <div style={{ position: "relative" }}>
              <button onClick={() => setShareMenu((v) => !v)} style={iconButton(theme)} title="Share">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </button>

              <AnimatePresence>
                {shareMenu ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    style={shareMenuStyle(theme)}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, marginBottom: 10, textTransform: "uppercase" }}>
                      Share Profile
                    </div>
                    <button
                      style={shareMenuButton}
                      onClick={() => {
                        try {
                          navigator.clipboard.writeText(window.location.href);
                        } catch {}
                        setShareMenu(false);
                      }}
                    >
                      📋 Copy Link
                    </button>
                    <button style={shareMenuButton} onClick={() => setShareMenu(false)}>
                      📧 Email
                    </button>
                    <button style={shareMenuButton} onClick={() => setShareMenu(false)}>
                      📥 Download PDF
                    </button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <button onClick={() => setCustomizing((v) => !v)} style={ghostAccentButton(theme)}>
              {customizing ? "Close" : "Customize"}
            </button>

            <button onClick={() => setEditing((v) => !v)} style={primaryButton(theme)} disabled={savingProfile}>
              {editing ? "Close editor" : "Edit Profile"}
            </button>

            <button onClick={logout} style={ghostButton}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {customizing ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCustomizing(false)}
              style={customBackdrop}
            />
            <motion.aside
              initial={{ x: 360 }}
              animate={{ x: 0 }}
              exit={{ x: 360 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              style={customPanel(theme)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>Customize Profile</h2>
                  <p style={{ fontSize: 13, opacity: 0.6 }}>Figma-style controls, wired to your live page.</p>
                </div>
                <button onClick={() => setCustomizing(false)} style={closeButton}>
                  ×
                </button>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h3 style={panelHeading}>Quick Themes</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {Object.entries(themes).map(([name, t]) => (
                    <button
                      key={name}
                      onClick={() => setTheme(t)}
                      style={{
                        ...themeSwatchButton,
                        background: t.accentColor,
                        border: theme.accentColor === t.accentColor ? "2px solid white" : "none",
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h3 style={panelHeading}>Colors</h3>
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <label style={panelLabel}>Accent Color</label>
                    <input type="color" value={theme.accentColor} onChange={(e) => updateTheme({ accentColor: e.target.value })} style={colorInput} />
                  </div>
                  <div>
                    <label style={panelLabel}>Background Color</label>
                    <input type="color" value={theme.bgColor} onChange={(e) => updateTheme({ bgColor: e.target.value })} style={colorInput} />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h3 style={panelHeading}>Background Image</h3>
                <input
                  type="text"
                  value={theme.backgroundImage}
                  onChange={(e) => updateTheme({ backgroundImage: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  style={panelInput}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <h3 style={panelHeading}>Card Transparency</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={theme.cardOpacity}
                    onChange={(e) => {
                      const opacity = parseFloat(e.target.value);
                      updateTheme({ cardOpacity: opacity, cardBg: `rgba(20,24,35,${opacity})` });
                    }}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 700, width: 40, textAlign: "right" }}>{Math.round(theme.cardOpacity * 100)}%</span>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h3 style={panelHeading}>Font Family</h3>
                <select value={theme.font} onChange={(e) => updateTheme({ font: e.target.value })} style={panelInput}>
                  <option value="system-ui">System</option>
                  <option value="'Trebuchet MS'">Trebuchet MS</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Georgia">Georgia</option>
                  <option value="'Arial Black'">Arial Black</option>
                </select>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h3 style={panelHeading}>Profile Song</h3>
                <input
                  type="text"
                  value={theme.profileSong}
                  onChange={(e) => updateTheme({ profileSong: e.target.value })}
                  placeholder="https://example.com/song.mp3"
                  style={panelInput}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <h3 style={panelHeading}>Custom CSS</h3>
                <textarea value={theme.customCSS} onChange={(e) => updateTheme({ customCSS: e.target.value })} placeholder="/* Add custom CSS here */" style={panelTextarea} />
              </div>

              <button onClick={() => setTheme(defaultTheme)} style={resetButton}>
                Reset to Default Theme
              </button>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <main style={{ maxWidth: 1300, margin: "0 auto", padding: "102px 32px 60px", position: "relative", zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={heroCard(theme)}>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
            <AvatarLarge initials={initials} avatarUrl={me?.avatar_url ?? null} theme={theme} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6, letterSpacing: "-0.3px" }}>{displayName}</h1>
              <div style={{ fontSize: 14, opacity: 0.6, marginBottom: 12 }}>{handle}</div>

              <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                <HeroBadge label="Email Verified" active={emailVerified} tone={theme.accentColor} />
                <HeroBadge label="Phone Verified" active={phoneVerified} tone={theme.accentColor} icon="phone" />
                <HeroBadge label="Account Verified" active={verifiedAccount} tone="#10b981" />
                <HeroBadge label="Profile Complete" active={profileCompletion.pct === 100} tone="#f59e0b" />
              </div>

              <div style={{ fontSize: 13, opacity: 0.65, marginBottom: 12 }}>
                {me?.email} • 📍 {loc} • Member since {memberSince}
              </div>

              <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.92, marginBottom: 16 }}>{bio}</p>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <MiniPill label="Response Time" value={responseTime} theme={theme} />
                <MiniPill label="Response Rate" value={`${responseRate}%`} theme={theme} />
              </div>
            </div>
          </div>

          <AnimatePresence>
            {editing ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div style={{ display: "grid", gap: 20 }}>
                  <EditorCard title="Basic Information" theme={theme}>
                    <div style={{ display: "grid", gap: 14 }}>
                      <LabeledInput label="Display Name" value={formDisplayName} onChange={setFormDisplayName} placeholder="Ruthless Kennels" />
                      <LabeledTextarea label="Bio" value={formBio} onChange={setFormBio} placeholder="About your breeding program..." />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <LabeledInput label="Location" value={formLocation} onChange={setFormLocation} placeholder="Seattle, WA" />
                        <div>
                          <label style={panelLabel}>Avatar URL</label>
                          <input value={formAvatarUrl} onChange={(e) => setFormAvatarUrl(e.target.value)} placeholder="https://..." style={panelInput} />
                        </div>
                      </div>

                      <div style={{ display: "grid", gap: 12 }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                          <button type="button" onClick={() => avatarFileInputRef.current?.click()} style={secondaryEditorButton}>
                            Upload avatar from PC
                          </button>
                          <span style={{ fontSize: 12, opacity: 0.6 }}>PNG, JPG, WEBP supported</span>
                        </div>
                        <input
                          ref={avatarFileInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => handleAvatarFileChange(e.target.files?.[0] ?? null)}
                        />
                        {formAvatarUrl ? (
                          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <div style={{ width: 72, height: 72, borderRadius: 16, overflow: "hidden", border: `1px solid ${theme.accentColor}40`, background: "rgba(255,255,255,0.04)" }}>
                              <img src={formAvatarUrl} alt="Avatar preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.5 }}>
                              Uploading from your PC now works here.
                              <br />
                              Hit <b>Save All Changes</b> to keep it on the profile.
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </EditorCard>

                  <EditorCard title="Social Links" theme={theme}>
                    <div style={{ display: "grid", gap: 12 }}>
                      <LabeledInput label="Instagram" value={formInstagram} onChange={setFormInstagram} placeholder="instagram.com/username" />
                      <LabeledInput label="TikTok" value={formTiktok} onChange={setFormTiktok} placeholder="tiktok.com/@username" />
                      <LabeledInput label="YouTube" value={formYoutube} onChange={setFormYoutube} placeholder="youtube.com/@channel" />
                      <LabeledInput label="Website" value={formWebsite} onChange={setFormWebsite} placeholder="yourwebsite.com" />
                      <LabeledInput label="Twitter / X" value={formX} onChange={setFormX} placeholder="x.com/handle" />
                    </div>
                  </EditorCard>

                  <EditorCard title="Health Documents & Certifications" theme={theme}>
                    <p style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.5, marginBottom: 16 }}>
                      You can now pick files from your PC here. Right now this stores the uploaded document list in the browser UI so you can work with the design without breaking your backend.
                    </p>

                    <button type="button" onClick={() => healthDocsInputRef.current?.click()} style={{ ...uploadBox(theme), width: "100%", cursor: "pointer" }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={theme.accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", opacity: 0.6 }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Click to upload from your PC</div>
                      <div style={{ fontSize: 12, opacity: 0.5 }}>PDF, JPG, PNG, DOC up to your browser/device limits</div>
                    </button>

                    <input
                      ref={healthDocsInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                      style={{ display: "none" }}
                      onChange={(e) => handleHealthDocsChange(e.target.files)}
                    />

                    {uploadedDocs.length ? (
                      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                        {uploadedDocs.map((doc) => (
                          <div key={doc.id} style={{ padding: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                              <div style={{ fontSize: 11, opacity: 0.5 }}>
                                {(doc.size / 1024 / 1024).toFixed(2)} MB • {doc.type || "file"} • {timeAgo(doc.uploadedAt)}
                              </div>
                            </div>
                            <button type="button" onClick={() => removeHealthDoc(doc.id)} style={{ padding: "6px 12px", background: "rgba(255,100,100,0.1)", border: "1px solid rgba(255,100,100,0.3)", borderRadius: 8, color: "#ff6b6b", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </EditorCard>

                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8 }}>
                    <button onClick={() => setEditing(false)} style={ghostButton} disabled={savingProfile}>
                      Cancel
                    </button>
                    <button onClick={saveProfileInline} style={primaryButton(theme)} disabled={savingProfile}>
                      {savingProfile ? "Saving…" : "Save All Changes"}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 280px", gap: 24, alignItems: "start", maxWidth: 1400, margin: "0 auto", width: "100%" }}>
          <aside style={{ position: "sticky", top: 100, display: "grid", gap: 20 }}>
            <FancyCard title="Socials" theme={theme}>
              <div style={{ display: "grid", gap: 10 }}>
                <SidebarSocialFancy label="Instagram" url={socials.instagram} icon="📷" theme={theme} />
                <SidebarSocialFancy label="TikTok" url={socials.tiktok} icon="🎵" theme={theme} />
                <SidebarSocialFancy label="YouTube" url={socials.youtube} icon="🎥" theme={theme} />
                <SidebarSocialFancy label="Website" url={socials.website} icon="🌐" theme={theme} />
                <SidebarSocialFancy label="X" url={socials.x} icon="🐦" theme={theme} />
                {!socials.instagram && !socials.tiktok && !socials.youtube && !socials.website && !socials.x ? (
                  <div style={{ opacity: 0.7, fontSize: 13, lineHeight: 1.6 }}>No socials yet. Add them in Edit Profile.</div>
                ) : null}
              </div>
            </FancyCard>

            {profileCompletion.pct < 100 ? (
              <FancyCard title="Profile" badge={`${profileCompletion.done}/${profileCompletion.total}`} theme={theme}>
                <div style={{ marginBottom: 12, height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${profileCompletion.pct}%`, background: theme.accentColor, borderRadius: 999 }} />
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {profileCompletion.checks.map((c) => (
                    <Check key={c.key} label={c.label} checked={c.ok} theme={theme} />
                  ))}
                </div>
              </FancyCard>
            ) : null}

            <FancyCard title="Quick Stats" theme={theme}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Stat label="Posts" value={stats.totalPosts} theme={theme} />
                <Stat label="Views" value={stats.views.toLocaleString()} theme={theme} />
                <Stat label="Engagement" value={`${stats.engagement}%`} theme={theme} />
                <Stat label="Avg Views" value={stats.avgViews.toLocaleString()} theme={theme} />
              </div>
            </FancyCard>

            <FancyCard title="Top Post" theme={theme}>
              {topPost ? (
                <div style={{ padding: 12, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6 }}>{topPost.tag} • {timeAgo(topPost.createdAt)}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>{sanitizeText(topPost.text).slice(0, 90)}...</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: theme.accentColor }}>
                    {(topPost.views ?? 0).toLocaleString()} <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 600 }}>views</span>
                  </div>
                </div>
              ) : (
                <div style={{ opacity: 0.75, fontSize: 13 }}>No posts yet.</div>
              )}
            </FancyCard>

            <FancyCard title="Achievements" badge={`${mockAchievements.filter((a) => a.unlocked).length}/${mockAchievements.length}`} theme={theme}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {mockAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    style={{
                      padding: 12,
                      background: achievement.unlocked ? `${theme.accentColor}08` : "rgba(255,255,255,0.02)",
                      border: `1px solid ${achievement.unlocked ? `${theme.accentColor}30` : "rgba(255,255,255,0.05)"}`,
                      borderRadius: 10,
                      textAlign: "center",
                      opacity: achievement.unlocked ? 1 : 0.4,
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{achievement.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 900, marginBottom: 2 }}>{achievement.title}</div>
                    <div style={{ fontSize: 9, opacity: 0.6 }}>{achievement.desc}</div>
                  </div>
                ))}
              </div>
            </FancyCard>

            <FancyCard title="Recent Activity" theme={theme}>
              <div style={{ display: "grid", gap: 10 }}>
                {mockActivity.map((activity) => (
                  <div key={activity.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${theme.accentColor}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {activity.type === "post" ? "📝" : activity.type === "doc" ? "📄" : activity.type === "review" ? "⭐" : "💬"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{activity.text}</div>
                      <div style={{ fontSize: 10, opacity: 0.5 }}>{activity.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </FancyCard>
          </aside>

          <section>
            <div style={{ marginBottom: 16 }}>
              <div style={tabWrapFancy}>
                <button onClick={() => setTab("posts")} style={topTabBtn(tab === "posts", theme)}>
                  Posts
                </button>
                <button onClick={() => setTab("dogs")} style={topTabBtn(tab === "dogs", theme)}>
                  My Dogs
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              {tab === "dogs"
                ? mockDogs.map((dog, i) => (
                    <motion.div key={dog.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                      <FancyCard theme={theme}>
                        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20 }}>
                          <div style={{ borderRadius: 12, overflow: "hidden", aspectRatio: "4/5" }}>
                            <img src={dog.image} alt={dog.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          </div>
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                              <div>
                                <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 6 }}>{dog.name}</h3>
                                <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
                                  {dog.age} • {dog.sex} • {dog.color}
                                </div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ ...statusPill(theme), color: dog.status === "Available" ? theme.accentColor : "#ffa500" }}>{dog.status}</div>
                                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 8 }}>${dog.price.toLocaleString()}</div>
                              </div>
                            </div>

                            <p style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.85, marginBottom: 16 }}>{dog.description}</p>

                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 10, opacity: 0.9 }}>🏥 Health Testing</div>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                                {dog.healthTests.map((test, idx) => (
                                  <div key={idx} style={{ padding: "8px 10px", background: `${theme.accentColor}08`, border: `1px solid ${theme.accentColor}25`, borderRadius: 8 }}>
                                    <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 3 }}>{test.name}</div>
                                    <div style={{ fontSize: 12, fontWeight: 800, color: theme.accentColor }}>
                                      {test.verified ? "✓ " : ""}
                                      {test.result}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div style={{ marginBottom: 16, padding: 12, background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                              <div style={{ fontSize: 11, fontWeight: 900, marginBottom: 8, opacity: 0.7 }}>PEDIGREE</div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                                <div><span style={{ opacity: 0.6 }}>Sire:</span> <span style={{ fontWeight: 700 }}>{dog.parents.sire}</span></div>
                                <div><span style={{ opacity: 0.6 }}>Dam:</span> <span style={{ fontWeight: 700 }}>{dog.parents.dam}</span></div>
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: 10 }}>
                              <button style={{ ...primaryButton(theme), flex: 1 }}>Inquire About {dog.name}</button>
                              <button style={ghostButton}>Schedule Visit</button>
                              <button style={ghostButton}>Video Call</button>
                            </div>
                          </div>
                        </div>
                      </FancyCard>
                    </motion.div>
                  ))
                : null}

              {tab === "posts" ? (
                <>
                  <FancyCard theme={theme}>
                    <div style={{ fontWeight: 950, fontSize: 16 }}>Your community posts</div>
                    <div style={{ marginTop: 8, opacity: 0.75, fontSize: 13 }}>
                      This feed is live and uses your real profile posts. Everything below is still wired to your backend.
                    </div>
                  </FancyCard>

                  {posts.length === 0 ? (
                    <FancyCard theme={theme}>
                      <div style={{ opacity: 0.8 }}>No posts yet.</div>
                    </FancyCard>
                  ) : (
                    posts.map((p) => {
                      const media = resolveMediaUrl(p.mediaUrl);
                      const hasMedia = !!media;

                      return (
                        <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                          <FancyCard theme={theme}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                              <div style={{ minWidth: 0, width: "100%" }}>
                                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                                  <span style={tagBadgeFancy(theme)}>{p.tag}</span>
                                  <span style={{ opacity: 0.55, fontSize: 12 }}>{timeAgo(p.createdAt)}</span>
                                  {p.location ? <span style={{ opacity: 0.55, fontSize: 12 }}>• {p.location}</span> : null}
                                </div>

                                <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.92 }}>{sanitizeText(p.text)}</div>

                                {hasMedia ? (
                                  <div style={{ marginTop: 12, borderRadius: 12, overflow: "hidden" }}>
                                    {isVideoUrl(media) ? (
                                      <video src={media} controls playsInline style={{ width: "100%", height: "auto", display: "block" }} />
                                    ) : (
                                      <img src={media} alt="Post media" style={{ width: "100%", display: "block", objectFit: "cover" }} />
                                    )}
                                  </div>
                                ) : null}

                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, paddingTop: 12, marginTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                                  <MetricBox label="Views" value={p.views ?? 0} theme={theme} />
                                  <MetricBox label="Likes" value={p.likes ?? 0} theme={theme} />
                                  <MetricBox label="Comments" value={p.comments ?? 0} theme={theme} />
                                  <MetricBox label="Shares" value={p.shares ?? 0} theme={theme} />
                                </div>
                              </div>
                              <div style={{ position: "relative" }}>
  <button
    style={iconButton(theme)}
    onClick={() =>
      setOpenPostMenuId(openPostMenuId === p.id ? null : p.id)
    }
  >
    ⋯
  </button>

  {openPostMenuId === p.id && (
    <div
      style={{
        position: "absolute",
        right: 0,
        top: 36,
        background: "#0f1117",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
        zIndex: 10
      }}
    >
      <button
        style={menuButton}
        onClick={() => {
          setOpenPostMenuId(null);
          // edit logic later
        }}
      >
        ✏️ Edit Post
      </button>

      <button
        style={menuButton}
        onClick={() => {
          setOpenPostMenuId(null);
          setDeletePostId(p.id);
        }}
      >
        🗑 Delete Post
      </button>
    </div>
  )}
</div>
                            </div>
                          </FancyCard>
                        </motion.div>
                      );
                    })
                  )}

                  <div ref={loadMoreRef} />

                  {loadingMore ? <FancyCard theme={theme}><div style={{ opacity: 0.85 }}>Loading more…</div></FancyCard> : null}
                  {!hasMore && posts.length > 0 ? <FancyCard theme={theme}><div style={{ opacity: 0.75 }}>You’re all caught up.</div></FancyCard> : null}

                  <FancyCard theme={theme}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 900 }}>Photo Gallery</h3>
                      <button style={smallGhostButton}>View All</button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                      {mockGallery.map((img, i) => (
                        <div key={i} style={{ borderRadius: 10, overflow: "hidden", aspectRatio: "1" }}>
                          <img src={img} alt="Gallery" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </div>
                      ))}
                    </div>
                  </FancyCard>

                  <FancyCard theme={theme}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 900 }}>Reviews & Testimonials</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: "#fbbf24" }}>5.0</div>
                        <div style={{ color: "#fbbf24" }}>★★★★★</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: 12 }}>
                      {mockReviews.map((review) => (
                        <div key={review.id} style={{ padding: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10 }}>
                          <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                            <img src={review.avatar} alt={review.name} style={{ width: 40, height: 40, borderRadius: 20, objectFit: "cover" }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 2 }}>{review.name}</div>
                              <div style={{ color: "#fbbf24", fontSize: 12 }}>{"★".repeat(review.rating)}</div>
                            </div>
                            <div style={{ fontSize: 11, opacity: 0.5 }}>{review.date}</div>
                          </div>
                          <p style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.85 }}>{review.text}</p>
                        </div>
                      ))}
                    </div>
                    <button style={{ ...smallGhostButton, width: "100%", marginTop: 12 }}>View All Reviews</button>
                  </FancyCard>
                </>
              ) : null}
            </div>
          </section>

          <aside style={{ position: "sticky", top: 100, alignSelf: "start", display: "grid", gap: 20 }}>
            <FancyCard title="Trust Center" badge={investorSignals.tier} theme={theme}>
              <p style={{ fontSize: 12, opacity: 0.7, lineHeight: 1.5, marginBottom: 16 }}>
                Build confidence through verification and measurable engagement.
              </p>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.9 }}>Trust Score</span>
                  <span style={{ fontSize: 18, fontWeight: 900 }}>
                    {investorSignals.score}
                    <span style={{ fontSize: 11, opacity: 0.5 }}>/100</span>
                  </span>
                </div>
                <div style={{ height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${investorSignals.score}%`, background: `linear-gradient(90deg, ${theme.accentColor}, ${theme.accentColor}99)`, borderRadius: 999 }} />
                </div>
              </div>
              <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                <Check label="Verified email" checked={emailVerified} theme={theme} />
                <Check label="Verified phone" checked={phoneVerified} theme={theme} />
                <Check label="Account verification" checked={verifiedAccount} theme={theme} />
                <Check label="Strong profile" checked={profileCompletion.pct >= 85} theme={theme} />
              </div>
              <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                <Feature title="Health tests" status="Soon" desc="OFA/Embark uploads" theme={theme} />
                <Feature title="Breeding standards" status="Soon" desc="Ethics & policies" theme={theme} />
                <Feature title="Contracts" status="Soon" desc="Agreements" theme={theme} />
              </div>
              <button onClick={() => setEditing(true)} style={{ ...primaryButton(theme), width: "100%" }}>
                Improve Score
              </button>
            </FancyCard>

            <FancyCard title="Insights" theme={theme}>
              <div style={{ display: "grid", gap: 12 }}>
                <Progress label="Engagement" value={`${stats.engagement}%`} percent={Math.min(100, stats.engagement * 5)} theme={theme} />
                <Progress label="Avg views" value={stats.avgViews} percent={Math.min(100, stats.avgViews)} theme={theme} />
                <Progress label="Consistency" value={stats.totalPosts >= 5 ? "Strong" : stats.totalPosts >= 2 ? "Building" : "New"} percent={Math.min(100, stats.totalPosts * 18)} theme={theme} />
              </div>
            </FancyCard>

            <FancyCard title="Premium Features" theme={theme}>
              <div style={{ display: "grid", gap: 8 }}>
                <Feature title="Verified Breeder" desc="Document verification" theme={theme} />
                <Feature title="Health Vault" desc="Secure test storage" theme={theme} />
                <Feature title="Contracts" desc="Standard agreements" theme={theme} />
                <Feature title="Payments" desc="Safe transactions" theme={theme} />
                <Feature title="Reputation" desc="Verified reviews" theme={theme} />
              </div>
            </FancyCard>
                    </aside>
        </div>

{deletePostId && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.65)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999
    }}
  >
    <div
      style={{
        width: 380,
        background: "#0f1117",
        borderRadius: 16,
        padding: 28,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)"
      }}
    >
      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10 }}>
        Delete Post
      </h3>

      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 22 }}>
        This action cannot be undone.
      </p>

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
            cursor: "pointer"
          }}
        >
          Cancel
        </button>

        <button
          onClick={async () => {
            try {
              const token = getToken();
              if (!token) return;

              const res = await fetch(`${API_BASE}/posts/${deletePostId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
              });

              if (res.ok) {
                setPosts((prev) =>
                  prev.filter((post) => post.id !== deletePostId)
                );
              }

              setDeletePostId(null);
            } catch {
              setDeletePostId(null);
            }
          }}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 10,
            border: "none",
            background: "#ff3b3b",
            color: "white",
            fontWeight: 700,
            cursor: "pointer"
          }}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)}

</main>
</div>
);
}

/* ---------------------------- Components ----------------------------- */

function AvatarLarge({ initials, avatarUrl, theme }: { initials: string; avatarUrl: string | null; theme: ThemeConfig }) {
  return (
    <div
      style={{
        width: 80,
        height: 80,
        borderRadius: 14,
        overflow: "hidden",
        flexShrink: 0,
        border: `2px solid ${theme.accentColor}`,
        boxShadow: `0 4px 16px ${theme.accentColor}30`,
        background: "rgba(255,255,255,0.04)",
        display: "grid",
        placeItems: "center",
        fontWeight: 900,
        fontSize: 22,
      }}
    >
      {avatarUrl ? <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </div>
  );
}

function HeroBadge({ label, active, tone, icon }: { label: string; active: boolean; tone: string; icon?: "phone" }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", background: `linear-gradient(135deg, ${tone}15, ${tone}08)`, border: `1px solid ${tone}30`, borderRadius: 8, fontSize: 11, fontWeight: 800, boxShadow: `0 2px 8px ${tone}10`, opacity: active ? 1 : 0.45 }}>
      {icon === "phone" ? "📞" : "✓"} <span style={{ color: tone }}>{label}</span>
    </span>
  );
}

function MiniPill({ label, value, theme }: { label: string; value: string; theme: ThemeConfig }) {
  return (
    <div style={{ padding: "8px 14px", background: `${theme.accentColor}12`, border: `1px solid ${theme.accentColor}30`, borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
      <span style={{ opacity: 0.7 }}>{label}:</span> <span style={{ color: theme.accentColor }}>{value}</span>
    </div>
  );
}

function EditorCard({ title, theme, children }: { title: string; theme: ThemeConfig; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: 20, border: "1px solid rgba(255,255,255,0.05)" }}>
      <h3 style={{ fontSize: 15, fontWeight: 900, marginBottom: 16 }}>{title}</h3>
      {children}
    </div>
  );
}

function LabeledInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label style={panelLabel}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={panelInput} />
    </div>
  );
}

function LabeledTextarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label style={panelLabel}>{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={panelTextarea} />
    </div>
  );
}

function FancyCard({ title, badge, children, theme }: { title?: string; badge?: string; children: React.ReactNode; theme: ThemeConfig }) {
  return (
    <div style={{ background: theme.cardBg, backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 16, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
      {title ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 900 }}>{title}</h3>
          {badge ? <span style={{ padding: "4px 8px", background: `${theme.accentColor}20`, border: `1px solid ${theme.accentColor}40`, borderRadius: 999, fontSize: 11, fontWeight: 900 }}>{badge}</span> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function SidebarSocialFancy({ label, url, icon, theme }: { label: string; url?: string; icon: string; theme: ThemeConfig }) {
  if (!url?.trim()) return null;
  const u = normalizeSocialUrl(url);
  return (
    <a href={u} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, textDecoration: "none", color: "white", fontSize: 13, fontWeight: 700 }}>
      <span>{icon} {label}</span>
      <span style={{ opacity: 0.5 }}>↗</span>
    </a>
  );
}

function Stat({ label, value, theme }: { label: string; value: string | number; theme: ThemeConfig }) {
  return (
    <div style={{ padding: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10 }}>
      <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function MetricBox({ label, value, theme }: { label: string; value: number; theme: ThemeConfig }) {
  return (
    <div style={{ padding: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10 }}>
      <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 900 }}>{value.toLocaleString()}</div>
    </div>
  );
}

function Check({ label, checked, theme }: { label: string; checked: boolean; theme: ThemeConfig }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 18, height: 18, borderRadius: 9, background: checked ? `${theme.accentColor}20` : "rgba(255,255,255,0.03)", border: `1px solid ${checked ? `${theme.accentColor}50` : "rgba(255,255,255,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: checked ? theme.accentColor : "rgba(255,255,255,0.2)" }}>{checked ? "✓" : ""}</div>
      <span style={{ fontSize: 12, opacity: 0.9 }}>{label}</span>
    </div>
  );
}

function Feature({ title, status, desc, theme }: { title: string; status?: string; desc: string; theme: ThemeConfig }) {
  return (
    <div style={{ padding: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 900 }}>{title}</span>
        {status ? <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700 }}>{status}</span> : null}
      </div>
      <div style={{ fontSize: 11, opacity: 0.6, lineHeight: 1.4 }}>{desc}</div>
    </div>
  );
}

function Progress({ label, value, percent, theme }: { label: string; value: string | number; percent: number; theme: ThemeConfig }) {
  return (
    <div style={{ padding: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, opacity: 0.8 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 900 }}>{value}</span>
      </div>
      <div style={{ height: 8, background: "rgba(255,255,255,0.04)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${percent}%`, background: `linear-gradient(90deg, ${theme.accentColor}, ${theme.accentColor}99)`, borderRadius: 999 }} />
      </div>
    </div>
  );
}

/* ------------------------------- Styles ------------------------------ */

function pageWrap(theme: ThemeConfig): CSSProperties {
  return {
    minHeight: "100vh",
    background: `radial-gradient(circle at 18% 8%, ${theme.accentColor}22, rgba(0,0,0,0) 52%), radial-gradient(circle at 82% 12%, rgba(168,85,247,0.18), rgba(0,0,0,0) 48%), linear-gradient(180deg, ${theme.bgColor} 0%, #070a13 55%, #06070d 100%)`,
    color: theme.textColor,
    fontFamily: theme.font,
  };
}

function cardStyle(theme: ThemeConfig): CSSProperties {
  return {
    padding: 16,
    borderRadius: 22,
    background: theme.cardBg,
    border: "1px solid rgba(255,255,255,0.10)",
    boxShadow: "0 12px 34px rgba(0,0,0,0.45)",
    backdropFilter: "blur(10px)",
  };
}

function heroCard(theme: ThemeConfig): CSSProperties {
  return {
    background: theme.cardBg,
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
  };
}

function topHeader(theme: ThemeConfig): CSSProperties {
  return {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: 72,
    background: "rgba(8,10,18,0.92)",
    backdropFilter: "blur(24px) saturate(180%)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    zIndex: 100,
    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
  };
}

const topHeaderInner: CSSProperties = {
  maxWidth: 1300,
  margin: "0 auto",
  height: "100%",
  padding: "0 32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

function logoBadge(theme: ThemeConfig): CSSProperties {
  return {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.accentColor}dd)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: `0 4px 16px ${theme.accentColor}40`,
    cursor: "pointer",
  };
}

function brandWordmark(theme: ThemeConfig): CSSProperties {
  return {
    fontSize: 20,
    fontWeight: 900,
    background: `linear-gradient(135deg, ${theme.accentColor}, #6b9fff)`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-0.5px",
    cursor: "pointer",
  };
}

function iconButton(theme: ThemeConfig): CSSProperties {
  return {
    width: 42,
    height: 42,
    borderRadius: 11,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s",
    color: "white",
  };
}

function primaryButton(theme: ThemeConfig): CSSProperties {
  return {
    padding: "11px 20px",
    borderRadius: 11,
    background: `linear-gradient(135deg, ${theme.accentColor}, ${theme.accentColor}dd)`,
    border: "none",
    color: "white",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: `0 4px 16px ${theme.accentColor}35`,
  };
}

function ghostAccentButton(theme: ThemeConfig): CSSProperties {
  return {
    padding: "11px 18px",
    borderRadius: 11,
    background: `linear-gradient(135deg, ${theme.accentColor}18, ${theme.accentColor}10)`,
    border: `1px solid ${theme.accentColor}35`,
    color: "white",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  };
}

const ghostButton: CSSProperties = {
  padding: "11px 18px",
  borderRadius: 11,
  background: "transparent",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "white",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const menuButton: CSSProperties = {
  display: "block",
  width: "160px",
  padding: "10px 14px",
  background: "transparent",
  border: "none",
  color: "white",
  fontSize: 13,
  textAlign: "left",
  cursor: "pointer"
};

const notifBadge: CSSProperties = {
  position: "absolute",
  top: -4,
  right: -4,
  width: 20,
  height: 20,
  borderRadius: 10,
  background: "#ef4444",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 10,
  fontWeight: 900,
  boxShadow: "0 2px 8px rgba(239,68,68,0.5)",
};

function shareMenuStyle(theme: ThemeConfig): CSSProperties {
  return {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    background: "rgba(15,18,25,0.98)",
    backdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 12,
    minWidth: 200,
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    zIndex: 1000,
  };
}

const shareMenuButton: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 8,
  color: "white",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  textAlign: "left",
  marginBottom: 6,
};

const customBackdrop: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  backdropFilter: "blur(4px)",
  zIndex: 199,
};

function customPanel(theme: ThemeConfig): CSSProperties {
  return {
    position: "fixed",
    right: 0,
    top: 0,
    bottom: 0,
    width: 360,
    background: "rgba(12,14,22,0.98)",
    backdropFilter: "blur(40px)",
    borderLeft: "1px solid rgba(255,255,255,0.1)",
    zIndex: 200,
    overflowY: "auto",
    padding: 24,
    boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
  };
}

const closeButton: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "white",
  fontSize: 20,
  cursor: "pointer",
};

const panelHeading: CSSProperties = { fontSize: 14, fontWeight: 800, marginBottom: 12, opacity: 0.9 };
const panelLabel: CSSProperties = { display: "block", fontSize: 12, fontWeight: 900, marginBottom: 6, opacity: 0.9 };
const colorInput: CSSProperties = { width: "100%", height: 48, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, cursor: "pointer" };
const panelInput: CSSProperties = { width: "100%", padding: 12, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "white", fontSize: 13, outline: "none" };
const panelTextarea: CSSProperties = { ...panelInput, minHeight: 100, fontFamily: "Courier New", resize: "vertical" };
const themeSwatchButton: CSSProperties = { height: 48, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "white" };
const resetButton: CSSProperties = { width: "100%", padding: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" };
const tabWrapFancy: CSSProperties = { display: "inline-flex", padding: 4, background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)" };
const smallGhostButton: CSSProperties = { padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" };
const secondaryEditorButton: CSSProperties = { padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 10, color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" };

function topTabBtn(active: boolean, theme: ThemeConfig): CSSProperties {
  return {
    padding: "8px 16px",
    background: active ? `${theme.accentColor}25` : "transparent",
    border: "none",
    borderRadius: 10,
    color: "white",
    fontSize: 13,
    fontWeight: active ? 900 : 700,
    opacity: active ? 1 : 0.6,
    cursor: "pointer",
    transition: "all 0.2s",
  };
}

function tagBadgeFancy(theme: ThemeConfig): CSSProperties {
  return { padding: "4px 9px", background: `${theme.accentColor}20`, border: `1px solid ${theme.accentColor}40`, borderRadius: 999, fontSize: 10, fontWeight: 700, color: theme.accentColor };
}

function statusPill(theme: ThemeConfig): CSSProperties {
  return { padding: "6px 12px", background: `${theme.accentColor}20`, border: `1px solid ${theme.accentColor}40`, borderRadius: 8, fontSize: 11, fontWeight: 800, display: "inline-block" };
}

function uploadBox(theme: ThemeConfig): CSSProperties {
  return { border: `2px dashed ${theme.accentColor}40`, borderRadius: 12, padding: "32px 24px", background: `${theme.accentColor}05`, textAlign: "center", marginBottom: 16, cursor: "pointer" };
}
