"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";

const ACCENT = "#4681f4";

type PublicUser = {
  username: string;
  display_name?: string | null;
  bio?: string | null;
  location?: string | null;
  avatar_url?: string | null;
  created_at?: string;
};

type PublicPost = {
  id: string;
  createdAt: number;
  text: string;
  tag:
    | "Litter Update"
    | "Stud Available"
    | "Looking for match"
    | "Health Test Results"
    | "Advice"
    | string;
  location?: string;
  mediaUrl?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
};

type ThemeConfig = {
  accentColor: string;
  bgColor: string;
  cardBg: string;
  textColor: string;
  font: string;
  cardOpacity: number;
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

type Tab = "posts" | "dogs";

const defaultTheme: ThemeConfig = {
  accentColor: ACCENT,
  bgColor: "#0a0e16",
  cardBg: "rgba(20,24,35,0.6)",
  textColor: "#ffffff",
  font: "system-ui",
  cardOpacity: 0.6,
};

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

export default function PublicProfilePage() {
  const router = useRouter();
  const params = useParams();
  const username = decodeURIComponent(String(params?.username || "")).trim();

  const [tab, setTab] = useState<Tab>("posts");
  const [shareMenu, setShareMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [userPosts, setUserPosts] = useState<PublicPost[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);

        const profileRes = await fetch(`${API_BASE}/users/${encodeURIComponent(username)}`, {
          cache: "no-store",
        });

        if (!profileRes.ok) {
          if (!cancelled) setUser(null);
          return;
        }

        const profileData = await profileRes.json();
        if (cancelled) return;
        setUser(profileData?.user ?? null);

        try {
          const postsRes = await fetch(`${API_BASE}/posts?limit=50`, {
            cache: "no-store",
          });

          if (postsRes.ok) {
            const postsData = await postsRes.json();
            const allPosts = Array.isArray(postsData?.posts) ? postsData.posts : [];
            const filtered = allPosts
              .filter((p: any) => {
                const candidate = String(p?.author?.username || "").trim();
                return candidate.toLowerCase() === username.toLowerCase();
              })
              .map((p: any) => ({
                id: String(p.id),
                createdAt: Number(p.createdAt || Date.now()),
                text: sanitizeText(String(p.text || "")),
                tag: String(p.tag || "Post"),
                location: p.location || p.author?.location || "",
                mediaUrl: p.mediaUrl || "",
                views: Number(p.views || 0),
                likes: Number(p.likes || 0),
                comments: Number(p.comments || 0),
                shares: Number(p.shares || 0),
              }));

            if (!cancelled) setUserPosts(filtered);
          }
        } catch {
          if (!cancelled) setUserPosts([]);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setUserPosts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (username) loadProfile();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const theme = defaultTheme;

  const displayName = useMemo(() => {
    const dn = user?.display_name?.trim();
    if (dn) return dn;
    if (user?.username) {
      return user.username
        .replace(/[._-]+/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" ");
    }
    return "Profile";
  }, [user]);

  const handle = useMemo(() => {
    const u = user?.username || "lincani";
    return "@" + u.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20);
  }, [user]);

  const initials = useMemo(() => {
    const parts = displayName.split(" ").filter(Boolean);
    const a = parts[0]?.[0] || "L";
    const b = parts[1]?.[0] || parts[0]?.[1] || "C";
    return (a + b).toUpperCase();
  }, [displayName]);

  const bio = useMemo(
    () => sanitizeText(user?.bio?.trim() ? user.bio.trim() : "Responsible breeder • Health-first matches"),
    [user]
  );

  const loc = useMemo(() => (user?.location?.trim() ? user.location.trim() : "Location not set"), [user]);

  const stats = useMemo(() => {
    const totalPosts = userPosts.length;
    let views = 0,
      likes = 0,
      comments = 0,
      shares = 0;

    for (const p of userPosts) {
      views += p.views ?? 0;
      likes += p.likes ?? 0;
      comments += p.comments ?? 0;
      shares += p.shares ?? 0;
    }

    const engagement = views > 0 ? Math.round(((likes + comments + shares) / views) * 1000) / 10 : 0;
    const avgViews = totalPosts ? Math.round(views / totalPosts) : 0;

    return { totalPosts, views, likes, comments, shares, engagement, avgViews };
  }, [userPosts]);

  const topPost = useMemo(() => {
    if (!userPosts.length) return null;
    return [...userPosts].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0];
  }, [userPosts]);

  const memberSince = useMemo(() => {
    const source = user?.created_at;
    if (!source) return "—";
    const d = new Date(source);
    return Number.isNaN(d.getTime()) ? "—" : String(d.getFullYear());
  }, [user?.created_at]);

  const investorSignals = useMemo(() => {
    let score = 40;
    if (user?.bio?.trim()) score += 10;
    if (user?.location?.trim()) score += 10;
    if (user?.avatar_url?.trim()) score += 15;
    if (stats.totalPosts >= 3) score += 10;
    if (stats.views >= 50) score += 15;
    const capped = Math.min(100, score);
    const tier = capped >= 85 ? "Elite" : capped >= 65 ? "Verified" : capped >= 40 ? "Rising" : "New";
    return { score: capped, tier };
  }, [user, stats]);

  const responseRate = useMemo(() => {
    if (!stats.totalPosts) return 92;
    return Math.min(99, Math.max(82, 86 + Math.round(stats.engagement / 2)));
  }, [stats.totalPosts, stats.engagement]);

  const responseTime = useMemo(() => {
    if (stats.totalPosts >= 8) return "< 1 hour";
    if (stats.totalPosts >= 3) return "< 4 hours";
    return "< 24 hours";
  }, [stats.totalPosts]);

  if (loading) {
    return (
      <main style={pageWrap(theme)}>
        <div style={{ maxWidth: 1300, margin: "0 auto", padding: "102px 32px 60px", color: "white" }}>
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

  if (!user) {
    return (
      <main style={pageWrap(theme)}>
        <div style={{ maxWidth: 1300, margin: "0 auto", padding: "102px 32px 60px", color: "white" }}>
          <FancyCard theme={theme}>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>User not found</div>
            <div style={{ opacity: 0.72, fontSize: 14, marginBottom: 16 }}>
              We couldn’t find that profile.
            </div>
            <button onClick={() => router.push("/dashboard")} style={primaryButton(theme)}>
              Back to dashboard
            </button>
          </FancyCard>
        </div>
      </main>
    );
  }

  return (
    <div style={pageWrap(theme)}>
      <header style={topHeader(theme)}>
        <div style={topHeaderInner}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              onClick={() => router.push("/")}
              style={logoBadge(theme)}
              role="button"
              aria-label="Go to homepage"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div
              onClick={() => router.push("/")}
              style={brandWordmark(theme)}
              role="button"
              aria-label="Go to homepage"
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
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <button onClick={() => router.push("/profile")} style={ghostAccentButton(theme)}>
              View My Profile
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1300, margin: "0 auto", padding: "102px 32px 60px", position: "relative", zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={heroCard(theme)}>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
            <AvatarLarge initials={initials} avatarUrl={user?.avatar_url ?? null} theme={theme} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6, letterSpacing: "-0.3px" }}>{displayName}</h1>
              <div style={{ fontSize: 14, opacity: 0.6, marginBottom: 12 }}>{handle}</div>

              <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                <HeroBadge label="Public Profile" active={true} tone={theme.accentColor} />
                <HeroBadge label="Breeder Member" active={true} tone="#10b981" />
                <HeroBadge label="Community Active" active={stats.totalPosts > 0} tone="#f59e0b" />
              </div>

              <div style={{ fontSize: 13, opacity: 0.65, marginBottom: 12 }}>
                📍 {loc} • Member since {memberSince}
              </div>

              <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.92, marginBottom: 16 }}>{bio}</p>

              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <MiniPill label="Response Time" value={responseTime} theme={theme} />
                <MiniPill label="Response Rate" value={`${responseRate}%`} theme={theme} />
              </div>
            </div>
          </div>
        </motion.div>

        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 280px", gap: 24, alignItems: "start", maxWidth: 1400, margin: "0 auto", width: "100%" }}>
          <aside style={{ position: "sticky", top: 100, display: "grid", gap: 20 }}>
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
                    <div style={{ fontWeight: 950, fontSize: 16 }}>{displayName}'s community posts</div>
                    <div style={{ marginTop: 8, opacity: 0.75, fontSize: 13 }}>
                      This page uses the same profile layout style, but for public viewing.
                    </div>
                  </FancyCard>

                  {userPosts.length === 0 ? (
                    <FancyCard theme={theme}>
                      <div style={{ opacity: 0.8 }}>No posts yet.</div>
                    </FancyCard>
                  ) : (
                    userPosts.map((p) => {
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
                              <button style={iconButton(theme)} title="More">⋯</button>
                            </div>
                          </FancyCard>
                        </motion.div>
                      );
                    })
                  )}

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
                Public trust snapshot for this breeder profile.
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
                <Check label="Bio completed" checked={!!user.bio?.trim()} theme={theme} />
                <Check label="Location added" checked={!!user.location?.trim()} theme={theme} />
                <Check label="Avatar uploaded" checked={!!user.avatar_url?.trim()} theme={theme} />
                <Check label="Active profile" checked={stats.totalPosts > 0} theme={theme} />
              </div>
              <button onClick={() => router.push("/dashboard")} style={{ ...primaryButton(theme), width: "100%" }}>
                Return to dashboard
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
      </main>
    </div>
  );
}

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

const tabWrapFancy: CSSProperties = {
  display: "inline-flex",
  padding: 4,
  background: "rgba(255,255,255,0.03)",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.06)",
};

const smallGhostButton: CSSProperties = {
  padding: "10px 12px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  color: "white",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

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
  return {
    padding: "4px 9px",
    background: `${theme.accentColor}20`,
    border: `1px solid ${theme.accentColor}40`,
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 700,
    color: theme.accentColor,
  };
}

function statusPill(theme: ThemeConfig): CSSProperties {
  return {
    padding: "6px 12px",
    background: `${theme.accentColor}20`,
    border: `1px solid ${theme.accentColor}40`,
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 800,
    display: "inline-block",
  };
}
