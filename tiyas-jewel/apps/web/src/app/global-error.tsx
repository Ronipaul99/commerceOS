"use client";
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-IN">
      <body
        style={{
          margin: "48px",
          fontFamily: "Georgia, serif",
          background: "#faf7f1",
          color: "#282521",
        }}
      >
        <main id="main-content" role="alert">
          <h1>We could not load TIYAS JEWEL.</h1>
          <p>Please try again in a moment.</p>
          <button onClick={reset}>Try again</button>
        </main>
      </body>
    </html>
  );
}
