import { CartContent } from "@/components/storefront/cart-content";
export default function CartPage() {
  return (
    <div className="shell shopping-page cart-page">
      <p className="eyebrow">The considered edit</p>
      <h1>Your bag.</h1>
      <CartContent />
    </div>
  );
}
