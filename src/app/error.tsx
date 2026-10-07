"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ErrorDroppedLink } from "@/components/illustration/scenes/Empties";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected client exceptions for observability
    console.error("Global application error:", error);
  }, [error]);

  return (
    <main className="page error-page" style={{ textAlign: "center", padding: "80px 24px", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }} aria-hidden="true">
        <ErrorDroppedLink size={180} />
      </div>
      <h1 className="page-headline" style={{ marginBottom: "12px", fontSize: "24px" }}>
        Something stopped this view from loading
      </h1>
      <p className="page-note" style={{ marginBottom: "32px", fontSize: "15px", lineHeight: "1.5" }}>
        An unexpected error occurred while rendering the page. Your audit records and decisions remain safe and untampered.
      </p>
      <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
        <button
          type="button"
          onClick={() => reset()}
          className="btn btn-primary"
          style={{ padding: "10px 18px", cursor: "pointer" }}
        >
          Try again
        </button>
        <Link href="/overview" className="btn btn-secondary" style={{ padding: "10px 18px", textDecoration: "none", display: "inline-block" }}>
          Return to Overview
        </Link>
      </div>
    </main>
  );
}
