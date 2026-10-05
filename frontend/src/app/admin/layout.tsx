"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminRole, setAdminRole] = useState("editor");

  // Accordion open/close states
  const [isTourMenuOpen, setIsTourMenuOpen] = useState(false);
  const [isNewsMenuOpen, setIsNewsMenuOpen] = useState(false);
  const [isInterfaceMenuOpen, setIsInterfaceMenuOpen] = useState(false);
  const [isOthersMenuOpen, setIsOthersMenuOpen] = useState(false);
  const [isAdvancedMenuOpen, setIsAdvancedMenuOpen] = useState(false);
  const [isConfigMenuOpen, setIsConfigMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const email = localStorage.getItem("admin_email");

    if (!token || !email) {
      router.push("/admin-login");
      return;
    }

    const verifyAdmin = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiBase}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.is_admin) {
            const role = data.role || "editor";
            
            const saleAllowedRoutes = [
              "/admin", "/admin/profile", "/admin/tours", "/admin/bookings",
              "/admin/contacts", "/admin/payment-transactions", "/admin/sale-guide", "/admin/change-password",
            ];
            const isSaleRouteAllowed = saleAllowedRoutes.includes(pathname);

            // Check page authorization based on role
            const isSuperAdminOnly = pathname.startsWith("/admin/users-") || pathname.startsWith("/admin/config-");
            const isManagerOrSuperAdminOnly = pathname.startsWith("/admin/menus") || pathname.startsWith("/admin/slides") || pathname.startsWith("/admin/banners") || pathname.startsWith("/admin/media") || pathname.startsWith("/admin/settings") || pathname.startsWith("/admin/maintenance");
            
            if (isSuperAdminOnly && role !== "super_admin") {
              console.warn("Access denied for route:", pathname);
              router.push("/admin");
              return;
            }
            if (isManagerOrSuperAdminOnly && !["super_admin", "manager"].includes(role)) {
              console.warn("Access denied for route:", pathname);
              router.push("/admin");
              return;
            }
            if (role === "sale" && !isSaleRouteAllowed) {
              console.warn("Sale access denied for route:", pathname);
              router.replace("/admin");
              return;
            }
            if (data.must_change_password && pathname !== "/admin/change-password") {
              router.replace("/admin/change-password");
              return;
            }
            if (!data.must_change_password && pathname === "/admin/change-password") {
              router.replace("/admin");
              return;
            }
            
            setAuthorized(true);
            setAdminEmail(data.email);
            setAdminRole(role);
          } else {
            console.warn("Unauthorized access: User is not an admin.");
            router.push("/");
          }
        } else {
          router.push("/admin-login");
        }
      } catch (err) {
        console.error("Error verifying admin status:", err);
        router.push("/admin-login");
      }
    };

    verifyAdmin();
  }, [router, pathname]);

  // Auto-expand relevant accordion based on active pathname
  useEffect(() => {
    if (pathname.startsWith("/admin/tours")) {
      setIsTourMenuOpen(true);
    } else if (
      pathname.startsWith("/admin/news") ||
      pathname.startsWith("/admin/news-categories") ||
      pathname.startsWith("/admin/news-tags")
    ) {
      setIsNewsMenuOpen(true);
    } else if (
      pathname.startsWith("/admin/menus") ||
      pathname.startsWith("/admin/slides") ||
      pathname.startsWith("/admin/banners") ||
      pathname.startsWith("/admin/media") ||
      pathname.startsWith("/admin/settings")
      || pathname.startsWith("/admin/maintenance")
    ) {
      setIsInterfaceMenuOpen(true);
    } else if (
      pathname.startsWith("/admin/offices") ||
      pathname.startsWith("/admin/contacts") ||
      pathname.startsWith("/admin/payments") ||
      pathname.startsWith("/admin/banks") ||
      pathname.startsWith("/admin/testimonials") ||
      pathname.startsWith("/admin/payment-transactions")
    ) {
      setIsOthersMenuOpen(true);
    } else if (pathname.startsWith("/admin/users-") || pathname.startsWith("/admin/roles")) {
      setIsAdvancedMenuOpen(true);
    } else if (pathname.startsWith("/admin/config-")) {
      setIsConfigMenuOpen(true);
    }
  }, [pathname]);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_email");
    window.dispatchEvent(new Event("auth-state-change"));
    router.push("/admin-login");
  };

  if (!authorized) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <p>Đang kiểm tra quyền truy cập...</p>
      </div>
    );
  }

  const tourSubItems = [
    { label: "✈️ Tour du lịch", href: "/admin/tours" },
    { label: "📍 Tỉnh / Thành phố", href: "/admin/tours/provinces" },
    { label: "🌏 Quốc gia", href: "/admin/tours/countries" },
    { label: "⏱️ Thời gian tour", href: "/admin/tours/durations" },
    { label: "🗺️ Địa điểm du lịch", href: "/admin/tours/attractions" },
    { label: "⭐ Đánh giá tour du lịch", href: "/admin/tours/reviews" },
    { label: "🎟️ Mã giảm giá", href: "/admin/tours/discounts" },
    { label: "👤 Thông tin hướng dẫn viên", href: "/admin/tours/guides" },
    { label: "📁 Danh mục tour", href: "/admin/tours/categories" },
    { label: "🏷️ Tag tour", href: "/admin/tours/tags" },
    { label: "🔍 Tìm nhanh trang chủ", href: "/admin/tours/quick-search" },
  ].filter((item) => {
    if (adminRole === "sale") {
      return item.href === "/admin/tours";
    }
    if (adminRole === "support") {
      return false;
    }
    return true;
  });

  const newsSubItems = [
    { label: "📁 Danh mục tin tức", href: "/admin/news-categories" },
    { label: "📰 Tin tức", href: "/admin/news" },
    { label: "🏷️ Tag tin tức", href: "/admin/news-tags" },
  ].filter(() => {
    if (["sale", "support"].includes(adminRole)) {
      return false;
    }
    return true;
  });

  const interfaceSubItems = [
    { label: "📋 Menu điều hướng", href: "/admin/menus" },
    { label: "🖼️ Slide ảnh", href: "/admin/slides" },
    { label: "📢 Quảng cáo", href: "/admin/banners" },
    { label: "🗂️ Quản lý Media", href: "/admin/media" },
    { label: "🎨 Cấu hình giao diện", href: "/admin/settings" },
    { label: "🚧 Chế độ bảo trì", href: "/admin/maintenance" },
  ].filter(() => {
    if (["sale", "support"].includes(adminRole)) {
      return false;
    }
    return true;
  });

  const othersSubItems = [
    { label: "🏢 Văn phòng đại diện", href: "/admin/offices" },
    { label: "📞 Liên hệ đặt tour", href: "/admin/contacts" },
    { label: "💳 Các hình thức thanh toán", href: "/admin/payments" },
    { label: "🏦 Ngân hàng", href: "/admin/banks" },
    { label: "ℹ️ Thông tin liên hệ", href: "/admin/config-general" },
    { label: "📝 Khách hàng đặt tour", href: "/admin/bookings" },
    { label: "💬 Cảm nhận khách hàng", href: "/admin/testimonials" },
    { label: "💸 Giao dịch thanh toán", href: "/admin/payment-transactions" },
  ].filter((item) => {
    if (adminRole === "sale") {
      return ["📝 Khách hàng đặt tour", "📞 Liên hệ đặt tour", "💸 Giao dịch thanh toán"].includes(item.label);
    }
    if (adminRole === "support") {
      return ["📝 Khách hàng đặt tour", "📞 Liên hệ đặt tour", "💬 Cảm nhận khách hàng"].includes(item.label);
    }
    return true;
  });

  const advancedSubItems = [
    { label: "👥 Tài khoản khách hàng", href: "/admin/users-customers" },
    { label: "👤 Tài khoản quản trị", href: "/admin/users-admins" },
  ].filter(() => adminRole === "super_admin");

  const configSubItems = [
    { label: "🧩 CMS Website", href: "/admin/config-site" },
    { label: "🖥️ Phiên bản giao diện", href: "/admin/config-ui-version" },
    { label: "📧 Cấu hình email", href: "/admin/config-email" },
    { label: "⚙️ Cấu hình chung", href: "/admin/config-general" },
    { label: "💻 Cấu hình Tech", href: "/admin/config-tech" },
    { label: "🔗 Quick Links", href: "/admin/config-links" },
  ].filter(() => adminRole === "super_admin");

  const renderAccordion = (
    title: string,
    isOpen: boolean,
    setIsOpen: (val: boolean) => void,
    subItems: { label: string; href: string }[],
    activePrefix: string
  ) => {
    if (subItems.length === 0) return null;
    const isChildActive = pathname.startsWith(activePrefix) || subItems.some(sub => pathname === sub.href);
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`menu-item ${isChildActive ? "active" : ""}`}
          style={{
            width: "100%",
            textAlign: "left",
            background: isChildActive ? "linear-gradient(135deg, var(--accent), var(--accent-dark))" : "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <span>{title}</span>
          <span style={{ fontSize: "0.75rem", transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
        </button>
        {isOpen && (
          <div style={{ display: "flex", flexDirection: "column", paddingLeft: "1rem", gap: "0.25rem", marginTop: "0.25rem" }}>
            {subItems.map((subItem) => {
              const isSubActive = pathname === subItem.href;
              return (
                <Link
                  key={subItem.href}
                  href={subItem.href}
                  className={`menu-item ${isSubActive ? "active" : ""}`}
                  style={{
                    fontSize: "0.82rem",
                    padding: "0.6rem 0.8rem",
                    background: isSubActive ? "rgba(255, 255, 255, 0.08)" : "transparent",
                    boxShadow: "none"
                  }}
                >
                  {subItem.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="admin-layout">
      {/* Sidebar Panel */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h3>StarTour CMS</h3>
          <p className="admin-badge">
            {adminRole === "super_admin" ? "Super Admin" :
             adminRole === "manager" ? "Manager" :
             adminRole === "sale" ? "Sale Agent" :
             adminRole === "support" ? "Support Agent" : "Editor"}
          </p>
        </div>

        <Link href="/admin/profile" className="admin-profile-box" style={{ cursor: "pointer", display: "flex", textDecoration: "none" }}>
          <div className="avatar">👤</div>
          <div className="profile-info">
            <span className="name">{adminEmail.split("@")[0]}</span>
            <span className="email" title={adminEmail}>{adminEmail}</span>
          </div>
        </Link>

        <nav className="sidebar-menu" aria-label="Admin Navigation">
          <Link href="/admin" className={`menu-item ${pathname === "/admin" ? "active" : ""}`}>
            📊 Bảng điều khiển
          </Link>

          {renderAccordion("✈️ Quản lý Tour", isTourMenuOpen, setIsTourMenuOpen, tourSubItems, "/admin/tours")}
          {renderAccordion("📰 Tin tức", isNewsMenuOpen, setIsNewsMenuOpen, newsSubItems, "/admin/news")}
          {renderAccordion("🖥️ Giao diện", isInterfaceMenuOpen, setIsInterfaceMenuOpen, interfaceSubItems, "/admin/menus")}
          {renderAccordion("⚙️ Phân hệ Khác", isOthersMenuOpen, setIsOthersMenuOpen, othersSubItems, "/admin/offices")}
          {renderAccordion("🛡️ Nâng cao", isAdvancedMenuOpen, setIsAdvancedMenuOpen, advancedSubItems, "/admin/users-")}
          {renderAccordion("🔧 Cấu hình", isConfigMenuOpen, setIsConfigMenuOpen, configSubItems, "/admin/config-")}

          <Link href="/admin/profile" className={`menu-item ${pathname === "/admin/profile" ? "active" : ""}`}>
            👤 Hồ sơ cá nhân
          </Link>
          <Link href="/admin/sale-guide" className={`menu-item ${pathname === "/admin/sale-guide" ? "active" : ""}`}>
            📘 Hướng dẫn tạo Tour
          </Link>
          {(["super_admin", "manager"].includes(adminRole)) && (
            <Link href="/admin/tour-audit" className={`menu-item ${pathname === "/admin/tour-audit" ? "active" : ""}`}>
              🧾 Audit Tour
            </Link>
          )}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="btn-sidebar-logout">
            🚪 Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="admin-main">
        <header className="admin-topbar">
          <h2>
            {pathname === "/admin" && "Bảng điều khiển hệ thống"}
            {pathname.startsWith("/admin/tours") && "Quản lý tour du lịch"}
            {pathname.startsWith("/admin/news") && "Quản lý tin tức cẩm nang"}
            {pathname.startsWith("/admin/news-categories") && "Quản lý danh mục tin tức"}
            {pathname.startsWith("/admin/news-tags") && "Quản lý tag tin tức"}
            {pathname.startsWith("/admin/menus") && "Quản lý menu điều hướng"}
            {pathname.startsWith("/admin/slides") && "Quản lý slide trang chủ"}
            {pathname.startsWith("/admin/banners") && "Quản lý banner quảng cáo"}
            {pathname.startsWith("/admin/media") && "Quản lý Media"}
            {pathname.startsWith("/admin/settings") && "Cấu hình giao diện CMS"}
            {pathname.startsWith("/admin/offices") && "Quản lý văn phòng đại diện"}
            {pathname.startsWith("/admin/contacts") && "Quản lý tin nhắn liên hệ"}
            {pathname.startsWith("/admin/payments") && "Quản lý phương thức thanh toán"}
            {pathname.startsWith("/admin/banks") && "Quản lý tài khoản ngân hàng"}
            {pathname.startsWith("/admin/testimonials") && "Quản lý cảm nhận khách hàng"}
            {pathname.startsWith("/admin/payment-transactions") && "Quản lý giao dịch thanh toán"}
            {pathname.startsWith("/admin/users-customers") && "Quản lý tài khoản khách hàng"}
            {pathname.startsWith("/admin/users-admins") && "Quản lý tài khoản quản trị"}
            {pathname.startsWith("/admin/config-email") && "Cấu hình Email hệ thống"}
            {pathname.startsWith("/admin/config-ui-version") && "Phiên bản giao diện website"}
            {pathname.startsWith("/admin/config-general") && "Cấu hình chung hệ thống"}
            {pathname.startsWith("/admin/config-tech") && "Cấu hình Tech & API"}
            {pathname.startsWith("/admin/config-links") && "Quản lý Quick Links"}
            {pathname === "/admin/profile" && "Hồ sơ thông tin cá nhân"}
            {pathname === "/admin/sale-guide" && "Hướng dẫn nghiệp vụ Sale"}
            {pathname === "/admin/tour-audit" && "Lịch sử thao tác Tour"}
          </h2>
          <div className="topbar-actions">
            <Link href="/" className="btn-view-site" target="_blank">
              🌐 Xem trang chủ
            </Link>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
