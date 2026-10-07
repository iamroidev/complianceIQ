import { chromium } from "@playwright/test";

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3100/styleguide/illustrations", {
  waitUntil: "networkidle",
});

async function card(label, file) {
  const heading = p.getByText(label, { exact: true }).first();
  const cardEl = heading.locator(
    '..',
  );
  await cardEl.screenshot({ path: `screenshots/${file}` });
}

await card("Stamp", "critique-stamp.png");
await card("CodeCard", "critique-codecard.png");
await b.close();

