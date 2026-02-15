"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const ACCENT = "#4681f4";

export function AddDogForm() {
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        width: "100%",
        maxWidth: 520,
        padding: 18,
        borderRadius: 16,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>
        Add a Dog (Test)
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (e.g., Luna)"
          style={inputStyle}
        />

        <input
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
          placeholder="Breed (e.g., French Bulldog)"
          style={inputStyle}
        />

        <input
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="Age (e.g., 2)"
          style={inputStyle}
        />

        <button
          type="button"
          style={{
            height: 44,
            borderRadius: 12,
            border: "none",
            fontWeight: 800,
            cursor: "pointer",
            background: ACCENT,
            color: "white",
            boxShadow: `0 10px 24px rgba(70,129,244,0.35)`,
          }}
          onClick={() => alert(`Name: ${name}\nBreed: ${breed}\nAge: ${age}`)}
        >
          Test Button
        </button>
      </div>
    </motion.div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 44,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.10)",
  outline: "none",
  padding: "0 12px",
  background: "rgba(0,0,0,0.25)",
  color: "white",
};
