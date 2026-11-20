import Link from "next/link";
export default function StorefrontNotFound() {
  return (
    <section className="shell status-page">
      <p className="eyebrow">Tiyas Jewel / 404</p>
      <h1 className="display">This piece could not be found.</h1>
      <p>
        It may have left the collection. Discover another form in the current
        edit.
      </p>
      <Link className="button button-primary" href="/shop">
        Explore the collection
      </Link>
    </section>
  );
}
