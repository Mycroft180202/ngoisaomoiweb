"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const update = () => setMobile(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return mobile;
}

function useOutsideClose<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onClose]);

  return ref;
}

const calendarMonths = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

function getMonthYearParts(month: number, year: number) {
  return { monthName: calendarMonths[month], yearText: String(year) };
}



function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function formatDate(date: Date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function createCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const startDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [];

  for (let index = 0; index < startDay; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface CalendarFieldProps {
  selectedDate: Date | null;
  onChange: (date: Date) => void;
}

export function CalendarField({ selectedDate, onChange }: CalendarFieldProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const fieldRef = useOutsideClose<HTMLDivElement>(() => setOpen(false));
  const isMobile = useIsMobile();
  const days = useMemo(() => createCalendarDays(year, month), [month, year]);
  const popoverClassName = isMobile ? "calendar-popover calendar-popover--mobile surface-3d" : "calendar-popover calendar-popover--desktop surface-3d";
  const { monthName, yearText } = getMonthYearParts(month, year);
  const monthButtonLabel = `${monthName} - ${yearText}`;
  const title = `${monthName} - ${yearText}`;
  const titleNode = <strong>{title}</strong>;
  const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const selectedLabel = selectedDate ? formatDate(selectedDate) : "Chọn ngày";

  return (
    <div className={`calendar-field ${open ? "calendar-field--open" : ""}`} ref={fieldRef}>
      <span>Ngày đi</span>
      <button
        className="calendar-trigger"
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <strong>{selectedLabel}</strong>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="calendar-trigger__icon">
          <path d="M7 2v2H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3h-1V2h-2v2H9V2H7Zm11 8H6v9h12v-9Zm0-5H6v3h12V5Z" fill="currentColor" />
        </svg>
      </button>

      {open ? (
        <div className={popoverClassName} role="dialog" aria-label="Chọn ngày khởi hành">
          <div className="calendar-popover__header">
            <button
              type="button"
              onClick={() => {
                if (month === 0) {
                  setMonth(11);
                  setYear((current) => current - 1);
                } else {
                  setMonth((value) => value - 1);
                }
              }}
              aria-label="Previous month"
            >
              ‹
            </button>
            <button type="button" className="calendar-popover__title" aria-label={monthButtonLabel}>
              {titleNode}
            </button>
            <button
              type="button"
              onClick={() => {
                if (month === 11) {
                  setMonth(0);
                  setYear((current) => current + 1);
                } else {
                  setMonth((value) => value + 1);
                }
              }}
              aria-label="Next month"
            >
              ›
            </button>
          </div>
          <div className="calendar-popover__weekdays">
            {weekdays.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="calendar-popover__grid">
            {days.map((day, index) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isPast = day ? day < today : false;

              return (
                <button
                  key={day ? day.toISOString() : `empty-${index}`}
                  type="button"
                  className={`calendar-day ${selectedDate && day && selectedDate.toDateString() === day.toDateString() ? 'is-selected' : ''} ${day ? '' : 'is-empty'} ${isPast ? 'is-disabled' : ''}`}
                  onClick={() => {
                    if (!day || isPast) return;
                    onChange(day);
                    setOpen(false);
                  }}
                  disabled={!day || isPast}
                  style={isPast ? { opacity: 0.3, cursor: "not-allowed" } : {}}
                >
                  {day ? day.getDate() : ''}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
