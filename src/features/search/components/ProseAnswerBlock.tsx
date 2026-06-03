import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
import type { Components } from 'react-markdown';

interface Props {
  markdown: string;
}

/**
 * Renders v5 conversational prose (Markdown) in the Cosmic / Claude style.
 *
 * Link handling:
 *   /search/profile/:id  → React Router <Link> (in-app navigation)
 *   everything else      → <a target="_blank rel="noopener noreferrer">
 *
 * Tables are rendered for comparison queries (remark-gfm).
 * Bold company names inside links are preserved as-is.
 */
const components: Components = {
  // ── Block elements ──────────────────────────────────────────────────────
  p({ children }) {
    return <p className="text-[15px] leading-relaxed text-ink-body sm:text-base">{children}</p>;
  },

  ul({ children }) {
    return <ul className="flex flex-col gap-3">{children}</ul>;
  },

  li({ children }) {
    return (
      <li className="flex flex-col gap-1 border-l-2 border-border pl-3 text-[15px] leading-relaxed text-ink-body">
        {children}
      </li>
    );
  },

  h1({ children }) {
    return <h2 className="text-base font-semibold text-ink-heading">{children}</h2>;
  },

  h2({ children }) {
    return <h3 className="text-[15px] font-semibold text-ink-heading">{children}</h3>;
  },

  h3({ children }) {
    return <h4 className="text-[14px] font-semibold text-ink-heading">{children}</h4>;
  },

  // ── Inline elements ─────────────────────────────────────────────────────
  strong({ children }) {
    return <strong className="font-semibold text-ink-heading">{children}</strong>;
  },

  em({ children }) {
    return <em className="text-[14px] italic text-ink-muted">{children}</em>;
  },

  // ── Links ───────────────────────────────────────────────────────────────
  a({ href, children }) {
    const isInternal = href?.startsWith('/search/profile/');
    if (isInternal && href) {
      return (
        <Link to={href} className="font-semibold text-ink-heading hover:text-brand hover:underline">
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand hover:underline"
      >
        {children}
      </a>
    );
  },

  // ── Tables (comparison queries) ─────────────────────────────────────────
  table({ children }) {
    return (
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-[13px]">{children}</table>
      </div>
    );
  },

  thead({ children }) {
    return <thead className="bg-surface-muted">{children}</thead>;
  },

  th({ children }) {
    return (
      <th className="px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
        {children}
      </th>
    );
  },

  td({ children }) {
    return <td className="border-t border-border px-3 py-2 text-ink-body">{children}</td>;
  },

  tr({ children }) {
    return <tr className="even:bg-surface-muted/40">{children}</tr>;
  },
};

export function ProseAnswerBlock({ markdown }: Props) {
  return (
    <div className="flex flex-col gap-4" data-testid="prose-answer-block">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
