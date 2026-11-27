"use client";

import { LogoIcon } from "@/assets/netmifi";
import { Button } from "@/components/ui/button";
import { Gamepad2, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const LANDING_LINKS = [
  { label: "Game Modes", href: "#modes" },
  { label: "Leaderboard", href: "#leaderboard" },
  { label: "Tournaments", href: "#rewards" },
];

export function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex min-w-0 items-center gap-2.5 sm:gap-3"
          >
            <LogoIcon className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
            <span className="truncate font-game text-sm font-bold tracking-tight text-foreground sm:text-xl">
              NETMIFI <span className="text-primary">QUIZ ARENA</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            {LANDING_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">
                <Gamepad2 className="size-4" />
                Play Now
              </Button>
            </Link>
          </div>

          {/* Mobile Hamburger Menu Button (Three Lines Icon) */}
          <div className="flex items-center gap-2 md:hidden">
            <Link href="/register">
              <Button size="sm" className="gap-1.5 px-2.5 text-xs">
                <Gamepad2 className="size-3.5" />
                Play
              </Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
              className="size-9"
            >
              {mobileMenuOpen ? (
                <X className="size-5 text-foreground" />
              ) : (
                <Menu className="size-5 text-foreground" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen ? (
          <nav
            aria-label="Mobile navigation"
            className="border-t border-border/60 bg-background/98 px-4 pt-2 pb-4 shadow-lg md:hidden"
          >
            <div className="flex flex-col gap-1">
              {LANDING_LINKS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  {item.label}
                </a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full"
                >
                  <Button variant="outline" size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full"
                >
                  <Button size="sm" className="w-full gap-1.5">
                    <Gamepad2 className="size-4" />
                    Play Now
                  </Button>
                </Link>
              </div>
            </div>
          </nav>
        ) : null}
      </header>
      <div className="h-16 w-full shrink-0" aria-hidden="true" />
    </>
  );
}
