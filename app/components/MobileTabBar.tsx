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
        .mobile-sheet-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          padding: 16px 20px 24px;
        }
        .mobile-sheet-grid-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 72px;
          text-decoration: none;
          cursor: pointer;
        }
        .mobile-sheet-grid-icon {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: rgba(238, 240, 244, 0.6);
        }
        .mobile-sheet-grid-item.active .mobile-sheet-grid-icon {
          background: rgba(0, 201, 160, 0.12);
          border-color: #00c9a0;
          color: #00c9a0;
        }
        .mobile-sheet-grid-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(238, 240, 244, 0.4);
        }
        .mobile-sheet-grid-item.active .mobile-sheet-grid-label {
          color: #00c9a0;
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
        <div className="mobile-sheet-grid">
          {MENU_ITEMS.map(({ label, href }) => {
            const active = isActive(pathname, href);
            const baseColor = active ? "#00c9a0" : "rgba(238,240,244,0.4)";
            const iconBoxStyle: React.CSSProperties = {
              width: 56,
              height: 56,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: active ? "rgba(0,201,160,0.12)" : "rgba(255,255,255,0.05)",
              border: active ? "1px solid #00c9a0" : "1px solid rgba(255,255,255,0.08)",
              color: baseColor,
            };
            const labelStyle: React.CSSProperties = {
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: baseColor,
            };
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSheetOpen(false)}
                className={`mobile-sheet-grid-item ${active ? "active" : ""}`}
                style={{
                  textDecoration: "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  minHeight: 72,
                }}
              >
                <div className="mobile-sheet-grid-icon" style={iconBoxStyle}>
                  {label === "Home" && (
                    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
                      <path
                        d="M4 11.5L12 4l8 7.5M6.5 10v8.5a1 1 0 0 0 1 1H16.5a1 1 0 0 0 1-1V10"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  )}
                  {label === "Programme" && (
                    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
                      <rect x="4" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
                      <rect x="14" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
                      <rect x="4" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
                      <rect x="14" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
                    </svg>
                  )}
                  {label === "Calendar" && (
                    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
                      <rect x="3.5" y="5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" />
                      <path d="M8 3.5V7M16 3.5V7M4 10.5h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <rect x="7" y="12.5" width="3" height="3" rx="0.6" stroke="currentColor" strokeWidth="1.4" fill="none" />
                      <rect x="12" y="12.5" width="3" height="3" rx="0.6" stroke="currentColor" strokeWidth="1.4" fill="none" />
                    </svg>
                  )}
                  {label === "Performance" && (
                    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
                      <path
                        d="M5 19v-5M10 19v-9M15 19V7M20 19v-3"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                      <path
                        d="M4 19.5h16"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  {label === "Nutrition" && (
                    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
                      <path
                        d="M6 18c3 0 7-3 9-9-3 0-7 3-9 9Zm7.5-7.5c.5 3 1.5 5 3.5 7.5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                      <path
                        d="M5 5.5c1.5 0 3 .5 4 1.5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                  {label === "Strategy" && (
                    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
                      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.6" fill="none" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" fill="none" />
                      <path d="M12 5v2M12 17v2M5 12h2M17 12h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  )}
                  {label === "Check-In" && (
                    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
                      <rect x="5" y="3.5" width="14" height="17" rx="2" stroke="currentColor" strokeWidth="1.6" fill="none" />
                      <path d="M9 7h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                      <path d="M9 11l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {label === "Settings" && (
                    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
                      <path
                        d="M10.2 4.5h3.6l.6 2.1 1.9.8 1.9-1.2 2.1 2.1-1.2 1.9.8 1.9 2.1.6v3.6l-2.1.6-.8 1.9 1.2 1.9-2.1 2.1-1.9-1.2-1.9.8-.6 2.1h-3.6l-.6-2.1-1.9-.8-1.9 1.2-2.1-2.1 1.2-1.9-.8-1.9L2.5 15v-3.6l2.1-.6.8-1.9-1.2-1.9 2.1-2.1 1.9 1.2 1.9-.8.6-2.1Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" fill="none" />
                    </svg>
                  )}
                </div>
                <span className="mobile-sheet-grid-label" style={labelStyle}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
