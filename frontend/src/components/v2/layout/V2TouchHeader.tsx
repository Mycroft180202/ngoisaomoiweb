"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCms } from "@/components/cms/CmsProvider";
import { cleanPhone, getV2Navigation } from "./v2Navigation";

export default function V2TouchHeader() {
  const { config, menus } = useCms();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navItems = getV2Navigation(menus);
  const identity = config.identity || {};
  const hotline = identity.hotline || "0367.535.688";

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

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header className="v2-site-header v2-site-header--touch">
      <div className="v2-site-header__touchbar">
        <Link className="v2-site-logo" href="/" aria-label={`Về trang chủ ${identity.site_name || "New Star Tour"}`}>
          {/* Logo URL is managed by CMS and may use the media server configured by admin. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={identity.logo_url || "/Logo.png"} alt={identity.site_name || "New Star Tour"} width={175} height={58} />
        </Link>
        <div className="v2-site-header__touch-actions">
          <a className="v2-touch-call" href={`tel:${cleanPhone(hotline)}`} aria-label={`Gọi tư vấn ${hotline}`}>⌕</a>
          <button type="button" className={`v2-menu-toggle ${open ? "is-open" : ""}`} onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="v2-touch-navigation">
            <i /><i />
            <span className="sr-only">{open ? "Đóng menu" : "Mở menu"}</span>
          </button>
        </div>
      </div>

      <div className={`v2-touch-menu ${open ? "is-open" : ""}`} id="v2-touch-navigation" aria-hidden={!open}>
        <div className="v2-touch-menu__top">
          <span>NEW STAR TOUR</span>
          <button type="button" onClick={() => setOpen(false)} aria-label="Đóng menu">×</button>
        </div>
        <nav aria-label="Điều hướng chính trên điện thoại">
          {navItems.map((item, index) => (
            <Link key={`${item.label}-${item.href}`} href={item.href} onClick={() => setOpen(false)}>
              <small>0{index + 1}</small><span>{item.label}</span><b aria-hidden="true">↗</b>
            </Link>
          ))}
        </nav>
        <div className="v2-touch-menu__footer">
          <a href={`tel:${cleanPhone(hotline)}`}><span>Hotline tư vấn</span><strong>{hotline}</strong></a>
          <Link
            href={isAuthenticated ? "/profile" : "/login"}
            onClick={() => setOpen(false)}
            aria-label={isAuthenticated ? `Mở hồ sơ ${displayName || "của tôi"}` : "Đăng nhập hoặc đăng ký"}
          >
            {isAuthenticated ? "Hồ sơ của tôi" : "Đăng nhập / Đăng ký"}
          </Link>
          <Link className="v2-touch-menu__cta" href="/tours" onClick={() => setOpen(false)}>Khám phá tour <span>↗</span></Link>
        </div>
      </div>
    </header>
  );
}
