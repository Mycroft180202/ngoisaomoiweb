"use client";
import { useEffect, useState } from "react";

export default function TourAuditPage(){
 const [rows,setRows]=useState<any[]>([]); const [loading,setLoading]=useState(true);
 useEffect(()=>{const token=localStorage.getItem("admin_token");fetch("http://localhost:8000/api/tours/audit-logs?limit=200",{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.ok?r.json():Promise.reject()).then(setRows).finally(()=>setLoading(false));},[]);
 const labels:any={create:"Tạo Tour",update:"Sửa Tour",delete:"Xóa Tour"};
 return <div className="admin-panel"><div className="admin-panel-header"><div><h3>🧾 Nhật ký thay đổi Tour</h3><p style={{color:"var(--public-muted, #64748b)",margin:0}}>Ghi nhận thao tác từ server, kể cả khi gọi API trực tiếp.</p></div></div>{loading?<p>Đang tải...</p>:<div className="admin-table-container"><table className="admin-table"><thead><tr><th>Thời gian</th><th>Hành động</th><th>Tour</th><th>Người thao tác</th><th>Quyền</th><th>Nội dung thay đổi</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{new Date(r.created_at).toLocaleString("vi-VN")}</td><td><strong>{labels[r.action]||r.action}</strong></td><td>{r.tour_title||`#${r.tour_id}`}</td><td>{r.actor_name||r.actor_identifier}<br/><small>{r.actor_identifier}</small></td><td>{r.actor_role}</td><td><details><summary>Xem chi tiết</summary><pre style={{whiteSpace:"pre-wrap",maxWidth:420}}>{JSON.stringify(r.changes,null,2)}</pre></details></td></tr>)}</tbody></table></div>}</div>;
}
