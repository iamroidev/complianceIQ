import { chromium } from "@playwright/test";

const targets = [
  "HeroCaseFile",
  "StepDetect",
  "StepExplain",
  "StepDecide",
  "StepProve",
  "SpotCertificate",
  "SpotPayment",
  "SpotDeadline",
  "SpotAccess",
  "SpotVendor",
  "SpotCode",
  "PolicyToChecks",
  "AuditPackFan",
  "EmptyAlerts",
  "EmptyEvidence",
  "EmptyObligations",
  "EmptySearch",
  "EmptyCoverageGap",
  "ErrorDroppedLink",
  "EmptyNotFound",
  "SealedConfirmation",
  "TamperDetected",
  "RecordsVerified",
  "VendorBox",
];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3100/styleguide/illustrations", {
  waitUntil: "networkidle",
});

const boxes = await p.evaluate((names) => {
  const out = {};
  const all = document.querySelectorAll("h2, h3, h4, h5, p, span, div");
  for (const name of names) {
    for (const el of all) {
      if (el.textContent?.trim() === name && el.children.length === 0) {
        const r = el.getBoundingClientRect();
        out[name] = {
          y: Math.round(r.top + window.scrollY),
          h: Math.round(r.height),
        };
        break;
      }
    }
  }
  return out;
}, targets);

console.log(JSON.stringify(boxes, null, 1));
await b.close();
