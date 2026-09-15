#!/usr/bin/env node

import { buildReleaseEvidence } from "../lib/release-evidence.mjs";

const allowed = new Set([
  "--commit",
  "--toolchain-digest",
  "--source-archive",
  "--sbf",
  "--idl",
  "--sbom",
]);

const values = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const flag = process.argv[index];
  const value = process.argv[index + 1];
  if (!allowed.has(flag) || value === undefined || value.startsWith("--")) {
    throw new Error("invalid release-evidence arguments");
  }
  if (values.has(flag)) {
    throw new Error(`duplicate argument: ${flag}`);
  }
  values.set(flag, value);
}
if (values.size !== allowed.size) {
  throw new Error(
    "usage: generate-release-evidence --commit <sha> --toolchain-digest <sha256:...> --source-archive <file> --sbf <file> --idl <file> --sbom <file>",
  );
}

const evidence = await buildReleaseEvidence({
  releaseCommit: values.get("--commit"),
  toolchainImageDigest: values.get("--toolchain-digest"),
  sourceArchive: values.get("--source-archive"),
  sbf: values.get("--sbf"),
  idl: values.get("--idl"),
  sbom: values.get("--sbom"),
});

process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
