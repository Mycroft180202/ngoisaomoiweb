"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCms } from "@/components/cms/CmsProvider";
import { cleanPhone, getV2Navigation } from "./v2Navigation";

export default function V2DesktopHeader() {
  const pathname = usePathname();
  const { config, menus } = useCms();
  const navItems = getV2Navigation(menus);
  const identity = config.identity || {};
  const hotline = identity.hotline || "0367.535.688";
  const [displayName, setDisplayName] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isCurrent = (href: string) => href !== "/" && !href.includes("#") && pathname?.startsWith(href.split("?")[0]);

  useEffect(() => {
    let cancelled = false;
    const updateUser = async () => {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        if (!cancelled) {
          setIsAuthenticated(false);
          setDisplayName("");
        }
        return;
      }

      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${apiBase}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Phiên đăng nhập không còn hợp lệ");
        const user = await response.json() as { full_name?: string };
        if (!cancelled) {
          setIsAuthenticated(true);
          setDisplayName(user.full_name || localStorage.getItem("admin_name") || "");
        }
      } catch {
        // An expired/invalid token must not make the account button point to Profile.
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_email");
        localStorage.removeItem("admin_name");
        localStorage.removeItem("admin_is_admin");
        localStorage.removeItem("admin_avatar_url");
        if (!cancelled) {
          setIsAuthenticated(false);
          setDisplayName("");
        }
      }
    };
    updateUser();
    window.addEventListener("auth-state-change", updateUser);
    return () => {
      cancelled = true;
      window.removeEventListener("auth-state-change", updateUser);
    };
  }, []);

  return (
    <header className="v2-site-header v2-site-header--desktop">
      <div className="v2-container v2-site-header__inner">
        <Link className="v2-site-logo" href="/" aria-label={`Về trang chủ ${identity.site_name || "New Star Tour"}`}>
          {/* Logo URL is managed by CMS and may use the media server configured by admin. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={identity.logo_url || "/Logo.png"} alt={identity.site_name || "New Star Tour"} width={220} height={72} />
        </Link>

        <nav className="v2-site-nav" aria-label="Điều hướng chính">
          {navItems.map((item) => (
            <Link key={`${item.label}-${item.href}`} href={item.href} className={isCurrent(item.href) ? "is-active" : ""}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="v2-site-header__actions">
          <a className="v2-site-hotline" href={`tel:${cleanPhone(hotline)}`} aria-label={`Gọi tư vấn ${hotline}`}>
            <span aria-hidden="true">◌</span>
            <small>Tư vấn hành trình</small>
            <strong>{hotline}</strong>
          </a>
          <Link
            className="v2-site-account"
            href={isAuthenticated ? "/profile" : "/login"}
            aria-label={isAuthenticated ? `Mở hồ sơ ${displayName || "của tôi"}` : "Đăng nhập"}
          >
            <span aria-hidden="true">◉</span>
            <b>{isAuthenticated ? "Tài khoản" : "Đăng nhập"}</b>
          </Link>
          <Link className="v2-site-book" href="/tours">Đặt tour <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </header>
  );
}
