"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const PlanIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const CheckIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const MoreIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

const TABS = [
  { label: "Home", icon: HomeIcon, href: "/profile" },
  { label: "Plan", icon: PlanIcon, href: "/programme" },
  { label: "Input", icon: CheckIcon, href: "/tactical/input" },
  { label: "More", icon: MoreIcon, href: "/settings" },
] as const;

export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="mobile-tab-bar"
      role="navigation"
      aria-label="Main navigation"
    >
      {TABS.map(({ label, icon: Icon, href }) => {
        const isActive =
          pathname === href ||
          (href === "/profile" && pathname?.startsWith("/profile") && !pathname?.startsWith("/programme")) ||
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
              <Icon />
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
          height: calc(64px + env(safe-area-inset-bottom));
          padding-bottom: env(safe-area-inset-bottom);
          background: rgba(10, 12, 18, 0.97);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          align-items: flex-start;
          justify-content: space-around;
          padding-top: 10px;
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
          gap: 4px;
          min-width: 64px;
          min-height: 44px;
          color: rgba(238, 240, 244, 0.28);
          transition: color 0.15s;
          text-decoration: none;
          cursor: pointer;
        }
        .tab-item.active {
          color: #00c9a0;
        }
        .tab-icon {
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tab-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
      `}</style>
    </nav>
  );
}
