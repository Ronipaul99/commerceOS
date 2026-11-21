import type { Metadata } from "next";
import "./admin.css";
import "./admin-design.css";
import { AdminActivityProvider } from "@/features/admin/activity";
export const metadata: Metadata = {
  title: "Store administration",
  robots: { index: false, follow: false },
};
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-root">
      <AdminActivityProvider>{children}</AdminActivityProvider>
    </div>
  );
}
