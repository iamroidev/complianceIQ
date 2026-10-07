"use client";

import { useRouter } from "next/navigation";
import { Folder } from "../kit/Folder";
import { DeskLamp, DeskCalendar } from "../kit/DeskComponents";

export interface FolderData {
  domain: string;
  title: string;
  count: number;
  critical: boolean;
  dueSoon: boolean;
}

export interface OverviewDeskProps {
  folders: FolderData[];
  lampActive?: boolean;
  calendarDay?: number;
  calendarMonth?: string;
  flagDays?: number;
  className?: string;
}

/**
 * OverviewDesk (DESIGN §28.4, §29.3):
 * "The desk" hero object: six case folders on a cream desk surface with a lamp edge
 * and a desk calendar. Bound directly to real alert counts, critical flags, and SLAs.
 */
export function OverviewDesk({
  folders,
  lampActive = true,
  calendarDay = 14,
  calendarMonth = "MAR",
  flagDays = 4,
  className = "",
}: OverviewDeskProps) {
  const router = useRouter();

  return (
    <section
      className={`overview-desk ${className}`}
      aria-label="The case room desk: case folders by area"
    >
      <div className="desk-surface">
        {/* Desk accessory items across the top */}
        <div className="desk-top-row">
          <div className="desk-lamp-wrapper" aria-hidden="true">
            <DeskLamp active={lampActive} size={120} />
          </div>

          <div className="desk-calendar-wrapper">
            <DeskCalendar
              day={calendarDay}
              month={calendarMonth}
              flagDays={flagDays}
              size={100}
            />
          </div>
        </div>

        {/* The 6 folders arranged on the desk surface */}
        <div className="desk-folders-grid" role="list" aria-label="Open case folders">
          {folders.map((folder) => (
            <button
              type="button"
              key={folder.domain}
              className="desk-folder-btn"
              role="listitem"
              onClick={() => router.push(`/alerts?domain=${folder.domain}`)}
              title={`View ${folder.title} alerts (${folder.count} open)`}
            >
              <Folder
                title={folder.title}
                count={folder.count}
                critical={folder.critical}
                dueSoon={folder.dueSoon}
                width={190}
                height={140}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
