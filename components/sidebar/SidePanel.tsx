"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAdmin, useAuth } from "@/lib/auth";

type NavItem = {
  href: string;
  label: string;
  iconSrc?: string;
  icon?: React.ReactNode;
  adminOnly?: boolean;
};

export default function SidePanel({ type }: { type: string }) {
  const { user, signOut } = useAuth();
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [hamburgerOpen, setHamburgerOpen] = useState(false);

  const closeHamburger = () => {
    setHamburgerOpen(false);
    document.body.classList.remove("hamburger-open");
  };
  const openHamburger = () => {
    setHamburgerOpen(true);
    document.body.classList.add("hamburger-open");
  };

  useEffect(() => {
    return () => document.body.classList.remove("hamburger-open");
  }, []);

  const items: NavItem[] = [
    {
      href: `/${type}/performance`,
      label: "Performance",
      iconSrc: "/assets/Performance_Icon.png",
    },
    {
      href: `/${type}/maintenance`,
      label: "Maintenance",
      adminOnly: true,
      icon: (
        <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M9.6 2.4a2.5 2.5 0 0 0-3.18 3.18L2.4 9.6a.85.85 0 0 0 1.2 1.2l4.02-4.02A2.5 2.5 0 0 0 9.6 2.4Zm-.7 1.4-1 1L7 4l.5-1 1 .8Z"
            stroke="currentColor"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    { href: `/${type}/scans`, label: "Scans", iconSrc: "/assets/Scan_Icon.png", adminOnly: true },
    {
      href: `/${type}/stations`,
      label: "Stations",
      iconSrc: "/assets/Stations_Icon.png",
      adminOnly: true,
    },
    {
      href: `/${type}/partners`,
      label: "Partners",
      iconSrc: "/assets/Partners_Icon.png",
      adminOnly: true,
    },
    {
      href: `/${type}/pos-test`,
      label: "POS Test",
      adminOnly: true,
      icon: (
        <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="2" width="10" height="8" rx="1.25" stroke="currentColor" strokeWidth="1.2" />
          <path
            d="M3.25 5.25h5.5M3.25 7.25h3.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

  const visible = items.filter((item) => !item.adminOnly || isAdmin(user));

  function handleNavClick(href: string) {
    closeHamburger();
    router.push(href);
  }

  return (
    <aside className="side-panel">
      <div className="side-panel-header">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/CUUB_Logo.png" alt="CUUB" className="side-panel-logo" />
        <button
          type="button"
          className={"hamburger-btn" + (hamburgerOpen ? " open" : "")}
          aria-label="Menu"
          onClick={() => (hamburgerOpen ? closeHamburger() : openHamburger())}
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </div>
      <div className="side-panel-separator" />
      <div className={"hamburger-menu" + (hamburgerOpen ? " open" : "")}>
        <nav className="side-panel-nav">
          {visible.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "active" : ""}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.href);
                }}
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon ? (
                    item.icon
                  ) : item.iconSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.iconSrc} alt="" />
                  ) : null}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="side-panel-nav-trailing-rule" aria-hidden="true" />
        <div className="side-panel-footer">
          <a
            href="/login"
            className="logout"
            onClick={(e) => {
              e.preventDefault();
              closeHamburger();
              signOut();
            }}
          >
            Log out
          </a>
        </div>
      </div>
    </aside>
  );
}
