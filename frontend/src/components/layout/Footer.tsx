"use client";

import Link from "next/link";
import { useCms } from "../cms/CmsProvider";

export default function Footer() {
  const { config } = useCms();
  const identity = config.identity || {};
  const footer = config.footer || {};
  const quickLinks = footer.quick_links?.length ? footer.quick_links : [
    { label: "Tất cả tour", url: "/tours" }, { label: "Tour trong nước", url: "/tours?type=domestic" },
    { label: "Tour nước ngoài", url: "/tours?type=international" }, { label: "Tin tức mới nhất", url: "/news" },
  ];
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Link className="brand-logo brand-logo--footer" href="/">
            <img src={identity.footer_logo_url || identity.logo_url || "/Logo.png"} alt={identity.site_name || "New Star Tour Logo"} width={260} height={78} style={{ objectFit: "contain" }} />
          </Link>
          <p>
            {footer.description || "Công ty cổ phần Tập đoàn Ngôi Sao Mới — dịch vụ uy tín, đồng hành cùng bạn trên mọi nẻo đường hành trình."}
          </p>
          <div className="footer-socials">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Facebook">
              <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z" />
              </svg>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="Instagram">
              <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204 0.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="social-link" aria-label="TikTok">
              <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.97 1.2 2.37 1.93 3.93 2.06v3.83c-1.85-.02-3.67-.6-5.18-1.68-.26-.18-.5-.38-.73-.6v7.71c.06 1.76-.43 3.52-1.42 4.96-1 1.45-2.49 2.5-4.18 2.94-1.7.45-3.52.28-5.12-.49-1.6-.77-2.86-2.12-3.57-3.79-.8-1.9-.84-4.08-.1-6 .73-1.92 2.22-3.48 4.1-4.27 1.34-.56 2.8-.76 4.23-.58v3.91c-.88-.22-1.83-.11-2.64.31-.8.42-1.42 1.13-1.74 1.99-.36.96-.3 2.04.16 2.94.46.9 1.28 1.56 2.27 1.8 1 .24 2.06.07 2.94-.49.88-.56 1.49-1.5 1.68-2.53.07-.37.09-.76.08-1.14v-15.3z" />
              </svg>
            </a>
          </div>
        </div>
        <div>
          <h4>Khám phá</h4>
          {quickLinks.map((item) => item.url.startsWith("/") ? <Link key={item.label} href={item.url}>{item.label}</Link> : <a key={item.label} href={item.url} target="_blank" rel="noopener noreferrer">{item.label}</a>)}
        </div>
        <div>
          <h4>Hỗ trợ & Liên hệ</h4>
          <a href={`mailto:${identity.email || "sales@newstartour.vn"}`}>{identity.email || "sales@newstartour.vn"}</a>
          <a href={`tel:${(identity.hotline || "0367535688").replace(/[^0-9]/g, "")}`}>Hotline: {identity.hotline || "0367.535.688"}</a>
          {identity.address && <span>{identity.address}</span>}
          {footer.external_links?.map((item) => <a key={item.label} href={item.url} target="_blank" rel="noopener noreferrer">{item.label}</a>)}
          <Link href="/contact">Địa chỉ chi nhánh</Link>
        </div>
      </div>
      <div className="container" style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid rgba(255, 255, 255, 0.1)", textAlign: "center", fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.6)" }}>
        <p>{footer.copyright || `© ${new Date().getFullYear()} ${identity.site_name || "New Star Tour"}. All rights reserved.`}</p>
      </div>
    </footer>
  );
}
