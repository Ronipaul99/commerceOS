export function AdminSpinner() {
  return <span className="admin-spinner" aria-hidden="true" />;
}
export type AdminSkeletonKind =
  "dashboard" | "list" | "product" | "order" | "cms" | "users" | "form";
export function AdminPageSkeleton({
  kind = "dashboard",
  shell = false,
}: {
  kind?: AdminSkeletonKind;
  shell?: boolean;
}) {
  const layout = (
    <div
      className={`admin-page-skeleton admin-skeleton-${kind}`}
      role="status"
      aria-label="Loading admin page"
      aria-busy="true"
    >
      <span className="sr-only">Loading store information. Please wait.</span>
      <div className="admin-skeleton-heading" aria-hidden="true">
        <span className="admin-skeleton-block" />
        <span className="admin-skeleton-block" />
      </div>
      <div className="admin-skeleton-content" aria-hidden="true">
        {(kind === "dashboard" || kind === "order") && (
          <div className="admin-skeleton-metrics">
            {Array.from({ length: 4 }, (_, i) => (
              <div className="admin-panel" key={i}>
                <span className="admin-skeleton-block" />
                <span className="admin-skeleton-block" />
              </div>
            ))}
          </div>
        )}
        {kind === "product" || kind === "cms" || kind === "form" ? (
          <div className="admin-skeleton-columns">
            {Array.from({ length: kind === "form" ? 1 : 2 }, (_, i) => (
              <div className="admin-panel" key={i}>
                <span className="admin-skeleton-block admin-skeleton-title" />
                {i === 1 && (
                  <span className="admin-skeleton-block admin-skeleton-picture" />
                )}
                {Array.from({ length: kind === "cms" ? 6 : 4 }, (_, n) => (
                  <span
                    className="admin-skeleton-block admin-skeleton-field"
                    key={n}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="admin-panel">
            <div className="admin-skeleton-filters">
              <span className="admin-skeleton-block" />
              <span className="admin-skeleton-block" />
              <span className="admin-skeleton-block" />
            </div>
            {Array.from({ length: 6 }, (_, i) => (
              <div className="admin-skeleton-row" key={i}>
                <span className="admin-skeleton-block admin-skeleton-thumb" />
                <span className="admin-skeleton-block" />
                <span className="admin-skeleton-block" />
                <span className="admin-skeleton-block" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  return shell ? (
    <div className="admin-loading-shell">
      <aside aria-hidden="true">
        <span className="admin-skeleton-block" />
        {Array.from({ length: 5 }, (_, i) => (
          <span className="admin-skeleton-block" key={i} />
        ))}
      </aside>
      <div>{layout}</div>
    </div>
  ) : (
    layout
  );
}
