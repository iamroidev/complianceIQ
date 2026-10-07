import Link from "next/link";
import { AuditPackFan, PolicyToChecks } from "@/components/illustration/scenes";
import {
  AI_SECTION,
  CLOSING,
  COMPARE_SECTION,
  PACK_SECTION,
  STATEMENTS,
  type LandingFacts,
} from "./content";
import { BleedMotif, PaperTear, ThreadBunting, SectionTransitionVignette } from "./Transitions";
import {
  PolicyObligationIllustration,
  AlertBriefingIllustration,
  AuditChainIllustration,
  HumanGatekeeperIllustration,
  DossierClosingHero,
} from "./LandingIllustrations";

function ThreadConnector() {
  return (
    <svg
      className="lp-thread-connector"
      viewBox="0 0 40 34"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 3 C 30 12, 10 22, 32 31" pathLength={1} strokeDasharray={1} />
    </svg>
  );
}

/** §15.3's three plain statements — now illustrated with authentic archival artifacts. */
export function Statements() {
  const illustrations = [
    <PolicyObligationIllustration key="ill-0" size={190} />,
    <AlertBriefingIllustration key="ill-1" size={190} />,
    <AuditChainIllustration key="ill-2" size={190} />,
  ];

  return (
    <section className="lp-band lp-band--white" id="statements">
      <PaperTear tone="canvas" variant={1} />
      <div className="lp-container">
        <div className="lp-statements">
          {STATEMENTS.map((statement, idx) => (
            <div className="lp-statement" key={statement.heading} data-reveal>
              <div className="lp-statement-visual" aria-hidden="true">
                {illustrations[idx]}
              </div>
              <h2>{statement.heading}</h2>
              <p>{statement.body}</p>
            </div>
          ))}
        </div>
      </div>
      <SectionTransitionVignette tag="RULE-CHECK PIPELINE" tone="white" variant="knot" />
    </section>
  );
}

/** §19.3 — the policy sheet pulls one sentence into a check as the section enters. */
export function PolicySection({ facts }: { facts: LandingFacts }) {
  return (
    <section className="lp-band" id="policies">
      <PaperTear tone="white" variant={2} />
      <div className="lp-container">
        <div className="lp-split">
          <div data-reveal>
            <p className="lp-kicker">Policies into checks</p>
            <h2 className="lp-coverage-note">
              {facts.checked} of {facts.coverageTotal} obligations are checked
              automatically.
            </h2>
            <p className="lp-lede">
              Upload a policy, confirm what it obliges you to do, and every rule
              checks it from then on. What has no check is said plainly.
            </p>
            <a className="lp-link" href="/policy-coverage">
              See the policy library
            </a>
          </div>
          <div className="lp-scene" id="policy-scene">
            <PolicyToChecks size={560} />
          </div>
        </div>
      </div>
      <SectionTransitionVignette tag="FOUR-STEP CASE LIFECYCLE" tone="canvas" variant="eyelet" />
    </section>
  );
}

/** §19.7 — two lanes + human gatekeeper illustration; AI output passes a checked-against-sources gate to a person. */
export function AiSection() {
  return (
    <section className="lp-band lp-band--bunt" id="ai">
      <PaperTear tone="ink" variant={3} />
      <ThreadBunting variant="ai" />
      <div className="lp-container">
        <p className="lp-kicker" data-reveal>
          People stay in charge
        </p>
        <h2 className="lp-h2" data-reveal>
          {AI_SECTION.heading}
        </h2>

        <div className="lp-lanes" data-reveal>
          <div className="lp-lane">
            <h3>{AI_SECTION.rulesLane.title}</h3>
            <ul className="lp-chip-list">
              {AI_SECTION.rulesLane.items.map((item) => (
                <li className="lp-chip" key={item}>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="lp-lane">
            <h3>{AI_SECTION.helpsLane.title}</h3>
            <ul className="lp-chip-list">
              {AI_SECTION.helpsLane.items.map((item) => (
                <li className="lp-chip" key={item}>
                  {item}
                </li>
              ))}
            </ul>
            <div className="lp-lane-flow">
              <ThreadConnector />
              <span className="lp-gate">{AI_SECTION.gate}</span>
              <ThreadConnector />
              <span className="lp-person">{AI_SECTION.person}</span>
            </div>
          </div>
        </div>

        {/* Dedicated Human Gatekeeper & Verification Pipeline Illustration */}
        <div data-reveal>
          <HumanGatekeeperIllustration size={560} />
        </div>

        <p className="lp-ai-caption" data-reveal>
          {AI_SECTION.caption}
        </p>
        <p className="lp-ai-limit" data-reveal>
          {AI_SECTION.limit}
        </p>
      </div>
      <SectionTransitionVignette tag="EVIDENCE AUDIT PACK" tone="canvas" variant="seal" />
    </section>
  );
}

/** §19.8 — the fan scene plus a plain list of what the pack contains. */
export function PackSection() {
  return (
    <section className="lp-band lp-band--white" id="pack">
      <PaperTear tone="canvas" variant={1} />
      <div className="lp-container">
        <div className="lp-split">
          <div className="lp-scene" id="pack-fan">
            <AuditPackFan size={440} />
          </div>
          <div data-reveal>
            <p className="lp-kicker">One export, ready to hand over</p>
            <h2 className="lp-h2">{PACK_SECTION.heading}</h2>
            <p className="lp-lede">{PACK_SECTION.intro}</p>
            <ul className="lp-pack-list">
              {PACK_SECTION.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="lp-pack-closing">{PACK_SECTION.closing}</p>
          </div>
        </div>
      </div>
      <SectionTransitionVignette tag="HONEST COMPARISON" tone="white" variant="eyelet" />
    </section>
  );
}

/** §19.9 — only claims the demo proves, with the required footnote. */
export function CompareSection() {
  const [first, ...rest] = COMPARE_SECTION.columns;
  return (
    <section className="lp-band" id="compare">
      <PaperTear tone="white" variant={2} />
      <BleedMotif kind="stamp" />
      <div className="lp-container">
        <p className="lp-kicker" data-reveal>
          What other tools usually do
        </p>
        <h2 className="lp-h2" data-reveal>
          {COMPARE_SECTION.heading}
        </h2>
        <div className="lp-table-wrap" data-reveal>
          <table className="lp-table">
            <thead>
              <tr>
                <th scope="col">{first}</th>
                {rest.map((column) => (
                  <th scope="col" key={column}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_SECTION.rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {row.cells.map((cell, index) => (
                    <td key={`${row.label}-${index}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="lp-footnote">{COMPARE_SECTION.footnote}</p>
      </div>
      <SectionTransitionVignette tag="VERIFICATION DOSSIER" tone="canvas" variant="seal" />
    </section>
  );
}

/** §19.10 — closing line, CTA, with the archival Case Dossier illustration. */
export function Closing({ onOpenDemo }: { onOpenDemo?: () => void }) {
  return (
    <section className="lp-band lp-closing">
      <BleedMotif kind="seal" />
      <div className="lp-container">
        {/* Archival Case Dossier Ready for Audit Illustration */}
        <div data-reveal>
          <DossierClosingHero size={320} />
        </div>
        <p className="lp-closing-line" data-reveal>
          {CLOSING.line}
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          {onOpenDemo ? (
            <button type="button" className="lp-btn lp-btn--solid" onClick={onOpenDemo}>
              {CLOSING.cta}
            </button>
          ) : (
            <Link className="lp-btn lp-btn--solid" href="/alerts">
              {CLOSING.cta}
            </Link>
          )}
          <Link className="lp-btn lp-btn--outline" href="/overview?tour=start">
            Take Guided Tour
          </Link>
        </div>
      </div>
    </section>
  );
}

