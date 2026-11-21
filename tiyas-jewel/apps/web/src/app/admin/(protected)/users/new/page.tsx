import { requireAdmin } from "@/lib/admin-server";
import { redirect } from "next/navigation";
import { AdminUsers } from "@/features/admin/users";
export default async function Page() {
  if ((await requireAdmin()).role !== "OWNER") redirect("/admin/content");
  return <AdminUsers users={[]} create />;
}
