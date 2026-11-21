"use client";
import { AdminLink as Link } from "@/features/admin/activity";
import { AdminImage as Image } from "@/features/admin/image";
import { useAdminRouter as useRouter } from "@/features/admin/activity";
import { useState } from "react";
import { Pencil, Archive, Trash2 } from "lucide-react";
import type { AdminProduct } from "@tiyas/shared";
import { formatINR } from "@/lib/money";
import { adminOkSchema } from "@/lib/admin-client";
import { useAdmin } from "./shell";
import { AdminConfirm } from "./confirm";
export function AdminProducts({ products }: { products: AdminProduct[] }) {
  const { request } = useAdmin(),
    router = useRouter();
  const [action, setAction] = useState<{
      product: AdminProduct;
      kind: "archive" | "delete";
    } | null>(null),
    [notice, setNotice] = useState("");
  return (
    <>
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      {products.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table admin-product-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Available stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="admin-product-name">
                      {p.images[0] ? (
                        <Image
                          src={p.images[0].url}
                          alt=""
                          width={52}
                          height={60}
                          unoptimized
                        />
                      ) : (
                        <span className="admin-image-empty">—</span>
                      )}
                      <div>
                        <Link
                          className="admin-link"
                          href={`/admin/products/${p.id}/edit`}
                        >
                          {p.name}
                        </Link>
                        <small>{p.sku ?? "No SKU"}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="admin-category-chip">
                      {p.category.name}
                    </span>
                  </td>
                  <td>{formatINR(p.pricePaise)}</td>
                  <td>
                    {p.variants.length
                      ? p.variants
                          .filter((v) => v.active)
                          .reduce((n, v) => n + v.stockQuantity, 0)
                      : p.stockQuantity}
                    {p.variants.length > 0 && (
                      <small>Across active variants</small>
                    )}
                  </td>
                  <td>
                    <span
                      className={`admin-status ${p.active ? "admin-status-green" : "admin-status-muted"}`}
                    >
                      {p.active ? "Active" : "Archived"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <Link
                        href={`/admin/products/${p.id}/edit`}
                        className="admin-icon-button"
                        aria-label={`Edit ${p.name}`}
                      >
                        <Pencil size={16} />
                      </Link>
                      <button
                        className="admin-icon-button"
                        disabled={!p.active}
                        onClick={() =>
                          setAction({ product: p, kind: "archive" })
                        }
                        aria-label={`Archive ${p.name}`}
                      >
                        <Archive size={16} />
                      </button>
                      <button
                        className="admin-icon-button"
                        onClick={() =>
                          setAction({ product: p, kind: "delete" })
                        }
                        aria-label={`Delete ${p.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-empty">
          <h2>No products found</h2>
          <p>Adjust your search or add a product to the catalog.</p>
        </div>
      )}
      <AdminConfirm
        open={!!action}
        onClose={() => setAction(null)}
        title={
          action?.kind === "delete"
            ? "Delete this product?"
            : "Archive this product?"
        }
        description={
          action?.kind === "delete"
            ? "Only products with no order history can be deleted. This cannot be undone."
            : "The product will disappear from the storefront. Its order history will remain available."
        }
        label={action?.kind === "delete" ? "Delete product" : "Archive product"}
        onConfirm={async () => {
          if (!action) return;
          await request(
            `/products/${action.product.id}${action.kind === "archive" ? "/archive" : ""}`,
            adminOkSchema,
            {
              method: action.kind === "archive" ? "POST" : "DELETE",
              body: { version: action.product.version },
            },
          );
          setNotice(
            action.kind === "archive"
              ? "Product archived."
              : "Product deleted.",
          );
          router.refresh();
        }}
      />
    </>
  );
}
