"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Toast = { id: number; message: string; type: "info" | "success" | "error" };
type ConfirmRequest = { message: string; title?: string; resolve: (value: boolean) => void };

let toastHandler: ((message: string, type?: Toast["type"]) => void) | null = null;
let confirmHandler: ((message: string, title?: string) => Promise<boolean>) | null = null;

export function appToast(message: unknown, type: Toast["type"] = "info") {
  toastHandler?.(String(message || "Đã hoàn tất"), type);
}

export function appConfirm(message: string, title = "Xác nhận thao tác") {
  return confirmHandler ? confirmHandler(message, title) : Promise.resolve(false);
}

export default function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const themeClass = pathname.startsWith("/admin") ? " site-frame--v2 admin-theme" : "";
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    toastHandler = (message, type = "info") => {
      const id = Date.now() + Math.random();
      setToasts(items => [...items, { id, message, type }]);
      window.setTimeout(() => setToasts(items => items.filter(item => item.id !== id)), 4200);
    };
    confirmHandler = (message, title) => new Promise<boolean>(resolve => setConfirm({ message, title, resolve }));
    return () => { toastHandler = null; confirmHandler = null; };
  }, []);

  const closeConfirm = (result: boolean) => { confirm?.resolve(result); setConfirm(null); };
  return <>{children}
    <div className={`app-toast-stack${themeClass}`} aria-live="polite">{toasts.map(item => <div key={item.id} className={`app-toast app-toast--${item.type}`}><span>{item.type === "error" ? "!" : item.type === "success" ? "✓" : "i"}</span><p>{item.message}</p><button onClick={() => setToasts(items => items.filter(t => t.id !== item.id))}>×</button></div>)}</div>
    {confirm && <div className={`app-dialog-backdrop${themeClass}`} onMouseDown={e => e.target === e.currentTarget && closeConfirm(false)}><div className="app-confirm-dialog" role="alertdialog" aria-modal="true"><div className="app-confirm-dialog__icon">?</div><h3>{confirm.title}</h3><p>{confirm.message}</p><div><button className="app-confirm-dialog__cancel" onClick={() => closeConfirm(false)}>Hủy</button><button className="app-confirm-dialog__accept" onClick={() => closeConfirm(true)}>Xác nhận</button></div></div></div>}
  </>;
}
