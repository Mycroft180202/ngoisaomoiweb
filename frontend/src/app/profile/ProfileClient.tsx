"use client";


import { appToast, appConfirm } from "@/components/ui/AppDialogProvider";
import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCms } from "@/components/cms/CmsProvider";

interface AvatarCropModalProps {
  imageSrc: string;
  onClose: () => void;
  onApply: (croppedBlob: Blob) => void;
}

function AvatarCropModal({ imageSrc, onClose, onApply }: AvatarCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      setImage(img);
    };
  }, [imageSrc]);

  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const imgWidth = image.width;
    const imgHeight = image.height;
    
    const scale = Math.min(canvas.width / imgWidth, canvas.height / imgHeight);
    const baseWidth = imgWidth * scale;
    const baseHeight = imgHeight * scale;

    const drawWidth = baseWidth * zoom;
    const drawHeight = baseHeight * zoom;

    const x = (canvas.width - drawWidth) / 2 + pan.x;
    const y = (canvas.height - drawHeight) / 2 + pan.y;

    ctx.save();
    ctx.drawImage(image, x, y, drawWidth, drawHeight);

    // Semi-transparent overlay mask
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    
    const cropRadius = 130; // 260px diameter
    ctx.arc(canvas.width / 2, canvas.height / 2, cropRadius, 0, Math.PI * 2, true);
    ctx.fill("evenodd");

    // Crop border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, cropRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }, [image, zoom, pan]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleApply = () => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    
    const cropRadius = 130;
    const cropSize = cropRadius * 2;

    const offscreen = document.createElement("canvas");
    offscreen.width = cropSize;
    offscreen.height = cropSize;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;

    const imgWidth = image.width;
    const imgHeight = image.height;
    
    const scale = Math.min(canvas.width / imgWidth, canvas.height / imgHeight);
    const baseWidth = imgWidth * scale;
    const baseHeight = imgHeight * scale;

    const drawWidth = baseWidth * zoom;
    const drawHeight = baseHeight * zoom;

    const drawX = cropRadius - drawWidth / 2 + pan.x;
    const drawY = cropRadius - drawHeight / 2 + pan.y;

    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);

    offscreen.toBlob((blob) => {
      if (blob) {
        onApply(blob);
      }
    }, "image/jpeg", 0.9);
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0, 0, 0, 0.75)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
    }}>
      <div className="surface-panel" style={{
        width: "90%",
        maxWidth: "450px",
        borderRadius: "1rem",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
        backgroundColor: "var(--public-surface, white)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "var(--public-text-strong, #1a1c1e)" }}>✂️ Cắt ảnh đại diện</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--muted)" }}>✕</button>
        </div>

        <div style={{ display: "flex", justifyContent: "center", position: "relative", userSelect: "none" }}>
          <canvas
            ref={canvasRef}
            width={340}
            height={340}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "8px",
              cursor: isDragging ? "grabbing" : "grab",
              touchAction: "none",
              backgroundColor: "var(--public-surface-soft, #f8fafc)"
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", fontWeight: 600, color: "var(--muted)" }}>
            <span>🔍 Phóng to/Thu nhỏ:</span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <input
            type="range"
            min="1.0"
            max="3.0"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "var(--accent)" }}
          />
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <button onClick={onClose} className="button" style={{ flex: 1, padding: "0.75rem", border: "1px solid var(--border)", background: "none", fontWeight: 600 }}>Hủy</button>
          <button onClick={handleApply} className="button button-primary" style={{ flex: 1, padding: "0.75rem", fontWeight: 600 }}>Áp dụng</button>
        </div>
      </div>
    </div>
  );
}

interface Tour {
  id: number;
  title: string;
  price: number;
  image: string;
  slug: string;
}

interface Booking {
  id: number;
  tour_id: number;
  tour_title: string;
  full_name: string;
  email: string;
  phone: string;
  departure_date: string;
  guests_count: number;
  notes: string;
  status: "pending" | "confirmed" | "cancelled";
  payment_status: "unpaid" | "pending" | "paid";
  payment_proof?: string;
  payment_ref?: string;
  created_at: string;
}

interface UserProfile {
  id: number;
  email: string;
  full_name: string | null;
  phone: string | null;
  google_id: string | null;
  facebook_id: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  phone_verified: boolean;
  email_verified: boolean;
}

interface BankAccount {
  id: number;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch?: string;
  qr_code_url?: string;
  is_active: boolean;
}

interface PaymentMethod {
  id: number;
  name: string;
  description?: string;
  icon_url?: string;
  is_active: boolean;
}

interface RepresentativeOffice {
  id: number;
  name: string;
  address: string;
  phone: string;
  hotline?: string;
  email?: string;
  order_index?: number;
}

function UserProfileContent() {
  const router = useRouter();
  const { config } = useCms();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "info";

  const [user, setUser] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);



  // Profile Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Avatar Modal states
  const [isAvatarHovered, setIsAvatarHovered] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [editorImage, setEditorImage] = useState<string | null>(null);

  // OTP Verification states
  const [otpEmailSent, setOtpEmailSent] = useState(false);
  const [emailOTP, setEmailOTP] = useState("");
  const [otpPhoneSent, setOtpPhoneSent] = useState(false);
  const [phoneOTP, setPhoneOTP] = useState("");

  const isSocialLinked = !!user?.google_id;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setEditorImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropApply = async (blob: Blob) => {
    setEditorImage(null);
    setError(null);
    setSuccess(null);
    
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    setUpdating(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "avatar.jpg");

      const res = await fetch("http://localhost:8000/api/auth/upload-avatar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Không thể tải lên ảnh đại diện.");

      setSuccess("Cập nhật ảnh đại diện thành công!");
      setUser(data);
      
      if (data.avatar_url) {
        localStorage.setItem("admin_avatar_url", data.avatar_url);
      } else {
        localStorage.removeItem("admin_avatar_url");
      }
      
      window.dispatchEvent(new Event("auth-state-change"));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Lỗi tải lên ảnh.");
    } finally {
      setUpdating(false);
    }
  };

  const handleSendEmailOTP = async () => {
    setError(null);
    setSuccess(null);
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    setUpdating(true);
    try {
      const res = await fetch("http://localhost:8000/api/auth/send-email-otp", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Không thể gửi OTP.");
      setSuccess(data.detail || "Mã OTP đã được gửi đến email của bạn.");
      setOtpEmailSent(true);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setUpdating(false);
    }
  };

  const handleVerifyEmailOTP = async () => {
    setError(null);
    setSuccess(null);
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    if (!emailOTP || emailOTP.trim().length !== 6) {
      setError("Mã OTP phải có độ dài 6 ký tự.");
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch("http://localhost:8000/api/auth/verify-email-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otp: emailOTP }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Mã OTP không chính xác.");
      setSuccess("Xác thực địa chỉ Email thành công!");
      setUser(data);
      setOtpEmailSent(false);
      setEmailOTP("");
    } catch (err: any) {
      setError(err.message || "Xác thực thất bại.");
    } finally {
      setUpdating(false);
    }
  };

  const handleSendPhoneOTP = async () => {
    setError(null);
    setSuccess(null);
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    setUpdating(true);
    try {
      const res = await fetch("http://localhost:8000/api/auth/send-phone-otp", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Không thể gửi OTP Zalo.");
      setSuccess(data.detail || "Mã OTP đã được gửi qua Zalo OA.");
      setOtpPhoneSent(true);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setUpdating(false);
    }
  };

  const handleVerifyPhoneOTP = async () => {
    setError(null);
    setSuccess(null);
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    if (!phoneOTP || phoneOTP.trim().length !== 6) {
      setError("Mã OTP phải có độ dài 6 ký tự.");
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch("http://localhost:8000/api/auth/verify-phone-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ otp: phoneOTP }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Mã OTP không chính xác.");
      setSuccess("Xác thực số điện thoại thành công!");
      setUser(data);
      setOtpPhoneSent(false);
      setPhoneOTP("");
    } catch (err: any) {
      setError(err.message || "Xác thực thất bại.");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchProfileAndData();
  }, []);

  const fetchProfileAndData = async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      // Fetch User Info
      const userRes = await fetch("http://localhost:8000/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!userRes.ok) throw new Error("Không thể tải thông tin hồ sơ.");
      const userData = await userRes.json();
      setUser(userData);
      setFullName(userData.full_name || "");
      setEmail(userData.email || "");
      setPhone(userData.phone || "");

      // Fetch Tours
      const toursRes = await fetch("http://localhost:8000/api/tours/");
      const toursData = toursRes.ok ? await toursRes.json() : [];
      setTours(toursData);

      // Fetch User Bookings
      const bookingsRes = await fetch("http://localhost:8000/api/bookings/my-bookings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bookingsData = bookingsRes.ok ? await bookingsRes.json() : [];
      setBookings(bookingsData);


    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    const token = localStorage.getItem("admin_token");
    if (!token) return;

    setUpdating(true);
    try {
      const payload: any = {
        email,
        full_name: fullName,
        phone: phone || null,
      };

      if (password.trim() !== "") {
        payload.password = password;
      }

      const res = await fetch("http://localhost:8000/api/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Không thể cập nhật hồ sơ.");

      setSuccess("Cập nhật thông tin thành công!");
      setUser(data);
      localStorage.setItem("admin_email", data.email);
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
      window.dispatchEvent(new Event("auth-state-change"));
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi.");
    } finally {
      setUpdating(false);
    }
  };

  const triggerOAuthLink = (provider: "google") => {
    setError(null);
    setSuccess(null);
    if (provider === "google") {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId || clientId.includes("your-google-client-id")) {
        setError("Google Client ID chưa được cấu hình. Vui lòng cập nhật trong file .env.local!");
        return;
      }
      const redirectUri = window.location.origin + "/auth/callback/google";
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem("google_auth_state", state);
      const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent("openid profile email")}&state=${state}`;
      window.location.href = googleUrl;
    }
  };

  const handleUnlinkSocial = async (provider: "google") => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;

    if (!await appConfirm("Bạn có chắc chắn muốn hủy liên kết tài khoản Google?")) {
      return;
    }

    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: any = {};
      if (provider === "google") {
        payload.google_id = "unlink";
      }

      const res = await fetch("http://localhost:8000/api/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Không thể hủy liên kết.");

      setUser(data);
      setSuccess("Đã hủy liên kết tài khoản Google!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi khi hủy liên kết.");
    } finally {
      setUpdating(false);
    }
  };

  const getTourDetails = (booking: Booking) => {
    return tours.find((t) => t.id === booking.tour_id || t.title === booking.tour_title);
  };

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat("vi-VN").format(p) + " VNĐ";
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "6rem 0" }}>
        <div className="admin-spinner"></div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "4rem 0", minHeight: "80vh" }}>
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "2rem", alignItems: "start" }}>
        
        {/* Left Sidebar */}
        <aside className="surface-panel" style={{ padding: "1.5rem", borderRadius: "1rem" }}>
          <div style={{ textAlign: "center", marginBottom: "1.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid var(--border)" }}>
            <input
              type="file"
              id="avatar-file-input"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileChange}
              onClick={(e) => {
                (e.target as HTMLInputElement).value = "";
              }}
            />
            <div
              onMouseEnter={() => setIsAvatarHovered(true)}
              onMouseLeave={() => setIsAvatarHovered(false)}
              style={{
                position: "relative",
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                overflow: "hidden",
                margin: "0 auto 0.75rem",
                background: "var(--accent-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
                border: "2px solid var(--border)",
              }}
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "2.5rem" }}>👤</span>
              )}
              
              {/* Overlay on hover */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background: "rgba(0, 0, 0, 0.65)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "6px",
                  opacity: isAvatarHovered ? 1 : 0,
                  pointerEvents: isAvatarHovered ? "auto" : "none",
                  transition: "opacity 0.2s ease",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsViewerOpen(true)}
                  style={{
                    background: "rgba(255, 255, 255, 0.25)",
                    border: "none",
                    color: "white",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => (e.target as HTMLButtonElement).style.background = "rgba(255, 255, 255, 0.4)"}
                  onMouseLeave={(e) => (e.target as HTMLButtonElement).style.background = "rgba(255, 255, 255, 0.25)"}
                >
                  👁️ Xem ảnh
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isSocialLinked) return;
                    document.getElementById("avatar-file-input")?.click();
                  }}
                  disabled={isSocialLinked}
                  style={{
                    background: isSocialLinked ? "rgba(255, 255, 255, 0.1)" : "var(--accent)",
                    border: "none",
                    color: isSocialLinked ? "rgba(255, 255, 255, 0.4)" : "var(--public-on-accent, white)",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    cursor: isSocialLinked ? "not-allowed" : "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSocialLinked) {
                      (e.target as HTMLButtonElement).style.background = "var(--accent-dark)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSocialLinked) {
                      (e.target as HTMLButtonElement).style.background = "var(--accent)";
                    }
                  }}
                  title={isSocialLinked ? "Không thể đổi ảnh đối với tài khoản liên kết Google" : "Đổi ảnh"}
                >
                  📷 Đổi ảnh
                </button>
              </div>
            </div>
            {isSocialLinked && (
              <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontStyle: "italic", marginBottom: "0.5rem", lineHeight: "1.3", padding: "0 0.5rem" }}>
                Ảnh đồng bộ từ Google
              </div>
            )}
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>{user?.full_name || "Thành viên"}</h3>
            <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{user?.email}</span>
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <button
              onClick={() => router.push("/profile?tab=info")}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                textAlign: "left",
                fontWeight: 600,
                fontSize: "0.92rem",
                cursor: "pointer",
                background: activeTab === "info" ? "linear-gradient(135deg, var(--accent), var(--accent-dark))" : "transparent",
                color: activeTab === "info" ? "var(--public-on-accent, white)" : "var(--foreground)",
                transition: "all 0.2s",
              }}
            >
              👤 Thông tin tài khoản
            </button>
            <button
              onClick={() => router.push("/profile?tab=bookings")}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                textAlign: "left",
                fontWeight: 600,
                fontSize: "0.92rem",
                cursor: "pointer",
                background: activeTab === "bookings" ? "linear-gradient(135deg, var(--accent), var(--accent-dark))" : "transparent",
                color: activeTab === "bookings" ? "var(--public-on-accent, white)" : "var(--foreground)",
                transition: "all 0.2s",
              }}
            >
              ✈️ Tour đã đặt ({bookings.length})
            </button>
          </nav>
        </aside>

        {/* Right Content */}
        <main className="surface-panel" style={{ padding: "2.5rem", borderRadius: "1rem", minHeight: "450px" }}>
          {error && <div className="auth-message error" style={{ marginBottom: "1.5rem" }}>{error}</div>}
          {success && <div className="auth-message success" style={{ marginBottom: "1.5rem" }}>{success}</div>}

          {activeTab === "info" ? (
            /* Account Info Tab */
            <div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "1.5rem", color: "var(--public-text-strong, #1a1c1e)" }}>
                👤 Thông tin tài khoản của bạn
              </h2>

              <form onSubmit={handleUpdateProfile} className="auth-form" style={{ maxWidth: "560px", gap: "1.25rem" }}>
                <div className="form-group">
                  <label htmlFor="pName">Họ và tên</label>
                  <input
                    type="text"
                    id="pName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                    <label htmlFor="pEmail" style={{ margin: 0 }}>Địa chỉ Email</label>
                    {user && (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontWeight: 600,
                          backgroundColor: user.email_verified ? "#e6fffa" : "var(--public-error-surface, #fff5f5)",
                          color: user.email_verified ? "#319795" : "#e53e3e",
                          border: `1px solid ${user.email_verified ? "#b2f5ea" : "#fed7d7"}`
                        }}
                      >
                        {user.email_verified ? "✓ Đã xác minh" : "⚠️ Chưa xác minh"}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <input
                      type="email"
                      id="pEmail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{ flex: 1 }}
                    />
                    {!user?.email_verified && email === user?.email && (
                      <button
                        type="button"
                        onClick={handleSendEmailOTP}
                        disabled={updating}
                        className="button"
                        style={{ padding: "0.55rem 1rem", fontSize: "0.82rem", whiteSpace: "nowrap", height: "100%" }}
                      >
                        {otpEmailSent ? "Gửi lại OTP" : "Xác thực Email"}
                      </button>
                    )}
                  </div>
                  
                  {otpEmailSent && (
                    <div style={{ marginTop: "0.75rem", padding: "0.75rem", border: "1px dashed var(--border)", borderRadius: "6px", backgroundColor: "var(--public-surface-soft, #f8fafc)" }}>
                      <label style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block", marginBottom: "0.25rem" }}>
                        Nhập mã xác thực gửi đến Email của bạn:
                      </label>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="Mã OTP 6 số"
                          value={emailOTP}
                          onChange={(e) => setEmailOTP(e.target.value)}
                          style={{ maxWidth: "150px", textAlign: "center", padding: "0.4rem", border: "1px solid var(--border)", borderRadius: "4px" }}
                        />
                        <button
                          type="button"
                          onClick={handleVerifyEmailOTP}
                          className="button button-primary"
                          style={{ padding: "0.4rem 1.2rem", fontSize: "0.82rem" }}
                        >
                          Xác nhận
                        </button>
                        <button
                          type="button"
                          onClick={() => setOtpEmailSent(false)}
                          className="button"
                          style={{ padding: "0.4rem 0.8rem", fontSize: "0.82rem", background: "none", border: "none" }}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                    <label htmlFor="pPhone" style={{ margin: 0 }}>Số điện thoại</label>
                    {user && user.phone && (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontWeight: 600,
                          backgroundColor: user.phone_verified ? "#e6fffa" : "var(--public-error-surface, #fff5f5)",
                          color: user.phone_verified ? "#319795" : "#e53e3e",
                          border: `1px solid ${user.phone_verified ? "#b2f5ea" : "#fed7d7"}`
                        }}
                      >
                        {user.phone_verified ? "✓ Đã xác minh" : "⚠️ Chưa xác minh"}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <input
                      type="text"
                      id="pPhone"
                      placeholder="Ví dụ: 0987654321"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    {!user?.phone_verified && user?.phone && phone === user?.phone && (
                      <button
                        type="button"
                        onClick={handleSendPhoneOTP}
                        disabled={updating}
                        className="button"
                        style={{ padding: "0.55rem 1rem", fontSize: "0.82rem", whiteSpace: "nowrap", height: "100%" }}
                      >
                        {otpPhoneSent ? "Gửi lại OTP" : "Xác thực Zalo"}
                      </button>
                    )}
                  </div>

                  {otpPhoneSent && (
                    <div style={{ marginTop: "0.75rem", padding: "0.75rem", border: "1px dashed var(--border)", borderRadius: "6px", backgroundColor: "var(--public-surface-soft, #f8fafc)" }}>
                      <label style={{ fontSize: "0.8rem", color: "var(--muted)", display: "block", marginBottom: "0.25rem" }}>
                        Nhập mã xác thực gửi qua Zalo OA:
                      </label>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="Mã OTP 6 số"
                          value={phoneOTP}
                          onChange={(e) => setPhoneOTP(e.target.value)}
                          style={{ maxWidth: "150px", textAlign: "center", padding: "0.4rem", border: "1px solid var(--border)", borderRadius: "4px" }}
                        />
                        <button
                          type="button"
                          onClick={handleVerifyPhoneOTP}
                          className="button button-primary"
                          style={{ padding: "0.4rem 1.2rem", fontSize: "0.82rem" }}
                        >
                          Xác nhận
                        </button>
                        <button
                          type="button"
                          onClick={() => setOtpPhoneSent(false)}
                          className="button"
                          style={{ padding: "0.4rem 0.8rem", fontSize: "0.82rem", background: "none", border: "none" }}
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Avatar URL field removed to prioritize crop & upload to MinIO */}

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem", marginTop: "1rem" }}>
                  <h4 style={{ fontSize: "0.98rem", fontWeight: 700, marginBottom: "1rem", color: "var(--public-text-strong, #1a1c1e)" }}>
                    🔒 Đổi mật khẩu bảo vệ
                  </h4>

                  <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                    <label htmlFor="pPwd">Mật khẩu mới</label>
                    <input
                      type="password"
                      id="pPwd"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới (nếu muốn đổi)"
                      minLength={6}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="pConfirmPwd">Xác nhận mật khẩu mới</label>
                    <input
                      type="password"
                      id="pConfirmPwd"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Xác nhận lại mật khẩu mới"
                      minLength={6}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="button button-primary"
                  style={{ alignSelf: "flex-start", padding: "0.8rem 2rem", marginTop: "1.5rem" }}
                  disabled={updating}
                >
                  {updating ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </form>

              {/* Social Accounts Connections */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.5rem", marginTop: "2.5rem", maxWidth: "560px" }}>
                <h4 style={{ fontSize: "0.98rem", fontWeight: 700, marginBottom: "1rem", color: "var(--public-text-strong, #1a1c1e)" }}>
                  🔗 Liên kết tài khoản mạng xã hội
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  
                  {/* Google Connection */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", border: "1px solid var(--border)", borderRadius: "0.5rem", backgroundColor: "var(--public-surface, white)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <svg viewBox="0 0 24 24" width="20" height="20" style={{ flexShrink: 0 }}>
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.08-.2-.15-.42-.2-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <div>
                        <strong style={{ fontSize: "0.9rem", display: "block" }}>Tài khoản Google</strong>
                        {user?.google_id ? (
                          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Đã liên kết (ID: {user.google_id})</span>
                        ) : (
                          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Chưa liên kết</span>
                        )}
                      </div>
                    </div>
                    {user?.google_id ? (
                      <button
                        type="button"
                        onClick={() => handleUnlinkSocial("google")}
                        disabled={updating}
                        style={{ padding: "0.4rem 0.8rem", border: "1px solid #f87171", borderRadius: "0.25rem", color: "#ef4444", background: "none", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
                      >
                        Hủy liên kết
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => triggerOAuthLink("google")}
                        style={{ padding: "0.4rem 0.8rem", border: "1px solid var(--accent)", borderRadius: "0.25rem", color: "var(--accent)", background: "none", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
                      >
                        Liên kết Google
                      </button>
                    )}
                  </div>


                </div>
              </div>
            </div>
          ) : (
            /* Booked Tours History Tab */
            <div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "1.5rem", color: "var(--public-text-strong, #1a1c1e)" }}>
                ✈️ Danh sách tour của bạn đã đặt
              </h2>

              {bookings.length === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--muted)" }}>
                  <span style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}>✈️</span>
                  Bạn chưa đăng ký đặt tour nào. Hãy tham khảo các tour du lịch của chúng tôi!
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {bookings.map((booking) => {
                    const tourDetails = getTourDetails(booking);
                    const tourPrice = tourDetails ? tourDetails.price : 0;
                    const totalPrice = tourPrice * booking.guests_count;

                    return (
                      <div
                        key={booking.id}
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: "1rem",
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "column",
                          backgroundColor: "var(--public-surface, white)",
                          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
                        }}
                      >
                        {/* Upper row: Grid of Image and Details */}
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "180px 1fr",
                        }}>
                          {/* Tour Image */}
                          <div style={{ position: "relative", minHeight: "130px", background: "var(--public-surface-soft, #f1f5f9)" }}>
                            {tourDetails?.image ? (
                              <img
                                src={tourDetails.image}
                                alt={booking.tour_title}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>
                                🏞️
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "0.5rem" }}>
                                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "var(--public-text-strong, #1a1c1e)" }}>
                                  {booking.tour_title}
                                </h3>
                                <span className={`badge badge-${booking.status}`} style={{ flexShrink: 0 }}>
                                  {booking.status === "pending" && "Chờ xử lý"}
                                  {booking.status === "confirmed" && "Đã duyệt"}
                                  {booking.status === "cancelled" && "Đã hủy"}
                                </span>
                              </div>
                              
                              <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.82rem", color: "var(--muted)", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                                <span>📅 Khởi hành: <strong>{new Date(booking.departure_date).toLocaleDateString("vi-VN")}</strong></span>
                                <span>👥 Số khách: <strong>{booking.guests_count} người</strong></span>
                                <span>Mã đơn: <strong>#{booking.id}</strong></span>
                              </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px dashed var(--border)", paddingTop: "0.75rem", flexWrap: "wrap", gap: "1rem" }}>
                              <div>
                                <span style={{ fontSize: "0.82rem", color: "var(--muted)", marginRight: "0.5rem" }}>Tổng tiền thanh toán:</span>
                                <strong style={{ fontSize: "1.1rem", color: "var(--accent-dark)" }}>{formatPrice(totalPrice)}</strong>
                              </div>
                              
                              {booking.status !== "cancelled" && booking.payment_status !== "paid" && config.payment?.online_enabled && booking.status === "confirmed" ? (
                                <button onClick={() => router.push(`/payment/${booking.id}`)} className="button button-primary" style={{ border: 0, padding: ".65rem 1rem", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>Thanh toán QR</button>
                              ) : booking.status !== "cancelled" && booking.payment_status !== "paid" && (
                                <span style={{ fontSize: "0.82rem", color: "var(--public-info-text, #1e40af)", fontWeight: 600 }}>
                                  {config.payment?.online_enabled ? "Chờ nhân viên xác nhận đơn" : "Chờ nhân viên xác nhận và hướng dẫn thanh toán"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Lightbox Viewer */}
          {isViewerOpen && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0, 0, 0, 0.75)",
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
              }}
              onClick={() => setIsViewerOpen(false)}
            >
              <div
                style={{
                  position: "relative",
                  maxWidth: "90%",
                  maxHeight: "90%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="Avatar"
                    style={{
                      maxWidth: "480px",
                      maxHeight: "480px",
                      borderRadius: "12px",
                      boxShadow: "0 20px 25px -5px rgba(0,0,0,0.3)",
                      objectFit: "contain",
                      border: "3px solid white",
                    }}
                  />
                ) : (
                  <div style={{ width: "200px", height: "200px", borderRadius: "50%", background: "var(--public-surface, white)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "5rem" }}>
                    👤
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setIsViewerOpen(false)}
                  style={{
                    position: "absolute",
                    top: "-45px",
                    right: "0",
                    background: "var(--public-surface, white)",
                    border: "none",
                    borderRadius: "50%",
                    width: "36px",
                    height: "36px",
                    fontSize: "1.2rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    fontWeight: "bold",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Canvas Crop Editor */}
          {editorImage && (
            <AvatarCropModal
              imageSrc={editorImage}
              onClose={() => setEditorImage(null)}
              onApply={handleCropApply}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function UserProfilePage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", justifyContent: "center", padding: "6rem 0" }}>
        <div className="admin-spinner"></div>
      </div>
    }>
      <UserProfileContent />
    </Suspense>
  );
}
