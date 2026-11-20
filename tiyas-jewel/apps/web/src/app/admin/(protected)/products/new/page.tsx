import { adminOptionsSchema } from "@tiyas/shared";
import { adminGet } from "@/lib/admin-server";
import { AdminHeading } from "@/features/admin/common";
import { AdminProductForm } from "@/features/admin/product-form";
export default async function NewProductPage() {
  const { data } = await adminGet("/options", adminOptionsSchema);
  return (
    <>
      <AdminHeading
        title="Add product"
        description="Create a product with clear details and actual product photography."
      />
      <AdminProductForm options={data} />
    </>
  );
}
