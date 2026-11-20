import Link from "next/link";
import {
  adminProductQuerySchema,
  adminProductsResponseSchema,
  adminOptionsSchema,
} from "@tiyas/shared";
import { adminGet } from "@/lib/admin-server";
import { AdminHeading, Pagination } from "@/features/admin/common";
import { AdminProducts } from "@/features/admin/products";
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query = adminProductQuerySchema.parse({
    page: raw.page ?? "1",
    q: raw.q ?? "",
    categoryId: raw.categoryId || undefined,
    limit: 20,
  });
  const params = new URLSearchParams({
    page: String(query.page),
    limit: "20",
    q: query.q,
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
  });
  const [{ data, pagination }, { data: options }] = await Promise.all([
    adminGet(`/products?${params}`, adminProductsResponseSchema),
    adminGet("/options", adminOptionsSchema),
  ]);
  return (
    <>
      <AdminHeading
        title="Products"
        description="Manage product details, photography and availability."
        action={
          <Link className="admin-button" href="/admin/products/new">
            Add product
          </Link>
        }
      />
      <form action="/admin/products" className="admin-filter-form">
        <label>
          Search products
          <input
            name="q"
            defaultValue={query.q}
            maxLength={100}
            placeholder="Name, slug or SKU"
            type="search"
          />
        </label>
        <label>
          Category
          <select name="categoryId" defaultValue={query.categoryId ?? ""}>
            <option value="">All categories</option>
            {options.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button className="admin-button admin-button-light">
          Apply filters
        </button>
        <Link className="admin-link" href="/admin/products">
          Clear
        </Link>
      </form>
      <section className="admin-panel admin-panel-table">
        <AdminProducts products={data} />
      </section>
      <Pagination
        pagination={pagination}
        path="/admin/products"
        query={{
          q: query.q,
          ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        }}
      />
    </>
  );
}
