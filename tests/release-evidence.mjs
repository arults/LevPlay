import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildReleaseEvidence } from "../lib/release-evidence.mjs";

const directory = await mkdtemp(join(tmpdir(), "levplay-release-evidence-"));
try {
  const paths = {
    sourceArchive: join(directory, "source.tar"),
    sbf: join(directory, "levplay.so"),
    idl: join(directory, "levplay.json"),
    sbom: join(directory, "sbom.json"),
  };
  await Promise.all([
    writeFile(paths.sourceArchive, "source"),
    writeFile(paths.sbf, "sbf"),
    writeFile(paths.idl, "idl"),
    writeFile(paths.sbom, "sbom"),
  ]);

  const evidence = await buildReleaseEvidence({
    releaseCommit: "A".repeat(40),
    toolchainImageDigest: `sha256:${"B".repeat(64)}`,
    ...paths,
  });
  assert.equal(evidence.releaseCommit, "a".repeat(40));
  assert.equal(evidence.releaseArtifacts.toolchainImageDigest, `sha256:${"b".repeat(64)}`);
  for (const field of ["sourceSha256", "sbfSha256", "idlSha256", "sbomSha256"]) {
    assert.match(evidence.releaseArtifacts[field], /^[a-f0-9]{64}$/);
  }
  assert.equal(new Set(Object.values(evidence.releaseArtifacts).slice(0, 4)).size, 4);

  await assert.rejects(
    buildReleaseEvidence({
      releaseCommit: "not-a-commit",
      toolchainImageDigest: `sha256:${"b".repeat(64)}`,
      ...paths,
    }),
    /releaseCommit/,
  );
  await assert.rejects(
    buildReleaseEvidence({
      releaseCommit: "a".repeat(40),
      toolchainImageDigest: "latest",
      ...paths,
    }),
    /toolchainImageDigest/,
  );
  await assert.rejects(
    buildReleaseEvidence({
      releaseCommit: "a".repeat(40),
      toolchainImageDigest: `sha256:${"b".repeat(64)}`,
      ...paths,
      sbom: paths.idl,
    }),
    /distinct files/,
  );
  await writeFile(paths.sbom, "");
  await assert.rejects(
    buildReleaseEvidence({
      releaseCommit: "a".repeat(40),
      toolchainImageDigest: `sha256:${"b".repeat(64)}`,
      ...paths,
    }),
    /non-empty regular file/,
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}

console.log("LevPlay release evidence: hashes and fail-closed inputs passed");
