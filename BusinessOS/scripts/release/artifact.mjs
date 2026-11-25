import { createHash } from "node:crypto";
import console from "node:console";
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import process from "node:process";

const digest = /^sha256:[0-9a-f]{64}$/;
const sha = /^[0-9a-f]{40}$/;

export function imageEvidence(metadata, image, source) {
  const proof = metadata?.["buildx.build.provenance"];
  const manifestDigest = metadata?.["containerimage.digest"];
  if (!digest.test(image) || !digest.test(manifestDigest) || !sha.test(source)
      || metadata["containerimage.config.digest"] !== image || !proof || typeof proof !== "object"
      || Array.isArray(proof) || !Object.keys(proof).length) throw new Error("ARTIFACT_PROVENANCE_INVALID");
  return { source, image, manifestDigest, builderProvenance: proof };
}

if (process.argv[1]?.endsWith("artifact.mjs")) {
  try {
    const [file, build, report] = process.argv.slice(2);
    const record = imageEvidence(JSON.parse(readFileSync(build, "utf8")), process.env.M0109_IMAGE, process.env.M0109_SOURCE);
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(file)) hash.update(chunk);
    writeFileSync(report, JSON.stringify({ ...record, artifactSha256: hash.digest("hex") }, null, 2) + "\n");
    console.log("Image ID, source and BuildKit provenance recorded.");
  } catch {
    console.error("ARTIFACT_EVIDENCE_UNAVAILABLE");
    process.exitCode = 1;
  }
}
