"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

/**
 * Global command search (DESIGN §27.5 / tour step 4): jump to any alert,
 * person, policy document, or evidence item. Every result comes from the
 * live APIs — nothing here is a hardcoded fixture. Opened with ⌘K / Ctrl+K
 * from anywhere, or with "/" off the alerts screen.
 */

interface PaletteResult {
  key: string;
  group: string;
  title: string;
  detail: string;
  href: string;
}

interface Dataset {
  alerts?: Array<{ id: string; summarySentence: string; severity: string; status: string }>;
  rows?: Array<{ id: string; name: string; role: string; department: string }>;
  policies?: Array<{ id: string; title: string; kind: string }>;
  evidence?: Array<{ id: string; title: string; kind: string; source: string }>;
}

const MAX_RESULTS = 24;

export function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PaletteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setActive(0);
    let cancelled = false;
    setLoading(true);

    const grab = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));

    Promise.all([
      grab("/api/alerts"),
      grab("/api/registers/people"),
      grab("/api/policies"),
      grab("/api/evidence"),
    ]).then(([alerts, people, policies, evidence]: Dataset[]) => {
      if (cancelled) return;
      const items: PaletteResult[] = [];
      for (const alert of alerts.alerts ?? []) {
        items.push({
          key: `alert:${alert.id}`,
          group: "Alert",
          title: alert.summarySentence,
          detail: `${alert.severity} · ${alert.status}`,
          href: `/alerts/${alert.id}`,
        });
      }
      for (const person of people.rows ?? []) {
        items.push({
          key: `person:${person.id}`,
          group: "Person",
          title: person.name,
          detail: `${person.role} · ${person.department}`,
          href: `/registers/people/${person.id}`,
        });
      }
      for (const policy of policies.policies ?? []) {
        items.push({
          key: `policy:${policy.id}`,
          group: "Policy",
          title: policy.title,
          detail: policy.kind,
          href: "/policies",
        });
      }
      for (const item of evidence.evidence ?? []) {
        items.push({
          key: `evidence:${item.id}`,
          group: "Evidence",
          title: item.title,
          detail: item.source,
          href: `/evidence/${item.id}`,
        });
      }
      setResults(items);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Unfiltered: interleave the groups so every kind gets an early slot.
      const buckets = new Map<string, PaletteResult[]>();
      for (const r of results) {
        const list = buckets.get(r.group) ?? [];
        list.push(r);
        buckets.set(r.group, list);
      }
      const mixed: PaletteResult[] = [];
      let added = true;
      let round = 0;
      while (added && mixed.length < MAX_RESULTS) {
        added = false;
        for (const list of buckets.values()) {
          if (round < list.length && mixed.length < MAX_RESULTS) {
            mixed.push(list[round]);
            added = true;
          }
        }
        round += 1;
      }
      return mixed;
    }
    const matches = results.filter((r) =>
      `${r.group} ${r.title} ${r.detail}`.toLowerCase().includes(q),
    );
    return matches.slice(0, MAX_RESULTS);
  }, [results, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const choose = (result: PaletteResult) => {
    onClose();
    router.push(result.href);
  };

  return (
    <div
      className="cmdk-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="cmdk-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Search alerts, people, policies, evidence"
      >
        <div className="cmdk-input-row">
          <Search size={16} className="cmdk-search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            className="cmdk-input"
            placeholder="Search alerts, people, policies, evidence…"
            aria-label="Search alerts, people, policies, evidence"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((i) => Math.min(i + 1, filtered.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (event.key === "Enter") {
                event.preventDefault();
                const pick = filtered[active];
                if (pick) choose(pick);
              } else if (event.key === "Escape") {
                event.preventDefault();
                onClose();
              }
            }}
          />
          <kbd>Esc</kbd>
        </div>

        <div className="cmdk-results">
          {loading && (
            <p className="cmdk-empty" role="status">
              Reading the registers…
            </p>
          )}
          {!loading && filtered.length === 0 && (
            <p className="cmdk-empty">
              Nothing matches “{query.trim()}”.
            </p>
          )}
          {!loading &&
            filtered.map((result, index) => (
              <button
                key={result.key}
                type="button"
                className={`cmdk-item${index === active ? " is-active" : ""}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(result)}
              >
                <span className="cmdk-group">{result.group}</span>
                <span className="cmdk-title">{result.title}</span>
                <span className="cmdk-detail">{result.detail}</span>
              </button>
            ))}
        </div>

        <div className="cmdk-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> move
          </span>
          <span>
            <kbd>Enter</kbd> open
          </span>
          <span>
            <kbd>Esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
