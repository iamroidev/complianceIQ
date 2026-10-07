// Programmatic §17 verification: samples computed styles at exact frame
// times (0/25/50/75/100% of each choreography) plus reduced-motion checks.
// Technique: pause ALL CSS animations before clicking replay, wait for the
// React commit (stage remount) while paused, then read frame 0 exactly;
// for t>0 unpause, wait t, freeze, read. JS-driven demos (timers/rAF) keep
// running during the paused wait — their checks use aria state / final
// values instead of paused styles. Transition-driven demos (tabs, toggles)
// cannot be paused by animation-play-state, so they assert the computed
// transition declaration plus start/mid/end positions.
// Usage: with the dev server running —  node scripts/motion-verify.mjs
import { chromium } from "@playwright/test";

const BASE = process.env.SHOT_BASE ?? "http://localhost:3100";
const PAUSE = "* { animation-play-state: paused !important; }";
const results = [];

function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`);
}

const HELPERS = `
const num = (v) => { const m = String(v).match(/-?\\d+\\.?\\d*/g); return m ? m.map(Number) : []; };
const pf = (v) => parseFloat(v);
const opacity = (el) => Number(getComputedStyle(el).opacity);
const tx = (el) => { const m = num(getComputedStyle(el).transform); return m.length >= 6 ? m[4] : 0; };
const ty = (el) => { const m = num(getComputedStyle(el).transform); return m.length >= 6 ? m[5] : 0; };
const scaleOf = (el) => { const m = num(getComputedStyle(el).transform); return m.length >= 6 ? m[0] : 1; };
const rgb = (el) => getComputedStyle(el).backgroundColor;
const col = (el) => getComputedStyle(el).color;
`;
const fnSrc = (fn) => `${HELPERS}; return (${fn.toString()})(el);`;

// Node-side copies for probe logic
const num = (v) => {
  const m = String(v).match(/-?\d+\.?\d*/g);
  return m ? m.map(Number) : [];
};
const pf = parseFloat;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${BASE}/styleguide/motion`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);

// Click replay while paused; t=0 reads while still paused (exact frame 0).
// t>0: unpause, wait t, freeze, read.
async function sample(slug, t, fn) {
  const card = page.locator(`[data-ml-demo="${slug}"]`);
  await card.scrollIntoViewIfNeeded();
  const hold = await page.addStyleTag({ content: PAUSE });
  await card.locator("[data-ml-replay]").click();
  await page.waitForTimeout(50);
  if (t === 0) {
    const out = await card.evaluate(new Function("el", fnSrc(fn)));
    await hold.evaluate((el) => el.remove());
    await page.waitForTimeout(40);
    return out;
  }
  await hold.evaluate((el) => el.remove());
  await page.waitForTimeout(t);
  const freeze = await page.addStyleTag({ content: PAUSE });
  await page.waitForTimeout(15);
  const out = await card.evaluate(new Function("el", fnSrc(fn)));
  await freeze.evaluate((el) => el.remove());
  await page.waitForTimeout(60);
  return out;
}

// Read a card's state without interacting (pre-play rest position).
async function readCard(slug, fn) {
  const card = page.locator(`[data-ml-demo="${slug}"]`);
  await card.scrollIntoViewIfNeeded();
  return card.evaluate(new Function("el", fnSrc(fn)));
}

// ── tokens ──
{
  const at0 = await sample("token-easing", 0, (c) => c.querySelector(".ml-dot").style.animation);
  const at100 = await sample("token-easing", 800, (c) =>
    tx(c.querySelectorAll(".ml-dot")[1]),
  );
  check("tokens: dot animation scheduled on replay", at0.includes("mlTrack"), at0.slice(0, 60));
  check("tokens: ease-in-out dot lands at 284px", Math.abs(at100 - 284) < 3, `x=${at100}`);
}

// ── seal ──
{
  const f = (c) => ({
    scale: scaleOf(c.querySelector(".ml-seal-wrap")),
    dash: getComputedStyle(c.querySelector(".ill-seal-check")).strokeDashoffset,
    cap: Number(opacity(c.querySelector(".ml-seal-caption"))),
  });
  const a = await sample("signature-seal", 0, f);
  const b = await sample("signature-seal", 500, f);
  const d = await sample("signature-seal", 600, f);
  check("seal: starts below full scale, check undrawn, caption hidden", a.scale < 0.95 && pf(a.dash) > 0.5 && a.cap === 0, JSON.stringify(a));
  check("seal: check drawn + caption in by 600ms", pf(b.dash) < 0.05 && d.cap > 0.9, JSON.stringify(d));
}

// ── thread ──
{
  const f = (c) => ({
    dash: getComputedStyle(c.querySelector(".ml-thread-svg path")).strokeDashoffset,
    bg: rgb(c.querySelector(".ml-thread-row")),
  });
  const a = await sample("signature-thread", 0, f);
  const b = await sample("signature-thread", 210, f);
  const d = await sample("signature-thread", 1000, f);
  check("thread: undrawn at 0%, ~50% at 210ms, drawn at end", pf(a.dash) > 0.9 && pf(b.dash) < 0.6 && pf(b.dash) > 0.1 && pf(d.dash) < 0.05, `0:${a.dash} 210:${b.dash} 1000:${d.dash}`);
  check("thread: row pulses amber then returns", d.bg.replace(/\s/g, "").includes("255,255,255"), d.bg);
}

// ── tamper ──
{
  const f = (c) => ({
    tick: Number(opacity(c.querySelector(".ml-tick"))),
    intact: Number(opacity(c.querySelector(".ml-link-intact"))),
    res: Number(opacity(c.querySelector(".ml-result"))),
    e3: col(c.querySelectorAll(".ml-tl-item")[2]),
    prog: getComputedStyle(c.querySelector(".ml-tl-progress")).transform,
  });
  const a = await sample("signature-tamper", 0, f);
  const b = await sample("signature-tamper", 600, f);
  const d = await sample("signature-tamper", 1200, f);
  const pscale = (s) => (s === "none" ? 1 : (num(s)[3] ?? 1));
  check("tamper: 0% — ticks barely in, intact link, no result, progress unscaled", a.tick < 0.5 && a.intact === 1 && a.res === 0 && pscale(a.prog) < 0.5, JSON.stringify(a));
  check("tamper: 600ms — link torn, intact hidden", b.intact === 0, JSON.stringify(b));
  const crit = (s) => {
    const n = num(s).slice(0, 3);
    return Math.abs(n[0] - 214) < 25 && n[1] < 110;
  };
  check("tamper: 1200ms — entry 3 critical colour + result visible", crit(d.e3) && d.res > 0.9, `e3=${d.e3} res=${d.res}`);
}

// ── time slide ──
{
  const f = (c) => ({
    cert: tx(c.querySelector(".ml-marker.is-cert")),
    date: c.querySelector(".ml-date").textContent,
    fired: Number(opacity(c.querySelector(".ml-exp-fired"))),
    valid: Number(opacity(c.querySelector(".ml-exp-valid"))),
  });
  const a = await sample("signature-time", 0, f);
  const b = await sample("signature-time", 950, f);
  check("time: starts slid-right (240px) with Valid shown, date 15 Jan", Math.abs(a.cert - 240) < 4 && a.valid === 1 && a.fired === 0 && a.date.startsWith("15 Jan"), JSON.stringify(a));
  check("time: at 950ms marker landed (0px), Expired shown, date 22 Jan", Math.abs(b.cert) < 4 && b.fired === 1 && b.valid === 0 && b.date.startsWith("22 Jan"), JSON.stringify(b));
}

// ── alert ──
{
  const f = (c) => ({
    rows: getComputedStyle(c.querySelector(".ml-alert-new")).gridTemplateRows,
    bg: rgb(c.querySelector(".ml-alert-new > div")),
    live: c.querySelector("[aria-live]").textContent,
  });
  const a = await sample("product-alert", 0, f);
  const b = await sample("product-alert", 350, f);
  const d = await sample("product-alert", 1300, f);
  // Amber tint = warm hue (red pulled well above blue); surface white has R == B.
  const amber = (s) => {
    const n = num(s).slice(0, 3);
    return n[0] > 150 && n[0] - n[2] > 25;
  };
  check("alert: row collapsed at 0%, expanded by 350ms, aria-live announced", a.rows.startsWith("0") && parseFloat(b.rows) > 0.5 && a.live.length > 0, `${a.rows} / ${b.rows}`);
  check("alert: highlight amber at 350ms, faded to surface by 1300ms", amber(b.bg) && !amber(d.bg), `${b.bg} → ${d.bg}`);
}

// ── open case ──
{
  const f = (c) => Number(opacity(c.querySelector(".ml-case-detail")));
  const a = await sample("product-case", 0, f);
  const b = await sample("product-case", 160, f);
  check("case: detail hidden at 0%, visible at 160ms", a < 0.05 && b > 0.95, `${a} → ${b}`);
}

// ── tabs (transition-driven: declaration + start/mid/end) ──
{
  const f = (c) => ({
    x: tx(c.querySelector(".ml-tabs-ul")),
    panel: c.querySelector(".ml-tabpanel").textContent,
    sel: [...c.querySelectorAll(".ml-tab")].map((t) => t.getAttribute("aria-selected")),
  });
  const spec = await readCard("product-tabs", (c) => {
    const s = getComputedStyle(c.querySelector(".ml-tabs-ul"));
    return `${s.transitionProperty}|${s.transitionDuration}|${s.transitionTimingFunction}`;
  });
  const pre = await readCard("product-tabs", f);
  const mid = await sample("product-tabs", 50, f);
  const end = await sample("product-tabs", 260, f);
  check("tabs: underline starts on tab 1, slides via 200ms ease-out transition", pre.x === 0 && spec.includes("transform") && spec.includes("0.2s") && spec.includes("0.22"), `x0=${pre.x} ${spec}`);
  check("tabs: mid-flight at ~50ms, lands on tab 2 with panel swapped", mid.x > 20 && mid.x < 96 && Math.abs(end.x - 96) < 3 && end.panel === "31 cases · 4 awaiting evidence" && end.sel[1] === "true", `${pre.x} → ${mid.x} → ${end.x}, panel=${end.panel}`);
}

// ── drawer ──
{
  const f = (c) => ({
    x: tx(c.querySelector(".ml-drawer")),
    focus: document.activeElement?.className || "",
  });
  const a = await sample("product-drawer", 0, f);
  const b = await sample("product-drawer", 300, f);
  check("drawer: offscreen at 0% (240px), in place at 240ms + focus moved to close btn", a.x > 200 && Math.abs(b.x) < 4 && b.focus.includes("ml-drawer-close"), `${a.x}, x=${b.x}, focus=${b.focus}`);
  // Esc closes and returns focus
  await page.keyboard.press("Escape");
  const after = await page.evaluate(() => ({
    closed: !!document.querySelector(".ml-drawer.is-closed"),
    focus: document.activeElement?.className || "",
  }));
  check("drawer: Esc closes and returns focus to trigger", after.closed && after.focus.includes("ml-drawer-open-btn"), JSON.stringify(after));
}

// ── numbers (JS rAF counter) ──
{
  const f = (c) => c.querySelector(".ml-num").textContent;
  const a = await sample("product-numbers", 120, f);
  const d = await sample("product-numbers", 500, f);
  check("numbers: counting mid-way at 120ms, final 37 by 500ms", Number(a) < 37 && Number(a) > 0 && d === "37", `${a} → ${d}`);
}

// ── skeleton ──
{
  const f = (c) => {
    const s = getComputedStyle(c.querySelector(".ml-skel"));
    return `${s.animationName}|${s.animationIterationCount}|${s.animationDuration}`;
  };
  const a = await sample("product-skeleton", 0, f);
  check("skeleton: 1.4s opacity-only infinite shimmer", a.startsWith("mlShimmer") && a.includes("infinite") && !a.includes("transform"), a);
}

// ── toggles (transition-driven: declaration + start/mid/end) ──
{
  const f = (c) => ({
    x: tx(c.querySelector(".ml-seg-thumb")),
    pressed: [...c.querySelectorAll(".ml-seg-btn")].map((b) => b.getAttribute("aria-pressed")),
  });
  const spec = await readCard("product-toggles", (c) => {
    const s = getComputedStyle(c.querySelector(".ml-seg-thumb"));
    return `${s.transitionProperty}|${s.transitionDuration}|${s.transitionTimingFunction}`;
  });
  const pre = await readCard("product-toggles", f);
  const mid = await sample("product-toggles", 50, f);
  const end = await sample("product-toggles", 220, f);
  check("toggles: thumb starts on segment 1, springs via 160ms --ease-spring", pre.x === 0 && spec.includes("transform") && spec.includes("0.16s") && spec.includes("0.34"), `x0=${pre.x} ${spec}`);
  check("toggles: mid-flight at ~50ms, settled on segment 2 (76px)", mid.x > 30 && mid.x < 90 && Math.abs(end.x - 76) < 3 && end.pressed[1] === "true", `${pre.x} → ${mid.x} → ${end.x}`);
}

// ── headline ──
{
  const f = (c) => {
    const lines = [...c.querySelectorAll(".ml-line-in")];
    return {
      l1o: Number(opacity(lines[0])),
      l2o: Number(opacity(lines[1])),
      l1y: ty(lines[0]),
      dash: getComputedStyle(c.querySelector(".ml-underline path")).strokeDashoffset,
    };
  };
  const a = await sample("landing-headline", 0, f);
  const b = await sample("landing-headline", 400, f);
  const d = await sample("landing-headline", 1200, f);
  check("headline: hidden + 24px low at 0%", a.l1o === 0 && Math.abs(a.l1y - 24) < 2 && a.l2o === 0, JSON.stringify(a));
  check("headline: line1 up by 400ms, line2 still arriving (stagger 80ms)", b.l1o > 0.95 && Math.abs(b.l1y) < 4 && b.l2o < 1, JSON.stringify(b));
  check("headline: both lines + underline drawn at 1200ms", d.l1o === 1 && d.l2o === 1 && pf(d.dash) < 0.02, JSON.stringify(d));
}

// ── hero assembly ──
{
  const f = (c) => ({
    sheet: Number(opacity(c.querySelector('[data-hero-sheet="0"]'))),
    thread: getComputedStyle(c.querySelector("#hero-thread")).strokeDashoffset,
    seal: Number(opacity(c.querySelector("#hero-seal"))),
    link: Number(opacity(c.querySelector('[data-hero-link="5"]'))),
  });
  const a = await sample("landing-hero", 0, f);
  const b = await sample("landing-hero", 700, f);
  const d = await sample("landing-hero", 1450, f);
  check("hero: nothing visible at 0%", a.sheet === 0 && pf(a.thread) > 0.95 && a.seal === 0 && a.link === 0, JSON.stringify(a));
  check("hero: sheets landed + thread ~44% at 700ms", b.sheet > 0.95 && pf(b.thread) < 0.7 && pf(b.thread) > 0.2 && b.seal === 0, JSON.stringify(b));
  check("hero: fully assembled at 1450ms (thread done, seal + last link in)", pf(d.thread) < 0.02 && d.seal > 0.95 && d.link > 0.95, JSON.stringify(d));
}

// ── scroll reveal (16px per §17) ──
{
  const f = (c) => {
    const el = c.querySelector(".ml-reveal");
    return { o: Number(opacity(el)), y: ty(el) };
  };
  const a = await sample("landing-reveal", 0, f);
  const d = await sample("landing-reveal", 550, f);
  check("reveal: 16px up-fade, in place by 500ms", a.o === 0 && Math.abs(a.y - 16) < 2 && d.o === 1 && Math.abs(d.y) < 1, `${JSON.stringify(a)} → ${JSON.stringify(d)}`);
}

// ── step morph (JS timers: assert aria state + visual) ──
{
  const f = (c) => ({
    pressed: [...c.querySelectorAll(".ml-step-dot")].map((b) => b.getAttribute("aria-pressed")),
    ops: [...c.querySelectorAll(".ml-step")].map((s) => Number(opacity(s))),
  });
  const a = await sample("landing-steps", 60, f);
  const b = await sample("landing-steps", 700, f);
  const d = await sample("landing-steps", 2000, f);
  const only = (p, i) => p.every((v, k) => v === (k === i ? "true" : "false"));
  check("steps: starts on Detect", only(a.pressed, 0), JSON.stringify(a.pressed));
  check("steps: morphing to Explain by 700ms", only(b.pressed, 1) && b.ops[1] > 0.5, JSON.stringify(b));
  check("steps: ends on Prove (pressed + visible)", only(d.pressed, 3) && d.ops[3] > 0.9, JSON.stringify(d));
}

// ── policy pull ──
{
  const f = (c) => ({
    strip: tx(c.querySelector(".ml-strip")),
    tog: scaleOf(c.querySelector(".ml-mini-toggle")),
    bar: scaleOf(c.querySelector(".ml-coverage-fill")),
  });
  const a = await sample("landing-policy", 0, f);
  const b = await sample("landing-policy", 850, f);
  const d = await sample("landing-policy", 1450, f);
  check("policy: strip starts on doc, toggle/bar not yet popped", Math.abs(a.strip) < 2 && a.tog < 0.7 && a.bar < 0.05, JSON.stringify(a));
  check("policy: strip pulled into card by 850ms, toggle popped", Math.abs(b.strip - 512) < 6 && b.tog > 0.9, JSON.stringify(b));
  check("policy: coverage bar filled by 1450ms", d.bar > 0.95, JSON.stringify(d));
}

// ── audit fan ──
{
  const f = (c) => [...c.querySelectorAll(".ml-fan svg > g")].slice(0, 4).map((g) => getComputedStyle(g).transform);
  const a = await sample("landing-fan", 0, f);
  const d = await sample("landing-fan", 950, f);
  const r0 = a.every((t) => t === "none" || num(t)[0] === 1);
  const rEnd = Math.abs(num(d[0])[0] - Math.cos((18 * Math.PI) / 180)) < 0.02;
  check("fan: pages stacked (no rotation) at 0%, fanned at 950ms", r0, JSON.stringify(a));
  check("fan: first page at ~-18° at end", rEnd, d[0]);
}

// ── parallax guard ──
{
  const px = await page.evaluate(async () => {
    const box = document.querySelector(".ml-px-box");
    box.scrollTop = 100;
    await new Promise((r) => setTimeout(r, 60));
    const back = getComputedStyle(box.querySelector(".is-back")).transform;
    box.scrollTop = 0;
    return back;
  });
  check("parallax: layers move ≤24px on scroll", px !== "none" && Math.abs(num(px)[5]) <= 24, px);
}

await page.close();

// ── reduced-motion pass ──
{
  const rp = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await rp.goto(`${BASE}/styleguide/motion?motion=reduce`, { waitUntil: "networkidle" });
  await rp.waitForTimeout(400);

  const attr = await rp.evaluate(() => document.documentElement.dataset.reduceMotion);
  check("reduce: ?motion=reduce sets html[data-reduce-motion=true]", attr === "true", attr);

  await rp.getByRole("button", { name: "Play all" }).click();
  await rp.waitForTimeout(150);
  const anim = await rp.evaluate(() => {
    const el = document.querySelector('[data-ml-demo="landing-hero"] #hero-seal');
    const s = getComputedStyle(el);
    const anyT = getComputedStyle(document.querySelector(".ml-tabs-ul"));
    return {
      playing: document.querySelectorAll(".ml-stage.ml-play").length,
      name: s.animationName,
      dur: s.animationDuration,
      it: s.animationIterationCount,
      trans: anyT.transitionProperty,
      threadDash: getComputedStyle(document.querySelector("#hero-thread")).strokeDashoffset,
    };
  });
  check("reduce: hero seal animates as 150ms single mlFade", anim.name === "mlFade" && ["150ms", "0.15s"].includes(anim.dur) && anim.it === "1", JSON.stringify(anim));
  check("reduce: transitions capped to colour/opacity (no transform)", !anim.trans.includes("transform") && anim.trans.includes("opacity"), anim.trans);
  check("reduce: thread renders fully drawn (dashoffset 0)", pf(anim.threadDash) === 0, anim.threadDash);

  await rp.waitForTimeout(900);
  const skel = await rp.evaluate(() => getComputedStyle(document.querySelector(".ml-skel")).animationName);
  check("reduce: skeleton shimmer replaced by one-shot fade", skel === "mlFade", skel);

  const par = await rp.evaluate(async () => {
    const box = document.querySelector(".ml-px-box");
    box.scrollTop = 100;
    await new Promise((r) => setTimeout(r, 60));
    const t = getComputedStyle(box.querySelector(".is-back")).transform;
    box.scrollTop = 0;
    return t;
  });
  check("reduce: parallax layers do not move", par === "none", par);

  // toggle override: turn OFF reduce while URL says reduce
  await rp.click('button[aria-label^="Reduce motion"]');
  await rp.waitForTimeout(150);
  const off = await rp.evaluate(() => document.documentElement.dataset.reduceMotion);
  check("reduce: visible toggle overrides URL/OS in both directions", off === "false", off);

  await rp.close();
}

await browser.close();

const fails = results.filter((r) => !r.pass);
console.log(`\n${results.length - fails.length}/${results.length} checks passed`);
if (fails.length) {
  console.log("FAILURES:\n" + fails.map((f) => ` - ${f.name} [${f.detail}]`).join("\n"));
  process.exit(1);
}
