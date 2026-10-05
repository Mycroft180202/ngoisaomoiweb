"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { navigation as fallbackNavigation } from "@/data/travel";
import { useCms } from "../cms/CmsProvider";

export default function Header() {
  const { config, menus } = useCms();
  const pathname = usePathname();
  const router = useRouter();
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [adminUser, setAdminUser] = useState<{ email: string; is_admin: boolean; name?: string; avatar_url?: string | null } | null>(null);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [hotline, setHotline] = useState<string>("0367.535.688");
  const navigation = menus.length ? menus : fallbackNavigation;
  const logoUrl = config.identity?.logo_url || "/Logo.png";
  const displayedHotline = config.identity?.hotline || hotline;

  // Mobile menu states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMobileMain, setExpandedMobileMain] = useState<Record<string, boolean>>({});
  const [expandedMobileSub, setExpandedMobileSub] = useState<Record<string, boolean>>({});

  // Group provinces into domestic regions dynamically
  const domesticRegions = useMemo(() => {
    const north: string[] = [];
    const central: string[] = [];
    const south: string[] = [];

    provinces.forEach(p => {
      if (p.region) {
        if (p.region === "Miền Bắc") north.push(p.name);
        else if (p.region === "Miền Trung") central.push(p.name);
        else if (p.region === "Miền Nam") south.push(p.name);
        else central.push(p.name);
      } else {
        // Fallback to legacy regex
        if (/hà nội|hạ long|quảng ninh|sapa|lào cai|ninh bình|hải phòng|thanh hóa|lạng sơn|điện biên|hà giang|hòa bình/i.test(p.name)) {
          north.push(p.name);
        } else if (/đà nẵng|nha trang|huế|hội an|đà lạt|quy nhơn|phú yên|quảng bình|quảng trị|bình định|tuy hòa|mũi né|nghệ an|hà tĩnh/i.test(p.name)) {
          central.push(p.name);
        } else if (/hồ chí minh|sài gòn|phú quốc|côn đảo|vũng tàu|cần thơ|cà mau|bạc liêu|sóc trăng|miền tây/i.test(p.name)) {
          south.push(p.name);
        } else {
          central.push(p.name);
        }
      }
    });

    return [
      { title: "Miền Bắc", provinces: north },
      { title: "Miền Trung", provinces: central },
      { title: "Miền Nam", provinces: south }
    ];
  }, [provinces]);

  // Group countries into international continents dynamically
  const internationalContinents = useMemo(() => {
    const asia: string[] = [];
    const europe: string[] = [];
    const australia: string[] = [];
    const americasAfrica: string[] = [];

    countries.forEach(c => {
      if (c.continent) {
        if (c.continent === "Châu Á") asia.push(c.name);
        else if (c.continent === "Châu Âu") europe.push(c.name);
        else if (c.continent === "Châu Úc") australia.push(c.name);
        else if (c.continent === "Châu Mỹ - Châu Phi") americasAfrica.push(c.name);
        else asia.push(c.name);
      } else {
        // Fallback to legacy regex
        if (/campuchia|thái lan|singapore|malaysia|indonesia|myanmar|philippines|lào|trung quốc|hongkong|macao|đài loan|hàn quốc|nhật bản|maldives|ấn độ|nepal|bhutan|dubai|abu dhabi/i.test(c.name)) {
          asia.push(c.name);
        } else if (/pháp|bỉ|hà lan|đức|thụy sỹ|ý|ba lan|hungaria|slovakia|áo|séc|nga|anh|hy lạp|thổ nhĩ kỳ/i.test(c.name)) {
          europe.push(c.name);
        } else if (/hoa kỳ|mỹ|canada|cuba|nam phi|ai cập/i.test(c.name)) {
          americasAfrica.push(c.name);
        } else if (/australia|new zealand/i.test(c.name)) {
          australia.push(c.name);
        } else {
          asia.push(c.name);
        }
      }
    });

    return [
      { title: "Châu Á", countries: asia },
      { title: "Châu Âu", countries: europe },
      { title: "Châu Úc", countries: australia },
      { title: "Châu Mỹ - Châu Phi", countries: americasAfrica }
    ];
  }, [countries]);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${apiBase}/api/provinces/`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setProvinces(data))
      .catch((err) => console.error("Error loading provinces:", err));

    fetch(`${apiBase}/api/countries/`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setCountries(data.filter((c: any) => c.slug !== "viet-nam"));
      })
      .catch((err) => console.error("Error loading countries:", err));

    fetch(`${apiBase}/api/settings/config_general`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.value) {
          const val = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          if (val.hotline) {
            setHotline(val.hotline);
          }
        }
      })
      .catch((err) => console.error("Error loading config_general:", err));
  }, []);

  // Disable body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Auto close mobile menu on pathname change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const fetchMe = async () => {
      const token = localStorage.getItem("admin_token");
      const email = localStorage.getItem("admin_email");
      if (!token || !email) {
        setAdminUser(null);
        return;
      }

      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiBase}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAdminUser({
            email: data.email,
            is_admin: data.is_admin,
            name: data.full_name || data.email.split("@")[0],
            avatar_url: data.avatar_url
          });
          localStorage.setItem("admin_is_admin", data.is_admin ? "true" : "false");
          if (data.avatar_url) {
            localStorage.setItem("admin_avatar_url", data.avatar_url);
          } else {
            localStorage.removeItem("admin_avatar_url");
          }
          if (data.full_name) {
            localStorage.setItem("admin_name", data.full_name);
          } else {
            localStorage.removeItem("admin_name");
          }
        } else {
          setAdminUser(null);
        }
      } catch (err) {
        console.error(err);
        // Fallback to local storage email if offline
        setAdminUser({
          email,
          is_admin: localStorage.getItem("admin_is_admin") === "true",
          name: localStorage.getItem("admin_name") || email.split("@")[0],
          avatar_url: localStorage.getItem("admin_avatar_url") || null
        });
      }
    };

    fetchMe();

    const handleAuthChange = () => {
      fetchMe();
    };

    window.addEventListener("auth-state-change", handleAuthChange);
    return () => {
      window.removeEventListener("auth-state-change", handleAuthChange);
    };
  }, []);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_email");
    localStorage.removeItem("admin_is_admin");
    setAdminUser(null);
    window.dispatchEvent(new Event("auth-state-change"));
    router.push("/");
  };

  const toggleCategory = (title: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedCategories((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <header className="site-header">
      <div className="container nav">
        <Link className="brand-logo" href="/">
          <img src={logoUrl} alt={config.identity?.site_name || "New Star Tour Logo"} width={220} height={73} style={{ objectFit: "contain" }} />
        </Link>

        {/* Header Right Content containing Hotline, Auth and Mobile Toggle */}
        <div className="header-right-wrapper">
          {displayedHotline && (
            <a 
              href={`tel:${displayedHotline.replace(/[^0-9]/g, "")}`}
              className="header-hotline"
              title={`Gọi Hotline: ${displayedHotline}`}
            >
              <span style={{ fontSize: "1.1rem" }}>📞</span>
              <div className="header-hotline-text">
                <span style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.02em" }}>Hotline CSKH</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--accent-dark)" }}>{displayedHotline}</span>
              </div>
            </a>
          )}

          <div className="nav-auth">
            {adminUser ? (
              <div className="auth-profile-dropdown">
                <span className="user-email-trigger" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  {adminUser.avatar_url ? (
                    <img
                      src={adminUser.avatar_url}
                      alt={adminUser.name}
                      className="user-avatar"
                      style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        const parent = (e.target as HTMLElement).parentElement;
                        if (parent) {
                          const fallback = parent.querySelector(".avatar-fallback");
                          if (fallback) {
                            (fallback as HTMLElement).style.display = "flex";
                          }
                        }
                      }}
                    />
                  ) : null}
                  
                  {(!adminUser.avatar_url) ? (
                    <span className="avatar-fallback" style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: "var(--accent)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      fontSize: "0.9rem"
                    }}>
                      {(adminUser.name || adminUser.email)[0].toUpperCase()}
                    </span>
                  ) : (
                    <span className="avatar-fallback" style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: "var(--accent)",
                      color: "white",
                      display: "none",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      fontSize: "0.9rem"
                    }}>
                      {(adminUser.name || adminUser.email)[0].toUpperCase()}
                    </span>
                  )}
                  
                  <span className="user-name-text" style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {adminUser.name || adminUser.email.split("@")[0]}
                  </span>
                  <span className="chevron-small">▼</span>
                </span>
                <div className="dropdown-menu-box">
                  {adminUser.is_admin ? (
                    <>
                      <Link href="/admin">📊 Bảng điều khiển</Link>
                      <Link href="/admin/profile">👤 Hồ sơ admin</Link>
                    </>
                  ) : (
                    <>
                      <Link href="/profile">👤 Thông tin cá nhân</Link>
                      <Link href="/profile?tab=bookings">✈️ Tour đã đặt</Link>
                    </>
                  )}
                  <button onClick={handleLogout} className="btn-dropdown-logout">
                    🚪 Đăng xuất
                  </button>
                </div>
              </div>
            ) : (
              <div className="auth-pill-container">
                <Link href="/login" className="auth-pill-btn login">Đăng nhập</Link>
                <div className="auth-pill-divider" />
                <Link href="/register" className="auth-pill-btn register">Đăng ký</Link>
              </div>
            )}
          </div>

          <button
            className={`hamburger-btn ${isMobileMenuOpen ? "active" : ""}`}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Menu"
            type="button"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>

        <nav className="nav-links" aria-label="Primary Nav">
          {navigation.map((item) => {
            const isActive = pathname === item.href.split("?")[0];

            if (item.label === "Du lịch trong nước") {
              return (
                <div key={item.label} className="nav-item-dropdown">
                  <Link 
                    href={item.href}
                    className={`nav-link-main ${isActive ? "active" : ""}`}
                    style={isActive ? { color: "var(--accent-dark)", fontWeight: 700 } : {}}
                  >
                    {item.label} <span className="chevron-icon">▼</span>
                  </Link>
                  <div className="mega-menu">
                    <div className="container mega-menu__grid">
                      {domesticRegions.map((region) => {
                        const isExpanded = !!expandedCategories[region.title];
                        const displayProvinces = isExpanded
                          ? region.provinces
                          : region.provinces.slice(0, 6);

                        return (
                          <div key={region.title} className="mega-menu__col">
                            <h4>{region.title}</h4>
                            <ul className="mega-menu__list">
                              {region.provinces.length > 0 ? (
                                <>
                                  {displayProvinces.map((prov) => (
                                    <li key={prov}>
                                      <Link href={`/tours?query=${encodeURIComponent(prov)}`}>
                                        {prov}
                                      </Link>
                                    </li>
                                  ))}
                                  {region.provinces.length > 6 && (
                                    <li style={{ marginTop: "0.4rem" }}>
                                      <button 
                                        type="button"
                                        onClick={(e) => toggleCategory(region.title, e)}
                                        style={{ 
                                          background: "none", 
                                          border: "none", 
                                          padding: 0, 
                                          font: "inherit",
                                          cursor: "pointer",
                                          color: "var(--accent)", 
                                          fontWeight: 700,
                                          fontSize: "0.85rem",
                                          display: "inline-flex",
                                          alignItems: "center"
                                        }}
                                        className="hover:text-[var(--accent-dark)] transition-colors"
                                      >
                                        {isExpanded ? "Thu gọn ↑" : "Xem thêm →"}
                                      </button>
                                    </li>
                                  )}
                                </>
                              ) : (
                                <li className="empty-text">Đang cập nhật...</li>
                              )}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            if (item.label === "Du lịch nước ngoài") {
              return (
                <div key={item.label} className="nav-item-dropdown">
                  <Link 
                    href={item.href}
                    className={`nav-link-main ${isActive ? "active" : ""}`}
                    style={isActive ? { color: "var(--accent-dark)", fontWeight: 700 } : {}}
                  >
                    {item.label} <span className="chevron-icon">▼</span>
                  </Link>
                  <div className="mega-menu">
                    <div className="container mega-menu__grid">
                      {internationalContinents.map((continent) => {
                        const isExpanded = !!expandedCategories[continent.title];
                        const displayCountries = isExpanded
                          ? continent.countries
                          : continent.countries.slice(0, 6);

                        return (
                          <div key={continent.title} className="mega-menu__col">
                            <h4>{continent.title}</h4>
                            <ul className="mega-menu__list">
                              {continent.countries.length > 0 ? (
                                <>
                                  {displayCountries.map((country) => (
                                    <li key={country}>
                                      <Link href={`/tours?query=${encodeURIComponent(country)}`}>
                                        {country}
                                      </Link>
                                    </li>
                                  ))}
                                  {continent.countries.length > 6 && (
                                    <li style={{ marginTop: "0.4rem" }}>
                                      <button 
                                        type="button"
                                        onClick={(e) => toggleCategory(continent.title, e)}
                                        style={{ 
                                          background: "none", 
                                          border: "none", 
                                          padding: 0, 
                                          font: "inherit",
                                          cursor: "pointer",
                                          color: "var(--accent)", 
                                          fontWeight: 700,
                                          fontSize: "0.85rem",
                                          display: "inline-flex",
                                          alignItems: "center"
                                        }}
                                        className="hover:text-[var(--accent-dark)] transition-colors"
                                      >
                                        {isExpanded ? "Thu gọn ↑" : "Xem thêm →"}
                                      </button>
                                    </li>
                                  )}
                                </>
                              ) : (
                                <li className="empty-text">Đang cập nhật...</li>
                              )}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link 
                key={item.label} 
                href={item.href}
                className={isActive ? "active" : ""}
                style={isActive ? { color: "var(--accent-dark)", fontWeight: 700 } : {}}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      <div className={`mobile-drawer ${isMobileMenuOpen ? "open" : ""}`}>
        <div className="mobile-drawer-header">
          <Link className="brand-logo" href="/" onClick={() => setIsMobileMenuOpen(false)}>
            <img src={logoUrl} alt={config.identity?.site_name || "New Star Tour Logo"} width={140} height={46} style={{ objectFit: "contain" }} />
          </Link>
          <button
            className="mobile-drawer-close"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close Menu"
          >
            ✕
          </button>
        </div>

        <div className="mobile-drawer-content">
          {/* Mobile Auth Block */}
          <div className="mobile-drawer-auth">
            {adminUser ? (
              <div className="mobile-auth-user-card">
                <div className="mobile-auth-user-info">
                  {adminUser.avatar_url ? (
                    <img
                      src={adminUser.avatar_url}
                      alt={adminUser.name}
                      className="user-avatar"
                      style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <span className="avatar-fallback" style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      backgroundColor: "var(--accent)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      fontSize: "1.1rem"
                    }}>
                      {(adminUser.name || adminUser.email)[0].toUpperCase()}
                    </span>
                  )}
                  <div className="mobile-user-details">
                    <span className="mobile-user-name">
                      {adminUser.name || adminUser.email.split("@")[0]}
                    </span>
                    <span className="mobile-user-role">
                      {adminUser.is_admin ? "Quản trị viên" : "Thành viên"}
                    </span>
                  </div>
                </div>
                <div className="mobile-auth-links">
                  {adminUser.is_admin ? (
                    <>
                      <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}>📊 Bảng điều khiển</Link>
                      <Link href="/admin/profile" onClick={() => setIsMobileMenuOpen(false)}>👤 Hồ sơ admin</Link>
                    </>
                  ) : (
                    <>
                      <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>👤 Thông tin cá nhân</Link>
                      <Link href="/profile?tab=bookings" onClick={() => setIsMobileMenuOpen(false)}>✈️ Tour đã đặt</Link>
                    </>
                  )}
                  <button onClick={handleLogout} className="mobile-logout-btn">
                    🚪 Đăng xuất
                  </button>
                </div>
              </div>
            ) : (
              <div className="mobile-auth-guest-buttons">
                <Link href="/login" className="mobile-auth-btn login" onClick={() => setIsMobileMenuOpen(false)}>
                  Đăng nhập
                </Link>
                <Link href="/register" className="mobile-auth-btn register" onClick={() => setIsMobileMenuOpen(false)}>
                  Đăng ký
                </Link>
              </div>
            )}
          </div>

          <nav className="mobile-nav-list">
            {navigation.map((item) => {
              const isActive = pathname === item.href.split("?")[0];
              const isDomestic = item.label === "Du lịch trong nước";
              const isInternational = item.label === "Du lịch nước ngoài";

              if (isDomestic) {
                const isOpen = !!expandedMobileMain[item.label];
                return (
                  <div key={item.label} className="mobile-nav-group">
                    <button
                      type="button"
                      className={`mobile-nav-link-btn ${isOpen ? "expanded" : ""}`}
                      onClick={() => setExpandedMobileMain(p => ({ ...p, [item.label]: !p[item.label] }))}
                    >
                      <span>{item.label}</span>
                      <span className="arrow">{isOpen ? "▲" : "▼"}</span>
                    </button>
                    {isOpen && (
                      <div className="mobile-sub-accordion">
                        {domesticRegions.map((region) => {
                          const isSubOpen = !!expandedMobileSub[region.title];
                          return (
                            <div key={region.title} className="mobile-sub-group">
                              <button
                                type="button"
                                className={`mobile-sub-trigger ${isSubOpen ? "expanded" : ""}`}
                                onClick={() => setExpandedMobileSub(p => ({ ...p, [region.title]: !p[region.title] }))}
                              >
                                <span>{region.title}</span>
                                <span className="arrow">{isSubOpen ? "▲" : "▼"}</span>
                              </button>
                              {isSubOpen && (
                                <ul className="mobile-leaf-list">
                                  <li>
                                    <Link href={item.href} onClick={() => setIsMobileMenuOpen(false)} style={{ fontWeight: 600, color: "var(--accent)" }}>
                                      🎯 Tất cả tour trong nước
                                    </Link>
                                  </li>
                                  {region.provinces.map((prov) => (
                                    <li key={prov}>
                                      <Link href={`/tours?query=${encodeURIComponent(prov)}`} onClick={() => setIsMobileMenuOpen(false)}>
                                        {prov}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              if (isInternational) {
                const isOpen = !!expandedMobileMain[item.label];
                return (
                  <div key={item.label} className="mobile-nav-group">
                    <button
                      type="button"
                      className={`mobile-nav-link-btn ${isOpen ? "expanded" : ""}`}
                      onClick={() => setExpandedMobileMain(p => ({ ...p, [item.label]: !p[item.label] }))}
                    >
                      <span>{item.label}</span>
                      <span className="arrow">{isOpen ? "▲" : "▼"}</span>
                    </button>
                    {isOpen && (
                      <div className="mobile-sub-accordion">
                        {internationalContinents.map((continent) => {
                          const isSubOpen = !!expandedMobileSub[continent.title];
                          return (
                            <div key={continent.title} className="mobile-sub-group">
                              <button
                                type="button"
                                className={`mobile-sub-trigger ${isSubOpen ? "expanded" : ""}`}
                                onClick={() => setExpandedMobileSub(p => ({ ...p, [continent.title]: !p[continent.title] }))}
                              >
                                <span>{continent.title}</span>
                                <span className="arrow">{isSubOpen ? "▲" : "▼"}</span>
                              </button>
                              {isSubOpen && (
                                <ul className="mobile-leaf-list">
                                  <li>
                                    <Link href={item.href} onClick={() => setIsMobileMenuOpen(false)} style={{ fontWeight: 600, color: "var(--accent)" }}>
                                      🎯 Tất cả tour quốc tế
                                    </Link>
                                  </li>
                                  {continent.countries.map((country) => (
                                    <li key={country}>
                                      <Link href={`/tours?query=${encodeURIComponent(country)}`} onClick={() => setIsMobileMenuOpen(false)}>
                                        {country}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`mobile-nav-link ${isActive ? "active" : ""}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mobile-drawer-footer">
            {hotline && (
              <a href={`tel:${hotline.replace(/[^0-9]/g, "")}`} className="mobile-footer-hotline">
                <span>📞 Hotline CSKH:</span>
                <strong>{hotline}</strong>
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
