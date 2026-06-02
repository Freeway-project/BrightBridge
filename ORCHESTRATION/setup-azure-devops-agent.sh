#!/usr/bin/env bash
set -euo pipefail

# Configure an Azure DevOps self-hosted agent on the current machine.
# Intended target: oracle-manager-non-prod (run as deploy user).
#
# Required env vars:
#   AZP_URL        Example: https://dev.azure.com/<org>
#   AZP_TOKEN      PAT with Agent Pools (Read & manage)
# Optional env vars:
#   AZP_POOL       Agent pool name (default: dockercloud-non-prod)
#   AZP_AGENT_NAME Agent name (default: hostname)
#   AZP_WORK       Agent work folder (default: _work)
#   AZP_AGENT_VERSION (default: 4.255.0)

: "${AZP_URL:?AZP_URL is required}"
: "${AZP_TOKEN:?AZP_TOKEN is required}"

AZP_POOL="${AZP_POOL:-dockercloud-non-prod}"
AZP_AGENT_NAME="${AZP_AGENT_NAME:-$(hostname -s)}"
AZP_WORK="${AZP_WORK:-_work}"
AZP_AGENT_VERSION="${AZP_AGENT_VERSION:-4.255.0}"

AGENT_DIR="$HOME/azdo-agent"
AGENT_TGZ="vsts-agent-linux-x64-${AZP_AGENT_VERSION}.tar.gz"
AGENT_URL="https://vstsagentpackage.azureedge.net/agent/${AZP_AGENT_VERSION}/${AGENT_TGZ}"

mkdir -p "$AGENT_DIR"
cd "$AGENT_DIR"

if [[ ! -f "$AGENT_TGZ" ]]; then
  curl -fsSL -o "$AGENT_TGZ" "$AGENT_URL"
fi

if [[ ! -x "./config.sh" ]]; then
  tar zxf "$AGENT_TGZ"
fi

# Install runtime dependencies expected by the agent.
sudo ./bin/installdependencies.sh

./config.sh --unattended \
  --url "$AZP_URL" \
  --auth pat \
  --token "$AZP_TOKEN" \
  --pool "$AZP_POOL" \
  --agent "$AZP_AGENT_NAME" \
  --work "$AZP_WORK" \
  --replace \
  --acceptTeeEula

# Install and start as a system service for persistence.
sudo ./svc.sh install "$USER"
sudo ./svc.sh start

sudo ./svc.sh status

echo
echo "Azure DevOps agent configured:"
echo "  URL:   $AZP_URL"
echo "  Pool:  $AZP_POOL"
echo "  Agent: $AZP_AGENT_NAME"
