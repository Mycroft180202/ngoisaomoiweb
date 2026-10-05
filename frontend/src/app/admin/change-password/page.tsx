"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (password.length < 8) return setError("Mật khẩu phải có ít nhất 8 ký tự");
    if (password !== confirm) return setError("Hai mật khẩu không khớp");
    if (password === "12345678") return setError("Mật khẩu mới không được trùng mật khẩu mặc định");
    const token = localStorage.getItem("admin_token");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/auth/me`, {method:"PUT", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`}, body:JSON.stringify({password})});
    if (!res.ok) { const data=await res.json(); return setError(data.detail || "Không thể đổi mật khẩu"); }
    router.replace("/admin"); router.refresh();
  };
  return <div className="admin-panel" style={{maxWidth:520,margin:"40px auto",padding:28}}><h2>🔐 Đổi mật khẩu lần đầu</h2><p style={{color:"var(--public-muted, #64748b)"}}>Vì tài khoản được tạo tự động, bạn cần đặt mật khẩu riêng trước khi sử dụng CMS.</p>{error&&<div className="auth-message error">{error}</div>}<form onSubmit={submit} className="auth-form"><div className="form-group"><label>Mật khẩu mới</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8}/></div><div className="form-group"><label>Nhập lại mật khẩu</label><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required minLength={8}/></div><button className="admin-btn-primary" type="submit">Lưu mật khẩu và tiếp tục</button></form></div>;
}
