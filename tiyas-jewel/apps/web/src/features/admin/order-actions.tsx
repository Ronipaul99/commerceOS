"use client";
import { useState } from "react";
import { useAdminRouter as useRouter } from "@/features/admin/activity";
import { CircleCheck } from "lucide-react";
import { adminOrderResponseSchema } from "@tiyas/shared";
import { useAdmin } from "./shell";
import { AdminConfirm } from "./confirm";
export function OrderCompleteAction({ id }: { id: string }) {
  const [open, setOpen] = useState(false),
    { request } = useAdmin(),
    router = useRouter();
  return (
    <>
      <button
        className="admin-button admin-button-light admin-table-complete"
        onClick={() => setOpen(true)}
      >
        <CircleCheck size={16} />
        Mark as Completed
      </button>
      <AdminConfirm
        open={open}
        onClose={() => setOpen(false)}
        title="Mark this order completed?"
        description="Confirm that manual fulfillment is finished. This does not verify courier delivery."
        label="Mark as Completed"
        onConfirm={async () => {
          await request(`/orders/${id}/complete`, adminOrderResponseSchema, {
            method: "POST",
            body: {},
          });
          router.refresh();
        }}
      />
    </>
  );
}
