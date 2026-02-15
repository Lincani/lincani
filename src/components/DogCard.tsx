"use client";

import { motion } from "framer-motion";

export type Dog = {
  name: string;
  breed: string;
  age: number;
};

const ACCENT = "#4681f4";

export function DogCard({ dog, index }: { dog: Dog; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.12, duration: 0.35 }}
      whileHover={{ y: -4 }}
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 18,
        padding: 18,
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{dog.name}</div>
          <div style={{ color: "rgba(255,255,255,0.75)", marginTop: 4 }}>
            {dog.breed}
          </div>
        </div>

        <div
          style={{
            height: 34,
            padding: "0 10px",
            display: "flex",
            alignItems: "center",
            borderRadius: 999,
            background: "rgba(70,129,244,0.18)",
            border: "1px solid rgba(70,129,244,0.35)",
            color: "rgba(255,255,255,0.9)",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {dog.age} yrs
        </div>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.08)",
            color: "white",
            border: "1px solid rgba(255,255,255,0.12)",
            padding: "10px 12px",
            borderRadius: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          View Profile
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            flex: 1,
            background: ACCENT,
            color: "white",
            border: "none",
            padding: "10px 12px",
            borderRadius: 14,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 12px 24px rgba(70,129,244,0.28)",
          }}
        >
          Request Match
        </motion.button>
      </div>
    </motion.div>
  );
}
