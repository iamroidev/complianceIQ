// Precomputes TF-IDF embeddings for every policy chunk into
// src/data/policy/embeddings.json (offline, deterministic; MASTER §9).
//
//   node scripts/precompute-embeddings.ts          regenerate
//   node scripts/precompute-embeddings.ts --check  verify file is current
//
// Shares the tokenizer and section parser with src/core/rag so runtime query
// vectors and stored document vectors stay in the same space.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseSections } from "../src/core/rag/parse.ts";
import { tokenize } from "../src/core/rag/tokenize.ts";

type Chunk = { chunkId: string; text: string };

const root = process.cwd();
const policyDir = join(root, "src", "data", "policy");
const documentsDir = join(policyDir, "documents");
const outputFile = join(policyDir, "embeddings.json");

function loadChunks(): Chunk[] {
  const chunks: Chunk[] = [];

  for (const file of readdirSync(documentsDir).filter((f) => f.endsWith(".md")).sort()) {
    const docId = file.replace(/\.md$/, "");
    const text = readFileSync(join(documentsDir, file), "utf8");
    for (const section of parseSections(docId, text)) {
      chunks.push({ chunkId: section.chunkId, text: section.text });
    }
  }

  const clauses = JSON.parse(readFileSync(join(policyDir, "clauses.json"), "utf8")) as {
    chunkId: string;
    text: string;
  }[];
  for (const clause of clauses) chunks.push({ chunkId: clause.chunkId, text: clause.text });

  const ids = new Set<string>();
  for (const chunk of chunks) {
    if (ids.has(chunk.chunkId)) throw new Error(`Duplicate chunkId: ${chunk.chunkId}`);
    ids.add(chunk.chunkId);
  }
  if (chunks.length === 0) throw new Error("No policy chunks found");
  return chunks;
}

function buildEmbeddings(chunks: Chunk[]): string {
  const tfCounts = chunks.map((chunk) => {
    const counts = new Map<string, number>();
    for (const token of tokenize(chunk.text)) counts.set(token, (counts.get(token) ?? 0) + 1);
    return counts;
  });

  const df = new Map<string, number>();
  for (const counts of tfCounts) for (const token of counts.keys()) df.set(token, (df.get(token) ?? 0) + 1);

  const totalDocs = chunks.length;
  const tokens = [...df.keys()].sort();
  const idf = tokens.map((token) => Math.log((1 + totalDocs) / (1 + df.get(token)!)) + 1);
  const index = new Map(tokens.map((token, i) => [token, i]));

  const documents: Record<string, [number, number][]> = {};
  chunks.forEach((chunk, i) => {
    const entries: [number, number][] = [...tfCounts[i].entries()].map(([token, count]) => [
      index.get(token)!,
      (1 + Math.log(count)) * idf[index.get(token)!],
    ]);
    const norm = Math.sqrt(entries.reduce((sum, [, weight]) => sum + weight * weight, 0));
    if (norm === 0) throw new Error(`Chunk ${chunk.chunkId} produced an empty vector`);
    documents[chunk.chunkId] = entries
      .map(([idx, weight]) => [idx, weight / norm] as [number, number])
      .sort((a, b) => a[0] - b[0]);
  });

  return JSON.stringify(
    { version: 1, method: "tfidf-l2", tokens, idf, documents },
    null,
    2,
  ) + "\n";
}

const output = buildEmbeddings(loadChunks());

if (process.argv.includes("--check")) {
  const current = readFileSync(outputFile, "utf8");
  if (current !== output) {
    console.error("embeddings.json is stale — run: node scripts/precompute-embeddings.ts");
    process.exit(1);
  }
  console.log("embeddings.json is up to date");
} else {
  writeFileSync(outputFile, output, "utf8");
  console.log(`Wrote ${outputFile}`);
}
