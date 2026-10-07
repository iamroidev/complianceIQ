import { chromium } from "@playwright/test";

const targets = [
  { name: "ErrorDroppedLink" },
  { name: "SpotVendor" },
  { name: "RecordsVerified" },
  { name: "EmptyNotFound" },
  { name: "VendorBox", index: 2 },
  { name: "HeroCaseFile" },
];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3100/styleguide/illustrations", {
  waitUntil: "networkidle",
});

for (const { name, index = 0 } of targets) {
  const html = await p.evaluate(
    ({ n, i }) => {
      const heading = [...document.querySelectorAll("h2,h3,h4,h5,p,span,div")].find(
        (el) => el.textContent?.trim() === n && el.children.length === 0,
      );
      if (!heading) return "NOT FOUND";
      let card = heading.parentElement;
      while (card && card.querySelectorAll("svg").length < 1) card = card.parentElement;
      const svgs = card.querySelectorAll("svg");
      const svg = svgs[i];
      if (!svg) return `NO SVG ${i} of ${svgs.length}`;
      return svg.outerHTML.replace(/></g, ">\n<");
    },
    { n: name, i: index },
  );
  console.log(`===== ${name} [${index}] =====`);
  console.log(html);
}
await b.close();
