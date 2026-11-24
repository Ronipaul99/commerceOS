import { workspaceColors } from "@businessos/design-tokens";

type ShellPageProps = {
  title: string;
  description: string;
};

export function ShellPage({ title, description }: ShellPageProps) {
  return (
    <main
      className="grid min-h-dvh place-items-center p-6 font-sans"
      style={{ backgroundColor: workspaceColors.background, color: workspaceColors.text }}
    >
      <section
        aria-labelledby="app-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 p-8 shadow-sm"
        style={{ backgroundColor: workspaceColors.surface }}
      >
        <h1 id="app-title" className="text-2xl font-semibold">
          {title}
        </h1>
        <p className="mt-2 leading-relaxed" style={{ color: workspaceColors.subtleText }}>
          {description}
        </p>
      </section>
    </main>
  );
}
