export function SectionHeading({
  number,
  label,
  children,
  description,
  id,
}: {
  number: string;
  label: string;
  children: React.ReactNode;
  description?: string;
  id?: string;
}) {
  return (
    <div className="section-heading">
      <p className="eyebrow">
        {number} / {label}
      </p>
      <h2 id={id}>{children}</h2>
      {description ? (
        <p className="section-description">{description}</p>
      ) : null}
    </div>
  );
}
