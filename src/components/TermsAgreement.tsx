"use client";

import Link from "next/link";

const ACCENT = "#4681f4";

export function TermsAgreement({
  checked,
  onChange,
  error,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  error?: string;
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{
            marginTop: 3,
            width: 16,
            height: 16,
            accentColor: ACCENT,
          }}
        />

        <span style={{ color: "#d6d6d6", fontSize: 14, lineHeight: 1.45 }}>
          I agree to the{" "}
          <Link
            href="/terms"
            target="_blank"
            style={{
              color: "#eaeaea",
              textDecoration: "underline",
              textDecorationColor: "rgba(70,129,244,0.6)",
            }}
          >
            Terms of Service
          </Link>
          .
        </span>
      </label>

      {error ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 13,
            color: "#ffb4b4",
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}
