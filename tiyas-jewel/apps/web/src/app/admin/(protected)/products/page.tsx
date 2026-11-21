import { AdminLink as Link } from "@/features/admin/activity";
import { Plus, RotateCcw, Search } from "lucide-react";
import {
  adminProductQuerySchema,
  adminProductsResponseSchema,
  adminOptionsSchema,
} from "@tiyas/shared";
import { adminGet } from "@/lib/admin-server";
import { AdminHeading, Pagination } from "@/features/admin/common";
import { AdminProducts } from "@/features/admin/products";
import { Suspense } from "react";
import { AdminPageSkeleton } from "@/features/admin/loading-ui";
import { AdminFilterForm, AdminFilterButton } from "@/features/admin/activity";
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  return (
    <Suspense
      key={JSON.stringify(raw)}
      fallback={<AdminPageSkeleton kind="list" />}
    >
      <ProductsContent raw={raw} />
    </Suspense>
  );
}
async function ProductsContent({
  raw,
}: {
  raw: Record<string, string | string[] | undefined>;
}) {
  const query = adminProductQuerySchema.parse({
    page: raw.page ?? "1",
    q: raw.q ?? "",
    categoryId: raw.categoryId || undefined,
    status: raw.status || "ALL",
    limit: 20,
  });
  const params = new URLSearchParams({
    page: String(query.page),
    limit: "20",
    q: query.q,
    status: query.status,
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
  });
  const [{ data, pagination }, { data: options }] = await Promise.all([
    adminGet(`/products?${params}`, adminProductsResponseSchema),
    adminGet("/options", adminOptionsSchema),
  ]);
  return (
    <>
      <AdminHeading
        title="Manage Products"
        description="Add, edit and manage your product catalog."
        action={
          <Link className="admin-button" href="/admin/products/new">
            <Plus size={20} />
            Add product
          </Link>
        }
      />
      <section className="admin-panel admin-catalog-panel">
        <AdminFilterForm action="/admin/products" className="admin-filter-form">
          <label>
            Search products
            <input
              name="q"
              defaultValue={query.q}
              maxLength={100}
              placeholder="Search by product name, SKU or category…"
              type="search"
            />
          </label>
          <label>
            Status
            <select name="status" defaultValue={query.status}>
              <option value="ALL">All status</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
              <option value="OUT_OF_STOCK">Out of stock</option>
            </select>
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
          <AdminFilterButton>
            <Search size={17} />
            Apply filters
          </AdminFilterButton>
          <Link className="admin-link" href="/admin/products">
            <RotateCcw size={18} />
            Reset
          </Link>
        </AdminFilterForm>
        <div className="admin-panel-table">
          <AdminProducts products={data} />
        </div>
        <Pagination
          pagination={pagination}
          path="/admin/products"
          query={{
            q: query.q,
            status: query.status,
            ...(query.categoryId ? { categoryId: query.categoryId } : {}),
          }}
        />
      </section>
    </>
  );
}
