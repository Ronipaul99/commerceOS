import Link from "next/link";
import {
  Check,
  ChevronRight,
  ClipboardCheck,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRound,
} from "lucide-react";

export function PurchaseSteps({ current }: { current: "bag" | "checkout" }) {
  const steps = [
    { id: "bag", label: "Bag", icon: ShoppingBag },
    { id: "checkout", label: "Checkout", icon: MapPin },
    { id: "placed", label: "Order placed", icon: Check },
  ] as const;
  return (
    <nav className="purchase-steps" aria-label="Order progress">
      <ol>
        {steps.map((step, index) => (
          <li
            key={step.id}
            aria-current={current === step.id ? "step" : undefined}
            data-complete={current === "checkout" && step.id === "bag"}
          >
            {index > 0 && (
              <ChevronRight
                className="purchase-step-divider"
                size={16}
                aria-hidden="true"
              />
            )}
            {step.id === "bag" && current === "checkout" ? (
              <Link href="/cart">
                <step.icon size={19} aria-hidden="true" />
                <span>{step.label}</span>
              </Link>
            ) : (
              <span className="purchase-step">
                <step.icon size={19} aria-hidden="true" />
                <span>{step.label}</span>
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PurchaseBenefits() {
  return (
    <ul className="purchase-benefits" aria-label="Shopping information">
      {[
        {
          icon: UserRound,
          title: "Guest checkout",
          detail: "No account needed",
        },
        {
          icon: Truck,
          title: "Delivery to your door",
          detail: "Check availability with your PIN",
        },
        {
          icon: ShieldCheck,
          title: "Verified order total",
          detail: "Prices checked before you order",
        },
        {
          icon: ClipboardCheck,
          title: "Order confirmation",
          detail: "Your selection, in one place",
        },
      ].map(({ icon: Icon, title, detail }) => (
        <li key={title}>
          <Icon size={30} strokeWidth={1.4} aria-hidden="true" />
          <div>
            <strong>{title}</strong>
            <span>{detail}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PurchaseHelp() {
  return (
    <div className="purchase-help">
      <span className="purchase-icon">
        <ShieldCheck size={24} aria-hidden="true" />
      </span>
      <div>
        <strong>A little help with your order?</strong>
        <p>
          <Link href="/info/contact">
            Contact Tiyas Jewel <ChevronRight size={13} aria-hidden="true" />
          </Link>
          <span aria-hidden="true"> · </span>
          <Link href="/info/shipping-returns">Delivery information</Link>
        </p>
      </div>
    </div>
  );
}
