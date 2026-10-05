"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { appConfirm, appToast } from "@/components/ui/AppDialogProvider";

type UiVersion = "legacy" | "v2";

const normalizeVersion = (value: unknown): UiVersion => value === "v2" ? "v2" : "legacy";

export default function UiVersionSettingsPage() {
  const [activeVersion, setActiveVersion] = useState<UiVersion>("legacy");
  const [selectedVersion, setSelectedVersion] = useState<UiVersion>("legacy");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    fetch(`${apiBase}/api/settings/cms_ui_version`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((setting) => {
        const rawValue = setting?.value;
        const value = typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
        const version = normalizeVersion(value?.active_version);
        setActiveVersion(version);
        setSelectedVersion(version);
        setUpdatedAt(setting?.updated_at || null);
      })
      .catch(() => {
        setActiveVersion("legacy");
        setSelectedVersion("legacy");
      })
      .finally(() => setLoading(false));
  }, []);

  const applyVersion = async () => {
    if (selectedVersion === activeVersion || saving) return;

    const isRollback = selectedVersion === "legacy";
    const accepted = await appConfirm(
      isRollback
        ? "Toàn bộ khách truy cập sẽ quay về giao diện cũ sau khi tải lại trang. Dữ liệu và nội dung website không bị thay đổi."
        : "Giao diện V2 sẽ được áp dụng cho toàn bộ khách truy cập. Desktop và mobile/tablet sẽ sử dụng hai shell riêng biệt.",
      isRollback ? "Khôi phục giao diện cũ?" : "Áp dụng giao diện V2?"
    );
    if (!accepted) return;

    const token = localStorage.getItem("admin_token");
    if (!token) {
      appToast("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", "error");
      return;
    }

    try {
      setSaving(true);
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiBase}/api/settings/cms_ui_version/json`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active_version: selectedVersion }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.detail || "Không thể cập nhật phiên bản giao diện.");
      }

      setActiveVersion(selectedVersion);
      setUpdatedAt(result?.updated_at || new Date().toISOString());
      appToast(
        selectedVersion === "legacy"
          ? "Đã đưa website về giao diện cũ."
          : "Đã áp dụng giao diện V2 cho website.",
        "success"
      );
    } catch (error) {
      appToast(error instanceof Error ? error.message : "Không thể cập nhật phiên bản giao diện.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="admin-loading"><div className="admin-spinner" /></div>;
  }

  return (
    <div className="admin-panel cms-ui-version-panel">
      <div className="cms-ui-version-header">
        <div className="cms-ui-version-header__icon" aria-hidden="true">◫</div>
        <div>
          <div className="cms-ui-version-title-row">
            <h3>Phiên bản giao diện website</h3>
            <span>🔐 Chỉ Super Admin</span>
          </div>
          <p>Chọn một phiên bản duy nhất áp dụng cho toàn bộ khách truy cập website.</p>
        </div>
      </div>

      <div className="cms-ui-version-notice">
        <b>Quyền quản trị toàn hệ thống</b>
        <span>Manager, Sale, Editor, Support và khách hàng không được phép thay đổi lựa chọn này.</span>
      </div>

      <div className="cms-ui-version-grid" role="radiogroup" aria-label="Chọn phiên bản giao diện">
        <button
          type="button"
          role="radio"
          aria-checked={selectedVersion === "legacy"}
          className={`cms-ui-version-card ${selectedVersion === "legacy" ? "is-selected" : ""}`}
          onClick={() => setSelectedVersion("legacy")}
        >
          <span className="cms-ui-version-card__preview is-legacy" aria-hidden="true">
            <i /><i /><i />
          </span>
          <span className="cms-ui-version-card__content">
            <span className="cms-ui-version-card__name">Giao diện cũ</span>
            <span className="cms-ui-version-card__description">Phiên bản ổn định đang được giữ nguyên để có thể quay lại ngay khi cần.</span>
            <span className="cms-ui-version-card__meta">Một shell giao diện hiện tại</span>
          </span>
          <span className="cms-ui-version-card__radio" aria-hidden="true" />
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={selectedVersion === "v2"}
          className={`cms-ui-version-card ${selectedVersion === "v2" ? "is-selected" : ""}`}
          onClick={() => setSelectedVersion("v2")}
        >
          <span className="cms-ui-version-card__preview is-v2" aria-hidden="true">
            <i /><i /><i />
          </span>
          <span className="cms-ui-version-card__content">
            <span className="cms-ui-version-card__name">Giao diện V2 <small>3D Travel</small></span>
            <span className="cms-ui-version-card__description">Trang chủ 3D tương tác trên desktop và trải nghiệm 3D nhẹ, tối ưu riêng cho mobile/tablet.</span>
            <span className="cms-ui-version-card__meta">Đã hoàn thiện nền tảng và trang chủ giai đoạn đầu</span>
          </span>
          <span className="cms-ui-version-card__radio" aria-hidden="true" />
        </button>
      </div>

      <div className="cms-ui-version-status">
        <div>
          <span>Đang áp dụng</span>
          <strong>{activeVersion === "v2" ? "Giao diện V2" : "Giao diện cũ"}</strong>
          {updatedAt && <small>Cập nhật lúc {new Date(updatedAt).toLocaleString("vi-VN")}</small>}
        </div>
        <div className="cms-ui-version-actions">
          <Link href="/" target="_blank" className="cms-ui-version-view">Xem website ↗</Link>
          <button
            type="button"
            className="admin-btn-primary"
            onClick={applyVersion}
            disabled={saving || selectedVersion === activeVersion}
          >
            {saving ? "Đang áp dụng..." : selectedVersion === activeVersion ? "Đang được sử dụng" : "Áp dụng phiên bản này"}
          </button>
        </div>
      </div>
    </div>
  );
}
