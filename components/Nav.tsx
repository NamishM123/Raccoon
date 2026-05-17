"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "./Container";
import { Logo } from "./Logo";
import { cn } from "@/lib/cn";

const TOOL_LINKS = [
  { href: "/places", label: "Your Profile" },
  { href: "/document", label: "Previsit Card" },
  { href: "/analysis", label: "After Visit" },
  { href: "/trajectory", label: "Data Trajectory" },
  { href: "/continuity", label: "Lab Check" },
  { href: "/map", label: "Care Map" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 glass-nav">
      <Container>
        <nav className="flex h-20 items-center justify-between gap-6">
          <Link
            href="/"
            aria-label="Seagull, home"
            className="flex items-center text-sea-ink"
          >
            <Logo size={72} />
            <span className="font-display font-medium text-[28px] leading-none tracking-tight -ml-1">
              Seagull
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {TOOL_LINKS.map((l) => (
              <NavLink key={l.href} href={l.href} active={pathname === l.href}>
                {l.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </Container>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "px-3 py-2 text-[16px] font-bold rounded-btn transition-colors",
        active
          ? "bg-white/80 text-black shadow-[inset_0_0_0_1px_rgba(15,42,61,0.08)]"
          : "text-black/80 hover:text-black hover:bg-white/55"
      )}
    >
      {children}
    </Link>
  );
}
