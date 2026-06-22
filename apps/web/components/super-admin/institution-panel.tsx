import { OrganizationView } from "@/components/super-admin/organization-view"
import type { SuperAdminData } from "@/lib/super-admin/queries"

type Props = {
  data: SuperAdminData
  storageKey?: string
}

export function InstitutionPanel({ data }: Props) {
  return <OrganizationView data={data} />
}
