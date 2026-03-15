"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/profile", label: "Home", icon: "◉" },
  { href: "/programme", label: "Programme", icon: "▣" },
  { href: "/benchmarks", label: "Progress", icon: "◎" },
  { href: "/tactical/input", label: "Readiness", icon: "◇" },
  { href: "#ai-coach", label: "AI Coach", icon: "✦" },
] as const;

export default function MobileBottomNav({ onOpenAiCoach }: { onOpenAiCoach?: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[9999] md:hidden flex items-center justify-around bg-[rgba(10,10,15,0.98)] border-t border-white/10 safe-area-pb shadow-[0_-2px_12px_rgba(0,0,0,0.15)]"
      style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      role="navigation"
      aria-label="Main navigation"
    >
      {navItems.map(({ href, label, icon }) => {
        const isAi = label === "AI Coach";
        const isActive = !isAi && (pathname === href || (href === "/profile" && pathname?.startsWith("/profile")) || (href === "/benchmarks" && pathname?.startsWith("/benchmarks")));
        const content = (
          <span className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-h-[var(--btn-min-height)] min-w-[44px]" style={{ minHeight: "var(--btn-min-height)" }}>
            <span className="text-lg leading-none" aria-hidden>{icon}</span>
            <span className="text-[10px] font-medium">{label}</span>
          </span>
        );
        if (isAi && onOpenAiCoach) {
          return (
            <button
              key={label}
              type="button"
              onClick={onOpenAiCoach}
              className={`flex-1 flex items-center justify-center text-white/90 hover:text-white hover:bg-white/5 transition-colors rounded-lg ${isActive ? "text-white bg-white/10" : ""}`}
              aria-label="Open AI Coach"
            >
              {content}
            </button>
          );
        }
        return (
          <Link
            key={label}
            href={href}
            className={`flex-1 flex items-center justify-center text-white/90 hover:text-white hover:bg-white/5 transition-colors rounded-lg ${isActive ? "text-white bg-white/10" : ""}`}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
