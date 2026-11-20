"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="admin-main">
      <h1>We could not load this page.</h1>
      <p>Please try again. If the issue continues, check the API connection.</p>
      <button className="admin-button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
