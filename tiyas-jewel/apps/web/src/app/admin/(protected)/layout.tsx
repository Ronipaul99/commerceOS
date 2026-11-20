import { requireAdmin } from "@/lib/admin-server";
import { AdminShell } from "@/features/admin/shell";
export const dynamic = "force-dynamic";
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  return <AdminShell session={session}>{children}</AdminShell>;
}
