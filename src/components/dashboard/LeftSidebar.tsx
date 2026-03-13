"use client";

import { Home, Store, MessageCircle, Heart, ShieldCheck, Settings } from "lucide-react";
import { motion } from "framer-motion";

type LeftSidebarProps = {
  activeTab: "community" | "network";
  onCommunity: () => void;
  onNetwork: () => void;
  onProfile: () => void;
};

const navItems = [
  { icon: Home, label: "Dashboard", key: "community" },
  { icon: Store, label: "Marketplace", key: "network" },
  { icon: MessageCircle, label: "Messages", key: "messages" },
  { icon: Heart, label: "Health Records", key: "health" },
  { icon: ShieldCheck, label: "Verification", key: "verification" },
  { icon: Settings, label: "Settings", key: "settings" },
] as const;

export function LeftSidebar({
  activeTab,
  onCommunity,
  onNetwork,
  onProfile,
}: LeftSidebarProps) {
  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className="w-56 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-2xl px-3 py-6"
    >
      <nav className="space-y-1">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive =
            (item.key === "community" && activeTab === "community") ||
            (item.key === "network" && activeTab === "network");

          const handleClick = () => {
            if (item.key === "community") return onCommunity();
            if (item.key === "network") return onNetwork();
            if (item.key === "settings") return onProfile();
          };

          return (
            <motion.button
              key={item.label}
              onClick={handleClick}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.03 }}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                isActive
                  ? "border border-white/[0.08] bg-white/[0.08] text-white"
                  : "text-gray-400 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-lg bg-white/[0.08]"
                  transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                />
              )}
              <Icon className={`relative h-4 w-4 ${isActive ? "text-white" : ""}`} />
              <span className="relative font-medium">{item.label}</span>
            </motion.button>
          );
        })}
      </nav>
    </motion.aside>
  );
}