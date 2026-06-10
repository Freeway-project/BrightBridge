# Azure DevOps Self-Hosted Agent (oracle-manager-non-prod)

This setup removes the need to allow Microsoft-hosted agent IP ranges for SSH.

## Goal

Run the `UpdateRemote` stage directly on `oracle-manager-non-prod` using a self-hosted Azure DevOps agent in pool `dockercloud-non-prod`.

## 1) Create PAT and Pool

In Azure DevOps:

1. Create or verify agent pool `dockercloud-non-prod`.
2. Create a PAT with scope: `Agent Pools (Read & manage)`.

## 2) Copy script to manager and run

From your workstation:

```bash
scp ORCHESTRATION/setup-azure-devops-agent.sh deploy@oracle-manager-non-prod:/tmp/
ssh deploy@oracle-manager-non-prod "chmod +x /tmp/setup-azure-devops-agent.sh"
ssh deploy@oracle-manager-non-prod "AZP_URL=https://dev.azure.com/<org> AZP_TOKEN=<pat> AZP_POOL=dockercloud-non-prod AZP_AGENT_NAME=oracle-manager-non-prod /tmp/setup-azure-devops-agent.sh"
```

Security note:

- Prefer passing `AZP_TOKEN` through an interactive shell export on the manager so it is not saved in shell history.

## 3) Verify in Azure DevOps

1. Azure DevOps -> Project Settings -> Agent pools -> `dockercloud-non-prod`.
2. Confirm agent `oracle-manager-non-prod` is online.

## 4) Pipeline behavior after setup

- `BuildAndPush` runs on `ubuntu-latest` (Microsoft-hosted).
- `UpdateRemote` runs on `dockercloud-nonprod` (self-hosted manager), then executes:
  - `cd /data && sudo ./update.sh webapps/coursebridge-test`
  - `sudo docker service ps webapps_coursebridge-test --no-trunc`
  - `sudo docker service logs --since 5m webapps_coursebridge-test`

## Trigger scope

The testing pipeline currently triggers on:

- Branch: `testing`
- Paths:
  - `SOURCE/**`
  - `azure-pipelines-coursebridge-test.yml`

So SOURCE-only changes trigger this pipeline, while ORCHESTRATION changes are intentionally excluded for the future deployment pipeline.
