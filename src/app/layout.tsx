import type { Metadata } from "next";
import { GeistSans, GeistMono } from "@/app/fonts";
import { Newsreader } from "next/font/google";
import "./globals.css";
import "@/styles/app.css";
import "@/styles/landing.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ComplianceIQ — Automated Compliance Monitoring & Auditing",
  description:
    "An automated compliance monitoring and auditing system. Rules engine checks employee certifications, financial thresholds, regulatory deadlines, and vendor requirements — while AI interprets policies, explains findings, and generates audit-ready reports.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${newsreader.variable}`}
    >
      <body>
        {/* Resolve reduce-motion before first paint: URL > saved > OS (DESIGN §17). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var u=new URLSearchParams(location.search).get("motion");var s=localStorage.getItem("ciq-reduce-motion");var on=u==="reduce"||u!=="full"&&(s==="on"||s!=="off"&&matchMedia("(prefers-reduced-motion: reduce)").matches);document.documentElement.dataset.reduceMotion=on?"true":"false";}catch(e){}})();`,
          }}
        />
        {/* Row density (DESIGN §19): saved choice, comfortable by default. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=localStorage.getItem("ciq-density");document.documentElement.dataset.density=(d==="compact")?"compact":"comfortable";}catch(e){}})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
