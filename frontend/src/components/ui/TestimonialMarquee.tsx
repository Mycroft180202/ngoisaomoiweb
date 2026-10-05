"use client";
 
import { useState, useEffect } from "react";
import Image from "next/image";
import { getDriveThumbnailUrl } from "@/utils/image";

export function TestimonialMarquee() {
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/testimonials/")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (data && data.length > 0) {
          const active = data.filter((t: any) => t.is_active !== false);
          setList(active);
        }
      })
      .catch((err) => console.error("Error fetching testimonials:", err));
  }, []);

  if (list.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
        Đang cập nhật đánh giá từ khách hàng...
      </div>
    );
  }

  return (
    <div className="testimonial-grid">
      {list.map((item, index) => {
        const author = item.customer_name;
        const role = item.customer_role || "Khách hàng";
        const quote = item.comment;
        const rawAvatar = item.avatar_url;
        const avatar = rawAvatar ? (getDriveThumbnailUrl(rawAvatar) || rawAvatar) : "";

        return (
          <blockquote className="testimonial-card surface-panel" key={`${author}-${index}`}>
            <span className="testimonial-card__eyebrow">Khách hàng</span>
            <p>“{quote}”</p>
            <footer className="testimonial-card__footer">
              <div className="testimonial-card__user">
                {avatar ? (
                  <div className="testimonial-card__avatar">
                    <img 
                      src={avatar} 
                      alt={author} 
                      width={40} 
                      height={40} 
                      style={{ borderRadius: "50%", objectFit: "cover" }}
                    />
                  </div>
                ) : (
                  <div 
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      backgroundColor: "var(--accent-soft)",
                      color: "var(--accent-dark)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      fontSize: "0.9rem"
                    }}
                  >
                    {author ? author[0].toUpperCase() : "K"}
                  </div>
                )}
                <div className="testimonial-card__meta-info">
                  <strong>{author}</strong>
                  <span>{role}</span>
                </div>
              </div>
            </footer>
          </blockquote>
        );
      })}
    </div>
  );
}
