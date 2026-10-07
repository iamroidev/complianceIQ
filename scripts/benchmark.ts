import { performance } from "node:perf_hooks";
import { TIER1_RULES } from "../src/core/engine/rules/index";
import { runRules } from "../src/core/engine/evaluate";
import type { ComplianceEvent, Registers, RuleContext } from "../src/core/types";

/**
 * MASTER §11 non-functional benchmark:
 * Evaluate 10,000 events and 2,000 register rows in < 2.0s.
 */
function generateSyntheticData(): { events: ComplianceEvent[]; registers: Registers } {
  const events: ComplianceEvent[] = [];
  const baseTime = new Date("2026-03-01T00:00:00.000Z").getTime();

  // Generate 10,000 realistic events spanning various domains
  for (let i = 0; i < 10000; i++) {
    const timestamp = new Date(baseTime + i * 60000).toISOString();
    const mod = i % 5;
    if (mod === 0) {
      events.push({
        id: `evt_aml_${i}`,
        domain: "finance",
        actor: { id: `p_${i % 100}`, name: `User ${i % 100}`, role: "teller" },
        action: "deposit_settled",
        resource: {
          type: "account",
          id: `acc_${i % 50}`,
        },
        context: {
          amountUsd: 9000 + (i % 2000),
          direction: "deposit",
        },
        timestamp,
        source: "core_banking",
      });
    } else if (mod === 1) {
      events.push({
        id: `evt_fin_${i}`,
        domain: "finance",
        actor: { id: `p_${i % 100}`, name: `User ${i % 100}`, role: "finance_analyst" },
        action: "payment_initiated",
        resource: {
          type: "payment",
          id: `pay_${i}`,
        },
        context: {
          amountUsd: 15000 + (i % 20000),
          approverIds: [`p_${(i + 1) % 100}`],
        },
        timestamp,
        source: "erp_system",
      });
    } else if (mod === 2) {
      events.push({
        id: `evt_iam_${i}`,
        domain: "access",
        actor: { id: `p_${i % 100}`, name: `User ${i % 100}`, role: "engineer" },
        action: i % 2 === 0 ? "commit_code" : "deploy_prod",
        resource: {
          type: "server",
          id: "prod_server",
        },
        context: {},
        timestamp,
        source: "git_system",
      });
    } else if (mod === 3) {
      events.push({
        id: `evt_hipaa_${i}`,
        domain: "healthcare",
        actor: { id: `p_${i % 100}`, name: `Doctor ${i % 100}`, role: "physician" },
        action: "record_viewed",
        resource: {
          type: "health_record",
          id: `rec_${i % 500}`,
          attributes: {
            classification: i % 10 === 0 ? "restricted" : "standard",
            careTeam: [`p_${(i + 2) % 100}`],
          },
        },
        context: {},
        timestamp,
        source: "ehr_system",
      });
    } else {
      events.push({
        id: `evt_dev_${i}`,
        domain: "code",
        actor: { id: `p_${i % 100}`, name: `Dev ${i % 100}`, role: "engineer" },
        action: "git_commit",
        resource: {
          type: "repository",
          id: `repo_${i % 10}`,
        },
        context: {
          commitSha: `sha_${i}`,
          diffSnippet: "const apiKey = 'dummy_mock_api_key_1234567890abcdef';",
        },
        timestamp,
        source: "github_webhook",
      });
    }
  }

  // Generate 2,000 register rows (people, certs, vendors, accounts, obligations)
  const people = Array.from({ length: 500 }, (_, i) => ({
    id: `p_${i}`,
    name: `Person ${i}`,
    role: "engineer",
    department: "Engineering",
    status: "active" as const,
  }));

  const certifications = Array.from({ length: 600 }, (_, i) => ({
    id: `cert_${i}`,
    personId: `p_${i % 500}`,
    type: "security_awareness",
    issuedOn: "2025-03-01",
    expiresOn: i % 20 === 0 ? "2026-02-28" : "2026-12-31",
  }));

  const requirements = Array.from({ length: 50 }, (_, i) => ({
    id: `req_${i}`,
    appliesTo: {
      role: "engineer",
      department: "Engineering",
    },
    certType: "security_awareness",
    criticality: "standard" as const,
    obligationId: `ob_${i}`,
  }));

  const vendors = Array.from({ length: 250 }, (_, i) => ({
    id: `v_${i}`,
    name: `Vendor ${i}`,
    tier: (i % 3 === 0 ? "critical" : "standard") as "critical" | "standard",
    ownerId: `p_${i % 500}`,
    documents: [
      {
        type: "soc2_report" as const,
        validFrom: "2025-01-15",
        expiresOn: i % 15 === 0 ? "2026-01-15" : "2026-11-30",
      },
    ],
  }));

  const accounts = Array.from({ length: 300 }, (_, i) => ({
    id: `acc_${i}`,
    personId: `p_${i % 500}`,
    system: "production_db",
    privileged: true,
    lastActiveOn: "2026-02-20",
    mfaEnabled: true,
  }));

  const obligations = Array.from({ length: 300 }, (_, i) => ({
    id: `ob_${i}`,
    title: `Obligation ${i}`,
    plainDescription: `Description for obligation ${i}`,
    source: {
      documentId: "doc_training_certification",
      quote: "All personnel must complete security training annually.",
      quoteSpan: [0, 56] as [number, number],
    },
    origin: "ai_extracted" as const,
    kind: "recurring" as const,
    status: "confirmed" as const,
    ruleIds: i % 2 === 0 ? ["DEAD-001"] : [],
    dueOn: i % 10 === 0 ? "2026-03-10" : undefined,
  }));

  return {
    events,
    registers: {
      people,
      certifications,
      requirements,
      vendors,
      accounts,
      obligations,
    },
  };
}

async function runBenchmark() {
  console.log("Generating 10,000 events and 2,000 register rows...");
  const { events, registers } = generateSyntheticData();

  console.log("Executing evaluation rules benchmark...");
  const t0 = performance.now();

  const ctx: RuleContext = {
    events,
    registers,
    asOf: "2026-03-01T12:00:00.000Z",
  };

  const results = runRules(TIER1_RULES, ctx);
  const t1 = performance.now();
  const elapsedMs = t1 - t0;
  const elapsedSec = elapsedMs / 1000;

  console.log(`\n================ BENCHMARK RESULT ================`);
  console.log(`Events evaluated:      ${events.length.toLocaleString()}`);
  console.log(`Register rows:         ${(
    registers.people.length +
    registers.certifications.length +
    registers.requirements.length +
    registers.vendors.length +
    registers.accounts.length +
    registers.obligations.length
  ).toLocaleString()}`);
  console.log(`Rules executed:        ${TIER1_RULES.length} (${TIER1_RULES.map((r) => r.meta.id).join(", ")})`);
  console.log(`Rule results flagged:  ${results.length}`);
  console.log(`Total evaluation time: ${elapsedMs.toFixed(2)} ms (${elapsedSec.toFixed(3)} s)`);
  console.log(`Target threshold:      < 2.000 s`);
  console.log(`Status:                ${elapsedSec < 2.0 ? "PASSED (PASSES CRITERIA)" : "FAILED"}`);
  console.log(`==================================================\n`);

  if (elapsedSec >= 2.0) {
    process.exit(1);
  }
}

runBenchmark();
