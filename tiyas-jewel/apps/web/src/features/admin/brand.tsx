import { BrandIdentity } from "@/components/storefront/brand-mark";
export function AdminBrand() {
  return (
    <span className="admin-design-brand">
      <BrandIdentity priority />
      <small>Admin Panel</small>
    </span>
  );
}
