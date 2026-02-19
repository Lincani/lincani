"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getToken } from "@/lib/auth";
import { API_BASE } from "@/lib/api";

const ACCENT = "#4681f4";
const STORY_MS = 7500;

/* ---------- TYPES ---------- */

type StoryItem = {
  id: number;
  type: "media" | "post";
  caption: string;
  media_type?: string;
  media_url?: string;
  created_at: number;
  expires_at: number;
};

type FeedUser = {
  user: {
    id: number;
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
  stories: StoryItem[];
};

/* ---------- STORIES BAR ---------- */

export default function StoriesBar() {
  const [feed, setFeed] = useState<FeedUser[]>([]);
  const [openUserId, setOpenUserId] = useState<number | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    fetch(`${API_BASE}/stories/feed`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setFeed(d.feed || []))
      .catch(() => setFeed([]));
  }, []);

  if (!feed.length)
    return <div style={{ padding: 12, opacity: 0.6 }}>No stories yet</div>;

  return (
    <>
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(15,18,28,0.55)",
          backdropFilter: "blur(12px)",
          borderRadius: 16,
          padding: 12,
          overflowX: "auto",
          display: "flex",
          gap: 14,
        }}
      >
        {feed.map(({ user, stories }) => {
          const label = user.display_name || user.username;
          const hasStory = stories?.length > 0;

          return (
            <div
              key={user.id}
              onClick={() => hasStory && setOpenUserId(user.id)}
              style={{
                minWidth: 76,
                cursor: hasStory ? "pointer" : "default",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 66,
                  height: 66,
                  margin: "0 auto",
                  borderRadius: 999,
                  padding: 3,
                  background: hasStory
                    ? `linear-gradient(135deg, ${ACCENT}, rgba(70,129,244,0.15))`
                    : "rgba(255,255,255,0.10)",
                }}
              >
                <img
                  src={user.avatar_url || "/logo.png"}
                  alt={label}
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: 999,
                    objectFit: "cover",
                    border: "2px solid rgba(10,12,18,0.9)",
                  }}
                />
              </div>

              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                {label}
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {openUserId !== null && (
          <StoryViewer userId={openUserId} onClose={() => setOpenUserId(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------- STORY VIEWER ---------- */

function StoryViewer({
  userId,
  onClose,
}: {
  userId: number;
  onClose: () => void;
}) {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    fetch(`${API_BASE}/stories/user/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setStories(d.stories || []))
      .catch(() => setStories([]));
  }, [userId]);

  useEffect(() => {
    if (!stories.length) return;
    setIdx(0);
  }, [stories.length]);

  const current = stories[idx];

  /* ---------- AUTO PROGRESS ---------- */

  useEffect(() => {
    if (!current) return;

    const t = setTimeout(() => nextStory(), STORY_MS);
    return () => clearTimeout(t);
  }, [current]);

  /* ---------- NAVIGATION ---------- */

  const nextStory = () => {
    setIdx((v) => {
      if (v + 1 >= stories.length) {
        onClose();
        return v;
      }
      return v + 1;
    });
  };

  const prevStory = () => setIdx((v) => Math.max(0, v - 1));

  const radius = 18;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 96vw)",
          borderRadius: radius,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* PROGRESS BORDER BACK */}
        <svg
          key={`${userId}:${idx}`}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <motion.rect
            x="1"
            y="1"
            width="98"
            height="98"
            rx="16"
            ry="16"
            fill="none"
            stroke={ACCENT}
            strokeWidth="0.2"
            strokeLinecap="round"
            pathLength={1000}
            strokeDasharray={1000}
            initial={{ strokeDashoffset: 1000 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: STORY_MS / 1000, ease: "linear" }}
          />
        </svg>

        {/* ARROWS */}
        {idx > 0 && (
          <button onClick={prevStory} style={arrowStyle("left")}>
            ‹
          </button>
        )}

        <button onClick={nextStory} style={arrowStyle("right")}>
          ›
        </button>

        {/* STORY CONTENT */}
        <div
          style={{
            aspectRatio: "9/16",
            background: "#000",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          {current?.media_type === "video" ? (
            <video
              src={`${API_BASE}${current.media_url}`}
              autoPlay
              controls
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <img
              src={`${API_BASE}${current?.media_url}`}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- ARROW STYLE ---------- */

function arrowStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    [side]: 10,
    transform: "translateY(-50%)",
    width: 42,
    height: 42,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(0,0,0,0.35)",
    color: "white",
    fontSize: 26,
    cursor: "pointer",
    zIndex: 5,
  };
}
