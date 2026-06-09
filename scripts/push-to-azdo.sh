#!/usr/bin/env bash
# Fast-forward the current HEAD to azdo/testing. Run this after GitHub CI
# passes on ft-AzureMigration. Requires the `azdo` remote to be configured.
set -euo pipefail

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "${BRANCH}" != "ft-AzureMigration" ]; then
  echo "Refusing to mirror — current branch is '${BRANCH}', expected ft-AzureMigration." >&2
  exit 1
fi

if ! git remote get-url azdo >/dev/null 2>&1; then
  echo "No 'azdo' remote configured. Add with:" >&2
  echo "  git remote add azdo https://okanagan.visualstudio.com/DefaultCollection/CourseBridge/_git/CourseBridge" >&2
  exit 1
fi

git fetch azdo testing
git push azdo "HEAD:refs/heads/testing"
echo "Pushed $(git rev-parse --short HEAD) -> azdo/testing"
