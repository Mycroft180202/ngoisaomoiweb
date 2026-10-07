"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatDateVN, parseDateKey, parseDateVN } from "@/utils/date";

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  min?: string;
  placeholder?: string;
};

const monthNames = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
const pad = (value: number) => String(value).padStart(2, "0");
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export default function AdminDatePicker({ value, onChange, label, required, min, placeholder = "dd/mm/yyyy" }: Props) {
  const selected = parseDateKey(value);
  const minimum = parseDateKey(min || "");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ? formatDateVN(value) : "");
  const [visible, setVisible] = useState(() => {
    const initial = selected || minimum || new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => setDraft(value ? formatDateVN(value) : ""), [value]);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const cells = useMemo(() => {
    const firstDay = new Date(visible.getFullYear(), visible.getMonth(), 1);
    const start = (firstDay.getDay() + 6) % 7;
    const days = new Date(visible.getFullYear(), visible.getMonth() + 1, 0).getDate();
    return Array.from({ length: Math.ceil((start + days) / 7) * 7 }, (_, index) => index < start ? null : new Date(visible.getFullYear(), visible.getMonth(), index - start + 1));
  }, [visible]);
  const commitDraft = () => {
    if (!draft.trim()) { onChange(""); return true; }
    const parsed = parseDateVN(draft);
    if (!parsed) { setDraft(value ? formatDateVN(value) : ""); return false; }
    if (minimum && parsed < dateKey(minimum)) { setDraft(value ? formatDateVN(value) : ""); return false; }
    onChange(parsed); setDraft(formatDateVN(parsed)); return true;
  };
  const moveMonth = (delta: number) => setVisible(new Date(visible.getFullYear(), visible.getMonth() + delta, 1));
  return <div className="admin-date-picker" ref={rootRef}>
    {label && <label className="admin-date-picker__label">{label}</label>}
    <div className="admin-date-picker__control">
      <input type="text" inputMode="numeric" value={draft} placeholder={placeholder} required={required} onChange={event => setDraft(event.target.value)} onBlur={commitDraft} onFocus={() => setOpen(true)} aria-label={label || "Ngày"} />
      <button type="button" className="admin-date-picker__button" onClick={() => setOpen(current => !current)} aria-label="Mở lịch">📅</button>
    </div>
    {open && <div className="admin-date-picker__popover" role="dialog">
      <div className="admin-date-picker__header"><button type="button" onClick={() => moveMonth(-1)} aria-label="Tháng trước">‹</button><strong>{monthNames[visible.getMonth()]} {visible.getFullYear()}</strong><button type="button" onClick={() => moveMonth(1)} aria-label="Tháng sau">›</button></div>
      <div className="admin-date-picker__weekdays">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map(day => <span key={day}>{day}</span>)}</div>
      <div className="admin-date-picker__grid">{cells.map((day, index) => {
        const key = day ? dateKey(day) : `empty-${index}`;
        const disabled = !day || Boolean(minimum && day < minimum);
        return <button key={key} type="button" disabled={disabled} className={day && key === value ? "is-selected" : ""} onClick={() => { if (!day) return; onChange(key); setDraft(formatDateVN(key)); setOpen(false); }}>{day?.getDate() || ""}</button>;
      })}</div>
      <small>Định dạng: ngày / tháng / năm</small>
    </div>}
  </div>;
}
