"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
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
  return (
    <NavigationContext value={navigation}>
      <PendingContext value={pending}>
        {children}
        <div
          className="admin-activity"
          data-active={!!label}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {label && (
            <>
              <span className="admin-activity-bar" aria-hidden="true" />
              <AdminSpinner />
              <span>{label}</span>
            </>
          )}
        </div>
      </PendingContext>
    </NavigationContext>
  );
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
      {pending ? (
        <>
          <AdminSpinner />
          Applying…
        </>
      ) : (
        children
      )}
    </button>
  );
}
