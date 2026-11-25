#!/usr/bin/env bash
set -euo pipefail

if [[ "${GITHUB_ACTIONS:-}" != true || "${RUNNER_ENVIRONMENT:-}" != github-hosted \
      || -n "${DOCKER_HOST:-}" || -n "${DOCKER_CONTEXT:-}" || -n "${M0104_ADMIN_URL:-}" \
      || ! "${M0109_BASE_SHA:-}" =~ ^[0-9a-f]{40}$ || ! "${GITHUB_SHA:-}" =~ ^[0-9a-f]{40}$ \
      || "$(docker context show)" != default ]]; then
  printf '%s\n' DISPOSABLE_STAGING_REQUIRED >&2
  exit 1
fi
if [[ "$(git rev-parse HEAD)" != "$GITHUB_SHA" ]]; then
  printf '%s\n' RELEASE_SOURCE_MISMATCH >&2
  exit 1
fi
node scripts/release/preflight.mjs
artifact="$RUNNER_TEMP/businessos-release"
mkdir -p "$artifact"
prior="$(mktemp -d "$RUNNER_TEMP/businessos-prior.XXXXXXXX")"
builder="businessos-release-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT"
cleanup() {
  docker buildx rm "$builder" >/dev/null 2>&1 || true
  if [[ "$prior" == "$RUNNER_TEMP"/businessos-prior.* && -d "$prior" && ! -L "$prior" ]]; then
    rm -rf -- "$prior"
  fi
}
trap cleanup EXIT
git -C .. archive "$M0109_BASE_SHA" BusinessOS | tar -xf - -C "$prior"
docker buildx create --driver docker-container --name "$builder"
export BUILDX_METADATA_PROVENANCE=min
previous_tag="businessos-prior:$M0109_BASE_SHA"
candidate_tag="businessos-candidate:$GITHUB_SHA"
docker buildx build --builder "$builder" --platform linux/amd64 --load \
  --label "org.opencontainers.image.revision=$M0109_BASE_SHA" \
  -f "$prior/BusinessOS/infra/local/api.Dockerfile" -t "$previous_tag" "$prior/BusinessOS"
docker buildx build --builder "$builder" --platform linux/amd64 --load \
  --label "org.opencontainers.image.revision=$GITHUB_SHA" \
  --metadata-file "$artifact/buildkit.json" -f infra/local/api.Dockerfile -t "$candidate_tag" .
previous="$(docker image inspect --format '{{.Id}}' "$previous_tag")"
candidate="$(docker image inspect --format '{{.Id}}' "$candidate_tag")"
if [[ "$(docker image inspect --format '{{.Config.User}}' "$candidate")" != node ]]; then
  printf '%s\n' ROOT_IMAGE_REJECTED >&2
  exit 1
fi
docker image save "$candidate_tag" -o "$artifact/api.tar"
M0109_IMAGE="$candidate" M0109_SOURCE="$GITHUB_SHA" node scripts/release/artifact.mjs \
  "$artifact/api.tar" "$artifact/buildkit.json" "$artifact/provenance.json"
cp infra/release/rollout.json "$artifact/rollout.json"
M0109_REHEARSAL_REPORT="$artifact/rehearsal.json" node scripts/release/staging.mjs "$previous" "$candidate"
