import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ComponentProps } from "react";
type LinkProps = ComponentProps<typeof Link> & {
  children: React.ReactNode;
  className?: string;
};
export function PrimaryButton({
  children,
  className = "",
  ...props
}: LinkProps) {
  return (
    <Link className={`button button-primary ${className}`} {...props}>
      {children}
      <ArrowRight size={15} aria-hidden="true" />
    </Link>
  );
}
export function SecondaryButton({
  children,
  className = "",
  ...props
}: LinkProps) {
  return (
    <Link className={`button button-secondary ${className}`} {...props}>
      {children}
      <ArrowRight size={15} aria-hidden="true" />
    </Link>
  );
}
export function EditorialTextLink({
  children,
  className = "",
  ...props
}: LinkProps) {
  return (
    <Link className={`editorial-link ${className}`} {...props}>
      {children}
      <ArrowRight size={18} strokeWidth={1.3} aria-hidden="true" />
    </Link>
  );
}
