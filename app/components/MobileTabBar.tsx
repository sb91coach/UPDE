"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU_ITEMS = [
  { label: "Home", href: "/profile" },
  { label: "Programme", href: "/programme" },
  { label: "Calendar", href: "/calendar" },
  { label: "Performance", href: "/performance" },
  { label: "Nutrition", href: "/nutrition" },
  { label: "Strategy", href: "/strategy" },
  { label: "Check-In", href: "/tactical/input" },
  { label: "Settings", href: "/settings" },
] as const;

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/profile") return pathname === "/profile" || (pathname.startsWith("/profile") && !pathname.startsWith("/programme"));
  return pathname === href || pathname.startsWith(href + "/");
}

export default function MobileTabBar() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  return (
    <>
      <style jsx>{`
        .mobile-menu-wrap {
          display: none;
        }
        @media (max-width: 768px) {
          .mobile-menu-wrap {
            display: block;
          }
        }
        .mobile-menu-btn {
          position: fixed;
          bottom: calc(24px + env(safe-area-inset-bottom));
          left: 50%;
          transform: translateX(-50%);
          height: 44px;
          min-width: 120px;
          border-radius: 22px;
          background: rgba(20, 22, 30, 0.97);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          font-size: 14px;
          font-weight: 600;
          color: rgba(238, 240, 244, 0.85);
          letter-spacing: 0.06em;
          cursor: pointer;
          z-index: 300;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-family: inherit;
        }
        .mobile-sheet-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          z-index: 399;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.28s ease, visibility 0.28s ease;
        }
        .mobile-sheet-overlay.open {
          opacity: 1;
          visibility: visible;
        }
        .mobile-sheet {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(14, 16, 22, 0.98);
          border-radius: 24px 24px 0 0;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          padding-bottom: env(safe-area-inset-bottom);
          z-index: 400;
          transform: translateY(100%);
          transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .mobile-sheet.open {
          transform: translateY(0);
        }
        .mobile-sheet-handle {
          width: 36px;
          height: 4px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 2px;
          margin: 12px auto 20px;
        }
        .mobile-sheet-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 52px;
          padding: 0 24px;
          font-size: 16px;
          font-weight: 500;
          color: rgba(238, 240, 244, 0.85);
          text-decoration: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          cursor: pointer;
        }
        .mobile-sheet-row:last-child {
          border-bottom: none;
        }
        .mobile-sheet-row.active {
          color: #00c9a0;
        }
        .mobile-sheet-row-arrow {
          color: rgba(238, 240, 244, 0.2);
          font-size: 20px;
        }
      `}</style>

      <div className="mobile-menu-wrap">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setSheetOpen(true)}
          aria-label="Open menu"
        >
          <span aria-hidden>≡</span>
          <span>Menu</span>
        </button>
      </div>

      <div
        className={`mobile-sheet-overlay ${sheetOpen ? "open" : ""}`}
        onClick={() => setSheetOpen(false)}
        role="button"
        tabIndex={-1}
        aria-hidden={!sheetOpen}
      />

      <div className={`mobile-sheet ${sheetOpen ? "open" : ""}`} role="dialog" aria-modal="true" aria-label="Navigation menu">
        <div className="mobile-sheet-handle" aria-hidden />
        {MENU_ITEMS.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className={`mobile-sheet-row ${isActive(pathname, href) ? "active" : ""}`}
            onClick={() => setSheetOpen(false)}
          >
            <span>{label}</span>
            <span className="mobile-sheet-row-arrow" aria-hidden>›</span>
          </Link>
        ))}
      </div>
    </>
  );
}
