"use client";
export default function StorefrontError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="shell status-page" role="alert">
      <p className="eyebrow">TIYAS JEWEL</p>
      <h1 className="display">A moment, please.</h1>
      <p>We could not load this page. Please try again.</p>
      <button className="action" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
