import type { EvidenceRef } from "../types";
import { EvidenceItem } from "../types";
import type { Ledger } from "../ledger";
import { canonical, sha256hex } from "../ledger";
import { nextBlockIndex } from "../ledger";
import type { Repo } from "../repo/repo";

export interface EvidenceLocker {
  /**
   * Records an immutable evidence item (MASTER §7.5): canonicalises the
   * content, hashes it, appends EVIDENCE_RECORDED to the ledger and stores
   * the item with its block index.
   */
  record(
    kind: EvidenceItem["kind"],
    title: string,
    content: unknown,
    subjectRef?: EvidenceRef,
    source?: string,
  ): EvidenceItem;
  get(id: string): EvidenceItem | undefined;
  list(): EvidenceItem[];
}

export interface EvidenceLockerOptions {
  ledger: Ledger;
  repo: Repo;
  source: string;
  actor?: string;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as object)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

export function createEvidenceLocker(options: EvidenceLockerOptions): EvidenceLocker {
  const { ledger, repo, source, actor = "evidence@complianceiq.test" } = options;

  return {
    record(kind, title, content, subjectRef, itemSource) {
      const contentHash = sha256hex(canonical(content));
      const id = `ev_${nextBlockIndex(ledger)}`;
      const block = ledger.append({
        eventType: "EVIDENCE_RECORDED",
        actor,
        payload: { evidenceId: id, contentHash, kind, title },
      });
      repo.evidence.add(
        EvidenceItem.parse({
          id,
          kind,
          title,
          source: itemSource ?? source,
          collectedAt: block.timestamp,
          contentHash,
          content: deepFreeze(structuredClone(content)),
          subjectRef,
          ledgerBlockIndex: block.blockIndex,
        }),
      );
      return repo.evidence.get(id)!;
    },
    get(id) {
      return repo.evidence.get(id);
    },
    list() {
      return repo.evidence.list();
    },
  };
}
