import { adminOptionsSchema } from "@tiyas/shared";
import { adminGet } from "@/lib/admin-server";
import { AdminHeading } from "@/features/admin/common";
import { AdminProductForm } from "@/features/admin/product-form";
export default async function NewProductPage() {
  const { data } = await adminGet("/options", adminOptionsSchema);
  return (
    <>
      <AdminHeading
        title="Create Product"
        description="Add a new product to your store."
      />
      <AdminProductForm options={data} />
    </>
  );
}
