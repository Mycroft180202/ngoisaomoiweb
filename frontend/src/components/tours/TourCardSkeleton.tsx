"use client";

import React from "react";

export function TourCardSkeleton() {
  return (
    <article className="tour-card surface-panel animate-pulse" style={{ pointerEvents: "none", display: "flex", flexDirection: "column", height: "100%" }}>
      <div 
        className="tour-card__image" 
        style={{ 
          position: "relative", 
          height: "220px", 
          background: "linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
          borderTopLeftRadius: "1rem",
          borderTopRightRadius: "1rem"
        }} 
      />
      <div className="tour-card__body" style={{ display: "flex", flexDirection: "column", gap: "0.85rem", padding: "1.25rem", flexGrow: 1 }}>
        <div className="tour-card__row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ width: "5.5rem", height: "1.25rem", borderRadius: "9999px", background: "#cbd5e1" }} />
          <span style={{ width: "3.5rem", height: "1.1rem", borderRadius: "0.25rem", background: "#cbd5e1" }} />
        </div>
        <div style={{ width: "90%", height: "1.4rem", borderRadius: "0.35rem", background: "#cbd5e1", marginTop: "0.25rem" }} />
        <div style={{ width: "60%", height: "1rem", borderRadius: "0.25rem", background: "#e2e8f0" }} />
        <div className="tour-card__meta" style={{ marginTop: "auto", paddingTop: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)" }}>
          <span style={{ width: "6rem", height: "1.5rem", borderRadius: "0.35rem", background: "#cbd5e1" }} />
          <span style={{ width: "4.5rem", height: "2.1rem", borderRadius: "0.5rem", background: "#cbd5e1" }} />
        </div>
      </div>
    </article>
  );
}
