// src/app/terms/page.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const ACCENT = "#4681f4";
const LAST_UPDATED = "February 12, 2026";

export default function TermsPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 20px",
        background: "radial-gradient(circle at top, #151515, #0b0b0b)",
        color: "#eaeaea",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 22,
          }}
        >
          <Link
            href="/"
            style={{
              color: "#cfcfcf",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontSize: 14,
              opacity: 0.95,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                display: "grid",
                placeItems: "center",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              ←
            </span>
            Back to Home
          </Link>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              color: "#bdbdbd",
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                background: ACCENT,
                boxShadow: `0 0 16px ${ACCENT}`,
                display: "inline-block",
              }}
            />
            <span>Last updated: {LAST_UPDATED}</span>
          </div>
        </div>

        {/* Hero card */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          style={{
            borderRadius: 22,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 14px 40px rgba(0,0,0,0.45)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "26px 26px 18px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              background:
                "linear-gradient(180deg, rgba(70,129,244,0.16), rgba(255,255,255,0.03))",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
                aria-hidden="true"
              >
                <span style={{ fontSize: 18, color: "#eaeaea" }}>§</span>
              </div>

              <div style={{ minWidth: 240 }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 28,
                    letterSpacing: -0.4,
                    lineHeight: 1.15,
                  }}
                >
                  Terms of Service
                </h1>
                <p style={{ margin: "8px 0 0", color: "#cfcfcf", maxWidth: 820 }}>
                  These Terms of Service (“Terms”) govern your access to and use of BreedLink
                  (the “Service”). By using the Service, you agree to these Terms.
                </p>
              </div>
            </div>
          </div>

          <div style={{ padding: 26 }}>
            <Notice />

            <div style={{ display: "grid", gap: 18 }}>
              <Section title="1) Who we are">
                BreedLink (“we,” “us,” “our”) provides a community and marketplace-style
                platform for dog listings, breeder profiles, posts, messages, and related content.
                BreedLink does not own, sell, buy, transport, or take custody of animals.
              </Section>

              <Section title="2) Eligibility and accounts">
                You must be at least 18 years old (or the age of majority where you live) to use
                the Service. You are responsible for maintaining the confidentiality of your
                account credentials and for all activity under your account. You agree to provide
                accurate, current information and to keep it updated.
              </Section>

              <Section title="3) User content and licenses">
                You may post content such as photos, text, listings, health documentation, and
                messages (“User Content”). You retain ownership of your User Content, but you
                grant BreedLink a non-exclusive, worldwide, royalty-free license to host, store,
                reproduce, modify (for formatting), display, and distribute your User Content
                solely for operating, improving, and promoting the Service.
                <br />
                <br />
                You represent that you have all rights necessary to post the User Content and that
                it does not violate any law or third-party rights.
              </Section>

              <Section title="4) Animal welfare and responsible use">
                BreedLink is intended to promote responsible pet ownership and ethical breeding.
                You agree that you will not use the Service to:
                <ul style={ulStyle}>
                  <li style={liStyle}>
                    Facilitate cruelty, neglect, abuse, fighting, or any illegal activity.
                  </li>
                  <li style={liStyle}>
                    Misrepresent an animal’s age, breed, lineage, health, vaccinations, or testing.
                  </li>
                  <li style={liStyle}>
                    Post deceptive listings, fraudulent documents, or stolen photos.
                  </li>
                  <li style={liStyle}>
                    Circumvent local regulations, licensing rules, or required disclosures.
                  </li>
                </ul>
                BreedLink may remove content, restrict features, or suspend accounts for conduct
                we believe is unsafe, unethical, or unlawful.
              </Section>

              <Section title="5) No veterinary, legal, or breeding advice">
                The Service may contain general information. BreedLink is not a veterinary clinic,
                not a kennel, and not a legal advisor. Any information on BreedLink is provided
                for general purposes only and should not be relied on as veterinary, medical, or
                legal advice. Always consult a qualified veterinarian or professional for animal
                health and welfare concerns.
              </Section>

              <Section title="6) Transactions and third-party interactions">
                Any agreements, communications, and transactions between users (including stud
                services, co-ownership, deposits, sales, or transportation arrangements) are solely
                between the users. BreedLink is not a party to those agreements and does not
                guarantee:
                <ul style={ulStyle}>
                  <li style={liStyle}>The identity, intent, or qualifications of any user</li>
                  <li style={liStyle}>The health, temperament, or suitability of any animal</li>
                  <li style={liStyle}>The accuracy of health tests, registrations, or pedigrees</li>
                  <li style={liStyle}>Payment, delivery, returns, or refunds</li>
                </ul>
                You assume all risks of user-to-user interactions, including meeting in person.
                Use common sense and meet in safe public places where appropriate.
              </Section>

              <Section title="7) Prohibited content and conduct">
                You agree not to:
                <ul style={ulStyle}>
                  <li style={liStyle}>Harass, threaten, stalk, or harm others</li>
                  <li style={liStyle}>Post hate speech, explicit sexual content, or graphic violence</li>
                  <li style={liStyle}>Upload malware or attempt to disrupt the Service</li>
                  <li style={liStyle}>Scrape, copy, or reverse engineer the Service (where prohibited)</li>
                  <li style={liStyle}>Impersonate another person or entity</li>
                  <li style={liStyle}>
                    Post personal data of others without permission (doxxing)
                  </li>
                </ul>
              </Section>

              <Section title="8) Moderation and enforcement">
                We may (but are not obligated to) monitor, review, or remove content and suspend
                accounts. We may take action at our discretion to protect users, comply with law,
                and maintain platform integrity, including removing listings or restricting access.
              </Section>

              <Section title="9) Intellectual property">
                The Service, including its design, branding, and underlying software, is owned by
                BreedLink or its licensors and is protected by intellectual property laws. You may
                not use BreedLink trademarks without prior written permission.
              </Section>

              <Section title="10) Privacy">
                Your use of the Service is also governed by our Privacy Policy (if provided).
                If there is no separate Privacy Policy posted yet, you still agree that BreedLink
                may process your data to provide and improve the Service, including account
                management, security, moderation, and support.
              </Section>

              <Section title="11) Disclaimers">
                THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT
                PERMITTED BY LAW, BREEDLINK DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED,
                INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
                PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
                UNINTERRUPTED, ERROR-FREE, OR SECURE.
              </Section>

              <Section title="12) Limitation of liability">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, BREEDLINK WILL NOT BE LIABLE FOR ANY
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS
                OF PROFITS, REVENUE, DATA, OR GOODWILL, ARISING OUT OF OR RELATING TO YOUR USE
                OF THE SERVICE.
                <br />
                <br />
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, BREEDLINK’S TOTAL LIABILITY FOR ANY
                CLAIM ARISING OUT OF OR RELATING TO THE SERVICE WILL NOT EXCEED ONE HUNDRED U.S.
                DOLLARS (US $100) OR THE AMOUNT YOU PAID TO BREEDLINK FOR THE SERVICE IN THE 12
                MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM, WHICHEVER IS GREATER.
              </Section>

              <Section title="13) Indemnification">
                You agree to indemnify and hold harmless BreedLink and its affiliates, officers,
                employees, and agents from and against any claims, liabilities, damages, losses,
                and expenses (including reasonable attorneys’ fees) arising from your User
                Content, your use of the Service, or your violation of these Terms.
              </Section>

              <Section title="14) Termination">
                You may stop using the Service at any time. We may suspend or terminate your
                access to the Service at any time if we believe you violated these Terms or if we
                need to do so to protect the Service or other users. Sections that by their nature
                should survive termination will survive (including disclaimers, limitation of
                liability, and indemnification).
              </Section>

              <Section title="15) Changes to the Service or Terms">
                We may modify the Service or these Terms from time to time. When we make changes,
                we will update the “Last updated” date above. Your continued use of the Service
                after changes become effective constitutes acceptance of the updated Terms.
              </Section>

              <Section title="16) Governing law">
                These Terms are governed by the laws of the state where BreedLink is principally
                operated (unless superseded by applicable law). Venue for disputes will be in the
                courts located in that jurisdiction, unless required otherwise by law.
              </Section>

              <Section title="17) Contact">
                If you have questions about these Terms, contact support through the Service.
              </Section>
            </div>

            <div
              style={{
                marginTop: 24,
                paddingTop: 18,
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <span style={{ color: "#bdbdbd", fontSize: 13 }}>
                © {new Date().getFullYear()} BreedLink. All rights reserved.
              </span>

              <Link
                href="/"
                style={{
                  textDecoration: "none",
                  color: "#eaeaea",
                  fontSize: 14,
                  padding: "10px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.06)",
                }}
              >
                Return to Home
              </Link>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}

function Notice() {
  return (
    <div
      style={{
        marginBottom: 18,
        padding: "14px 14px",
        borderRadius: 16,
        border: "1px solid rgba(70,129,244,0.35)",
        background: "rgba(70,129,244,0.10)",
        color: "#dbe7ff",
        lineHeight: 1.45,
        fontSize: 14,
      }}
    >
      <strong style={{ color: "#ffffff" }}>Important:</strong>{" "}
      This template is provided for general informational purposes and is not legal advice.
      Consider having a qualified attorney review your Terms for your specific business,
      location, and compliance needs.
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.25)",
        padding: "16px 16px",
      }}
    >
      <h2
        style={{
          margin: "0 0 10px",
          fontSize: 16,
          letterSpacing: -0.2,
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: ACCENT,
            boxShadow: `0 0 16px ${ACCENT}`,
            display: "inline-block",
          }}
        />
        {title}
      </h2>
      <div style={{ color: "#d6d6d6", lineHeight: 1.6, fontSize: 14 }}>
        {children}
      </div>
    </section>
  );
}

const ulStyle: React.CSSProperties = {
  margin: "10px 0 0 18px",
  padding: 0,
  color: "#d6d6d6",
};

const liStyle: React.CSSProperties = {
  margin: "6px 0",
};
