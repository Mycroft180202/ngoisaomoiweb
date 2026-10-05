"use client";

import { useCms } from "../cms/CmsProvider";

export default function AnnouncementTicker() {
  const { config } = useCms();
  const ticker = config.ticker;
  if (!ticker?.enabled || !ticker.items?.length) return null;
  const content = [...ticker.items, ...ticker.items];
  return (
    <div className="announcement-ticker" style={{ background: ticker.background, color: ticker.color }} aria-label="Thông báo">
      <div className="announcement-ticker__track" style={{ animationDuration: `${ticker.speed_seconds || 28}s` }}>
        {content.map((item, index) => <a key={`${item.label}-${index}`} href={item.url || "#"}><span>✦</span>{item.label}</a>)}
      </div>
    </div>
  );
}
