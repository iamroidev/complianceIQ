"use client";

import { useMemo, useState } from "react";
import type { Obligation } from "@/core/types";
import { formatDay } from "@/lib/format";

export interface CalendarMark {
  obligation: Obligation;
  dueOn: string;
  days: number;
  state: "overdue" | "soon" | "later" | "done";
}

interface WallCalendarProps {
  marks: CalendarMark[];
  asOf: string;
  selectedDate?: string | null;
  onSelectDate?: (date: string | null) => void;
  onSelectMark?: (mark: CalendarMark) => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * WallCalendar (DESIGN §28.4, §29.9):
 * The wall calendar with tear-off month pages, cream paper, hanging mounts,
 * perforated top edge, and physical urgency flags for deadlines.
 * Terracotta flags = Overdue, Ochre = Due within 14 days, Navy = Later.
 */
export function WallCalendar({
  marks,
  asOf,
  selectedDate,
  onSelectDate,
  onSelectMark,
}: WallCalendarProps) {
  // Demo baseline date
  const baseDate = useMemo(() => {
    return asOf ? new Date(asOf.slice(0, 10)) : new Date(2026, 2, 1); // March 2026 default
  }, [asOf]);

  const [viewYear, setViewYear] = useState(() => baseDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => baseDate.getMonth()); // 0-indexed

  // Today in YYYY-MM-DD
  const todayStr = useMemo(() => {
    const y = baseDate.getFullYear();
    const m = String(baseDate.getMonth() + 1).padStart(2, "0");
    const d = String(baseDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [baseDate]);

  // Index marks by YYYY-MM-DD
  const marksByDay = useMemo(() => {
    const map = new Map<string, CalendarMark[]>();
    for (const m of marks) {
      const key = m.dueOn.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(m);
      map.set(key, list);
    }
    return map;
  }, [marks]);

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateStr: string;
      inCurrentMonth: boolean;
      isToday: boolean;
      marks: CalendarMark[];
    }> = [];

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 12 : viewMonth;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${prevY}-${String(prevM).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      days.push({
        dayNumber: dayNum,
        dateStr,
        inCurrentMonth: false,
        isToday: dateStr === todayStr,
        marks: marksByDay.get(dateStr) ?? [],
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        dayNumber: d,
        dateStr,
        inCurrentMonth: true,
        isToday: dateStr === todayStr,
        marks: marksByDay.get(dateStr) ?? [],
      });
    }

    // Trailing days from next month to fill 5 or 6 rows (multiples of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextM = viewMonth === 11 ? 1 : viewMonth + 2;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${nextY}-${String(nextM).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({
        dayNumber: i,
        dateStr,
        inCurrentMonth: false,
        isToday: dateStr === todayStr,
        marks: marksByDay.get(dateStr) ?? [],
      });
    }

    return days;
  }, [viewYear, viewMonth, todayStr, marksByDay]);

  const monthYearLabel = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  return (
    <div className="wall-calendar-container" aria-label="Wall calendar view">
      {/* Brass Mounting Rod and Leather Eyelets */}
      <div className="wall-calendar-mount" aria-hidden="true">
        <div className="calendar-nail left" />
        <div className="calendar-hanger-rod" />
        <div className="calendar-nail right" />
      </div>

      {/* Main Tear-off Calendar Pad */}
      <div className="wall-calendar-pad">
        {/* Perforated Tear Edge */}
        <div className="calendar-perforated-edge" aria-hidden="true">
          <span className="perforation-dots" />
        </div>

        {/* Calendar Header with Month, Year & Paging */}
        <div className="calendar-header-band">
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={prevMonth}
            aria-label="Previous month"
            title="Tear back to previous month"
          >
            ←
          </button>

          <div className="calendar-title-group">
            <h2 className="calendar-month-title">{monthYearLabel}</h2>
            <span className="calendar-subtitle">
              {marks.filter((m) => m.dueOn.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`)).length}{" "}
              obligations due
            </span>
          </div>

          <button
            type="button"
            className="calendar-nav-btn"
            onClick={nextMonth}
            aria-label="Next month"
            title="Flip to next month"
          >
            →
          </button>
        </div>

        {/* Weekday Labels (Sun - Sat) */}
        <div className="calendar-weekdays-grid" aria-hidden="true">
          {WEEKDAYS.map((day) => (
            <div key={day} className="calendar-weekday-header">
              {day}
            </div>
          ))}
        </div>

        {/* 7-Column Days Grid */}
        <div className="calendar-days-grid" role="grid" aria-label={`${monthYearLabel} calendar`}>
          {calendarDays.map((cell) => {
            const hasMarks = cell.marks.length > 0;
            const hasOverdue = cell.marks.some((m) => m.state === "overdue");
            const hasSoon = cell.marks.some((m) => m.state === "soon");
            const isSelected = selectedDate === cell.dateStr;

            const flagTone = hasOverdue
              ? "overdue"
              : hasSoon
                ? "soon"
                : hasMarks
                  ? "later"
                  : "none";

            return (
              <div
                key={cell.dateStr}
                role="gridcell"
                className={`calendar-day-cell${
                  !cell.inCurrentMonth ? " is-other-month" : ""
                }${cell.isToday ? " is-today" : ""}${
                  hasMarks ? " has-deadlines" : ""
                }${isSelected ? " is-selected" : ""}`}
                onClick={() => {
                  if (hasMarks) {
                    onSelectDate?.(isSelected ? null : cell.dateStr);
                    if (cell.marks[0]) onSelectMark?.(cell.marks[0]);
                  }
                }}
                tabIndex={hasMarks ? 0 : -1}
                aria-selected={isSelected}
                aria-label={`${cell.dateStr}${
                  cell.isToday ? ", today" : ""
                }${hasMarks ? `, ${cell.marks.length} deadline items` : ""}`}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && hasMarks) {
                    e.preventDefault();
                    onSelectDate?.(isSelected ? null : cell.dateStr);
                    if (cell.marks[0]) onSelectMark?.(cell.marks[0]);
                  }
                }}
              >
                {/* Day Number Header */}
                <div className="day-number-row">
                  <span className={`day-number${cell.isToday ? " today-badge" : ""}`}>
                    {cell.dayNumber}
                  </span>
                  {cell.isToday && <span className="today-pill">TODAY</span>}
                </div>

                {/* Deadlines Flags / Markers on this day */}
                {hasMarks && (
                  <div className="day-flags-container">
                    {cell.marks.map((m) => {
                      const stateBadge =
                        m.state === "overdue"
                          ? "OVERDUE"
                          : m.state === "done"
                            ? "DONE"
                            : m.days === 0
                              ? "TODAY"
                              : `${m.days}d`;

                      return (
                        <div
                          key={m.obligation.id}
                          className={`day-flag-chip flag-${m.state}`}
                          title={`${m.obligation.title} — ${
                            m.state === "overdue"
                              ? "OVERDUE"
                              : `Due in ${m.days} days`
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDate?.(cell.dateStr);
                            onSelectMark?.(m);
                          }}
                        >
                          <span className="flag-pip" />
                          <span className="flag-title">{m.obligation.title}</span>
                          <span className="flag-time-badge">{stateBadge}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend Bar at Bottom of Calendar Pad */}
        <div className="calendar-footer-legend">
          <span className="legend-item">
            <span className="legend-flag flag-overdue" />
            <strong>Overdue</strong> (Immediate risk)
          </span>
          <span className="legend-item">
            <span className="legend-flag flag-soon" />
            <strong>Next 14–30 days</strong> (Action required)
          </span>
          <span className="legend-item">
            <span className="legend-flag flag-later" />
            <strong>Later</strong> (Scheduled)
          </span>
        </div>
      </div>
    </div>
  );
}
