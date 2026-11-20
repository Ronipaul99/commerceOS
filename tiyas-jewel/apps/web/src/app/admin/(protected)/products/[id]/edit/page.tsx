import { adminOptionsSchema, adminProductResponseSchema } from "@tiyas/shared";
import { adminGet } from "@/lib/admin-server";
import { AdminHeading } from "@/features/admin/common";
import { AdminProductForm } from "@/features/admin/product-form";
export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const [{ data: product }, { data: options }, query] = await Promise.all([
    adminGet(`/products/${encodeURIComponent(id)}`, adminProductResponseSchema),
    adminGet("/options", adminOptionsSchema),
    searchParams,
  ]);
  return (
    <>
      <AdminHeading title="Edit product" description={product.name} />
      {query.saved === "1" && (
        <p className="admin-notice" role="status">
          Product saved.
        </p>
      )}
      <AdminProductForm
        key={product.version}
        product={product}
        options={options}
      />
    </>
  );
}
