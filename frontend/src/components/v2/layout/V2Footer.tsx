"use client";

import Link from "next/link";
import { useCms } from "@/components/cms/CmsProvider";
import { cleanPhone, getV2Navigation } from "./v2Navigation";

export default function V2Footer() {
  const { config, menus } = useCms();
  const identity = config.identity || {};
  const footer = config.footer || {};
  const hotline = identity.hotline || "0367.535.688";
  const navItems = getV2Navigation(menus);

  return (
    <footer className="v2-footer">
      <div className="v2-container v2-footer__grid">
        <div className="v2-footer__brand">
          <Link className="v2-site-logo" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={identity.footer_logo_url || identity.logo_url || "/Logo.png"} alt={identity.site_name || "New Star Tour"} width={220} height={72} />
          </Link>
          <p>{footer.description || "Đồng hành cùng bạn để mỗi chuyến đi trở thành một kỷ niệm đáng giá."}</p>
          <span className="v2-footer__tag">TRAVEL, DESIGNED AROUND YOU</span>
        </div>
        <div className="v2-footer__links">
          <h2>Khám phá</h2>
          {navItems.slice(0, 4).map((item) => <Link key={`${item.label}-${item.href}`} href={item.href}>{item.label}</Link>)}
        </div>
        <div className="v2-footer__links">
          <h2>Hỗ trợ</h2>
          <Link href="/lookup">Tra cứu đơn hàng</Link>
          <Link href="/contact">Liên hệ tư vấn</Link>
          <Link href="/news">Cẩm nang du lịch</Link>
          <Link href="/profile">Tài khoản của tôi</Link>
        </div>
        <div className="v2-footer__contact">
          <span>Hãy nói với chúng tôi về chuyến đi tiếp theo của bạn</span>
          <a href={`tel:${cleanPhone(hotline)}`}><small>Hotline</small><strong>{hotline}</strong></a>
          {identity.email && <a className="v2-footer__email" href={`mailto:${identity.email}`}>{identity.email}</a>}
          {identity.address && <p>{identity.address}</p>}
        </div>
      </div>
      <div className="v2-container v2-footer__bottom"><span>{footer.copyright || `© ${new Date().getFullYear()} New Star Tour.`}</span><span>Designed for meaningful journeys</span></div>
    </footer>
  );
}
