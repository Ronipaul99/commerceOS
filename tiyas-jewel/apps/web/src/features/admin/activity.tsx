"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  useTransition,
  type ComponentProps,
  type FormEvent,
} from "react";
import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import { adminActivity } from "@/lib/admin-activity-store";
import { AdminSpinner } from "./loading-ui";
const NavigationContext = createContext<ReturnType<typeof useRouter> | null>(
  null,
);
const PendingContext = createContext(false);
export function AdminActivityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter(),
    [pending, startTransition] = useTransition();
  const message = useSyncExternalStore(
    adminActivity.subscribe,
    adminActivity.getSnapshot,
    () => "",
  );
  const navigation = useMemo(
    () => ({
      ...router,
      push: (...args: Parameters<typeof router.push>) =>
        startTransition(() => router.push(...args)),
      replace: (...args: Parameters<typeof router.replace>) =>
        startTransition(() => router.replace(...args)),
      refresh: () => startTransition(() => router.refresh()),
    }),
    [router],
  );
  const label = message || (pending ? "Loading page…" : "");
  const overlay = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = overlay.current;
    if (!element) return;
    // A popover uses the browser top layer, so progress also appears above
    // native confirmation dialogs without changing their focus or close state.
    if (label) {
      if (!element.matches(":popover-open")) element.showPopover();
    } else if (element.matches(":popover-open")) element.hidePopover();
  }, [label]);
  return (
    <NavigationContext value={navigation}>
      <PendingContext value={pending}>
        {children}
        <div
          ref={overlay}
          popover="manual"
          className="admin-activity"
          data-active={!!label}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {label && (
            <div className="admin-activity-content">
              <AdminSpinner />
              <span className="sr-only">{label}</span>
            </div>
          )}
        </div>
      </PendingContext>
    </NavigationContext>
  );
}
export function useAdminActivity(active: boolean, label: string) {
  useEffect(() => {
    if (active) return adminActivity.start(label);
  }, [active, label]);
}
export function useAdminRouter() {
  const router = useContext(NavigationContext);
  if (!router) throw Error("Admin navigation provider is missing");
  return router;
}
function LinkActivity() {
  const { pending } = useLinkStatus();
  useEffect(() => {
    if (pending) return adminActivity.start("Loading page…");
  }, [pending]);
  return null;
}
export function AdminLink({ children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link {...props}>
      {children}
      <LinkActivity />
    </Link>
  );
}
export function AdminFilterForm({
  children,
  action,
  ...props
}: Omit<ComponentProps<"form">, "action"> & { action: string }) {
  const router = useAdminRouter(),
    pending = useContext(PendingContext);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(e.currentTarget))
      if (typeof value === "string") params.append(key, value);
    router.push(`${action}?${params}`);
  }
  return (
    <form {...props} action={action} onSubmit={submit} aria-busy={pending}>
      {children}
    </form>
  );
}
export function AdminFilterButton({ children }: { children: React.ReactNode }) {
  const pending = useContext(PendingContext);
  return (
    <button
      type="submit"
      className="admin-button admin-button-light"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? <>Applying…</> : children}
    </button>
  );
}
