"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Home", icon: "⌂", href: "/profile" },
  { label: "Profile", icon: "◎", href: "/profile" },
  { label: "Plan", icon: "▦", href: "/programme" },
  { label: "Check-in", icon: "✓", href: "/tactical/input" },
  { label: "More", icon: "⋯", href: "/settings" },
] as const;

export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="mobile-tab-bar"
      role="navigation"
      aria-label="Main navigation"
    >
      {TABS.map(({ label, icon, href }) => {
        const isActive =
          pathname === href ||
          (href === "/profile" && pathname?.startsWith("/profile") && pathname !== "/programme") ||
          (href === "/programme" && pathname?.startsWith("/programme")) ||
          (href === "/tactical/input" && pathname?.startsWith("/tactical/input")) ||
          (href === "/settings" && pathname?.startsWith("/settings"));
        return (
          <Link
            key={label}
            href={href}
            className={`tab-item ${isActive ? "active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="tab-icon" aria-hidden>
              {icon}
            </span>
            <span className="tab-label">{label}</span>
          </Link>
        );
      })}
      <style jsx>{`
        .mobile-tab-bar {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 200;
          height: calc(60px + env(safe-area-inset-bottom));
          padding-bottom: env(safe-area-inset-bottom);
          background: rgba(13, 15, 22, 0.96);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255, 255, 255, 0.07);
          align-items: flex-start;
          justify-content: space-around;
          padding-top: 8px;
        }
        @media (max-width: 768px) {
          .mobile-tab-bar {
            display: flex;
          }
        }
        .tab-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          min-width: 44px;
          min-height: 44px;
          cursor: pointer;
          color: rgba(238, 240, 244, 0.35);
          transition: color 0.15s;
          text-decoration: none;
        }
        .tab-item.active {
          color: #00c9a0;
        }
        .tab-icon {
          font-size: 18px;
          line-height: 1;
        }
        .tab-label {
          font-size: 9.5px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
      `}</style>
    </nav>
  );
}
