"use client";

import Link from "next/link";

function NavTab({
  href,
  label,
  pathname,
}: {
  href: string;
  label: string;
  pathname: string;
}) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={active ? "active" : undefined}
      style={{
        fontSize: 14,
        opacity: active ? 1 : 0.6,
        borderBottom: active ? "2px solid #2F80ED" : "2px solid transparent",
        paddingBottom: 4,
        cursor: "pointer",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {label}
    </Link>
  );
}

export default function ProgrammeNavBar({ pathname }: { pathname: string }) {
  return (
    <nav className="programmeNav">
      <div className="programmeBrand">PERFORMANCE PATHFINDER OS</div>
      <div className="programmeTabs">
        <NavTab href="/profile" label="Dashboard" pathname={pathname} />
        <NavTab href="/programme" label="Programme" pathname={pathname} />
        <NavTab href="/tactical" label="Tactical" pathname={pathname} />
        <NavTab href="/tactical/input" label="Daily Input" pathname={pathname} />
        <NavTab href="/tactical/radar" label="Radar" pathname={pathname} />
        <NavTab href="/tactical/map" label="Readiness Map" pathname={pathname} />
        <NavTab href="/tactical/command" label="Command Readiness" pathname={pathname} />
        <NavTab href="/nutrition" label="Nutrition" pathname={pathname} />
        <NavTab href="/strategy" label="Strategy" pathname={pathname} />
        <NavTab href="/benchmarks" label="Benchmarks" pathname={pathname} />
        <NavTab href="/settings" label="Settings" pathname={pathname} />
      </div>
    </nav>
  );
}
