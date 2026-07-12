import ReactMarkdown, { type Components } from "react-markdown";

/**
 * Mapping des éléments Markdown vers les tokens du design system — pas de
 * plugin `@tailwindcss/typography` (absent du projet), un rendu minimal et
 * cohérent avec le reste de l'UI suffit pour un corps de PV (titres,
 * paragraphes, listes, gras/italique, liens).
 */
const MARKDOWN_COMPONENTS: Components = {
  h1: (props) => <h1 className="mt-4 text-lg font-semibold text-foreground first:mt-0" {...props} />,
  h2: (props) => <h2 className="mt-4 text-base font-semibold text-foreground first:mt-0" {...props} />,
  h3: (props) => <h3 className="mt-3 text-sm font-semibold text-foreground first:mt-0" {...props} />,
  p: (props) => <p className="mt-2 text-sm text-foreground first:mt-0" {...props} />,
  ul: (props) => <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground" {...props} />,
  ol: (props) => <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-foreground" {...props} />,
  li: (props) => <li {...props} />,
  a: (props) => (
    <a
      className="text-primary underline-offset-2 hover:underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  strong: (props) => <strong className="font-semibold" {...props} />,
  blockquote: (props) => (
    <blockquote
      className="mt-2 border-l-2 border-border pl-3 text-sm text-muted-foreground"
      {...props}
    />
  ),
  code: (props) => (
    <code className="rounded bg-muted px-1 py-0.5 text-xs" {...props} />
  ),
};

/** Rendu Markdown du corps du PV — pas de HTML brut interprété (pas de `rehype-raw`), pas de risque XSS. */
export function MinutesMarkdown({ content }: { content: string }) {
  return (
    <div className="min-w-0">
      <ReactMarkdown components={MARKDOWN_COMPONENTS}>{content}</ReactMarkdown>
    </div>
  );
}
