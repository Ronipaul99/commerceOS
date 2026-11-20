import Link from "next/link";
export default function NotFound() {
  return (
    <main className="shell status-page" id="main-content">
      <p className="eyebrow">TIYAS JEWEL · 404</p>
      <h1 className="display">A different direction.</h1>
      <p>This page could not be found.</p>
      <Link className="text-link" href="/">
        Return home
      </Link>
    </main>
  );
}
