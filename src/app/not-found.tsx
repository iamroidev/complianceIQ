import Link from "next/link";
import { EmptyNotFound } from "@/components/illustration/scenes/Empties";

export default function NotFound() {
  return (
    <main className="page not-found-page" style={{ textAlign: "center", padding: "80px 24px", maxWidth: "600px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }} aria-hidden="true">
        <EmptyNotFound size={180} />
      </div>
      <h1 className="page-headline" style={{ marginBottom: "12px", fontSize: "24px" }}>
        Page not found
      </h1>
      <p className="page-note" style={{ marginBottom: "32px", fontSize: "15px", lineHeight: "1.5" }}>
        The address you requested does not exist or has been moved. Check the link or return to the active cases.
      </p>
      <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
        <Link href="/overview" className="btn btn-primary" style={{ padding: "10px 18px", textDecoration: "none", display: "inline-block" }}>
          Go to Overview
        </Link>
        <Link href="/alerts" className="btn btn-secondary" style={{ padding: "10px 18px", textDecoration: "none", display: "inline-block" }}>
          View Alerts
        </Link>
      </div>
    </main>
  );
}
