import { createHash } from "node:crypto";
import { open, realpath, stat } from "node:fs/promises";

const MAX_ARTIFACT_BYTES = 512 * 1024 * 1024;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/i;
const IMAGE_DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/i;

const assertArtifact = async (path, label) => {
  if (typeof path !== "string" || path.length === 0) {
    throw new Error(`${label} path is required`);
  }
  const canonicalPath = await realpath(path);
  const metadata = await stat(canonicalPath);
  if (!metadata.isFile() || metadata.size === 0 || metadata.size > MAX_ARTIFACT_BYTES) {
    throw new Error(`${label} must be a non-empty regular file under 512 MiB`);
  }
  return canonicalPath;
};

export const sha256File = async (path) => {
  const handle = await open(path, "r");
  const hash = createHash("sha256");
  try {
    for await (const chunk of handle.createReadStream()) {
      hash.update(chunk);
    }
  } finally {
    await handle.close();
  }
  return hash.digest("hex");
};

export const buildReleaseEvidence = async ({
  releaseCommit,
  toolchainImageDigest,
  sourceArchive,
  sbf,
  idl,
  sbom,
}) => {
  if (!COMMIT_PATTERN.test(releaseCommit ?? "")) {
    throw new Error("releaseCommit must be an exact 40-character Git commit");
  }
  if (!IMAGE_DIGEST_PATTERN.test(toolchainImageDigest ?? "")) {
    throw new Error("toolchainImageDigest must be an exact sha256 digest");
  }

  const paths = await Promise.all([
    assertArtifact(sourceArchive, "source archive"),
    assertArtifact(sbf, "SBF binary"),
    assertArtifact(idl, "IDL"),
    assertArtifact(sbom, "SBOM"),
  ]);
  if (new Set(paths).size !== paths.length) {
    throw new Error("release artifacts must be distinct files");
  }
  const [sourceSha256, sbfSha256, idlSha256, sbomSha256] =
    await Promise.all(paths.map(sha256File));

  return {
    releaseCommit: releaseCommit.toLowerCase(),
    releaseArtifacts: {
      sourceSha256,
      sbfSha256,
      idlSha256,
      sbomSha256,
      toolchainImageDigest: toolchainImageDigest.toLowerCase(),
    },
  };
};
