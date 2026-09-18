
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./DatePicker.css";

interface DatePickerProps {
  value: string | null; // "YYYY-MM-DD" or null
  onChange: (value: string | null) => void;
  placeholder?: string;
}

const LOCALE_MAP: Record<string, string> = {
  uk: "uk-UA",
  de: "de-DE",
  en: "en-US",
};

function toDisplay(value: string | null): string {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
}

function toIso(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// monday = 0 ... Sunday = 6, regardless of browser locale
function mondayFirstWeekday(year: number, month: number, day: number): number {
  const jsDay = new Date(year, month, day).getDay(); // sun=0..sat=6
  return (jsDay + 6) % 7;
}

export function DatePicker({ value, onChange, placeholder }: DatePickerProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const locale = LOCALE_MAP[i18n.resolvedLanguage ?? "uk"] ?? "uk-UA";

  const WEEKDAY_LABELS = t("datePicker.weekdays", {
    returnObjects: true,
    defaultValue: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"],
  }) as string[];

  const parsed = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  const initialYear = parsed ? Number(parsed[1]) : new Date().getFullYear();
  const initialMonth = parsed ? Number(parsed[2]) - 1 : new Date().getMonth();

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const openPicker = () => {
    if (parsed) {
      setViewYear(Number(parsed[1]));
      setViewMonth(Number(parsed[2]) - 1);
    }
    setOpen(true);
  };

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const selectDay = (day: number) => {
    onChange(toIso(viewYear, viewMonth, day));
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    setOpen(false);
  };

  const totalDays = daysInMonth(viewYear, viewMonth);
  const leadingBlanks = mondayFirstWeekday(viewYear, viewMonth, 1);
  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="datepicker" ref={containerRef}>
      <input
        type="text"
        className="datepicker-input"
        value={toDisplay(value)}
        placeholder={placeholder ?? t("datePicker.placeholder", "ДД.ММ.РРРР")}
        readOnly
        onClick={openPicker}
      />
      {open && (
        <div className="datepicker-popup">
          <div className="datepicker-header">
            <button
              type="button"
              className="datepicker-nav"
              onClick={goPrevMonth}
              aria-label={t("datePicker.prevMonth", "Попередній місяць")}
            >
              ‹
            </button>
            <span className="datepicker-month-label">{monthLabel}</span>
            <button
              type="button"
              className="datepicker-nav"
              onClick={goNextMonth}
              aria-label={t("datePicker.nextMonth", "Наступний місяць")}
            >
              ›
            </button>
          </div>
          <div className="datepicker-weekdays">
            {WEEKDAY_LABELS.map((w, i) => (
              <span key={`${w}-${i}`}>{w}</span>
            ))}
          </div>
          <div className="datepicker-grid">
            {cells.map((day, i) => {
              if (day === null) return <span key={`blank-${i}`} className="datepicker-cell datepicker-cell-blank" />;
              const iso = toIso(viewYear, viewMonth, day);
              const isSelected = iso === value;
              return (
                <button
                  type="button"
                  key={iso}
                  className={`datepicker-cell ${isSelected ? "selected" : ""}`}
                  onClick={() => selectDay(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {value && (
            <button type="button" className="datepicker-clear" onClick={clear}>
              {t("datePicker.clear", "Очистити")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}