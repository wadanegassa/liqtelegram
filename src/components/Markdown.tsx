"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ content }: { content: string }) {
  if (!content?.trim()) {
    return (
      <p className="text-sm text-[var(--tg-hint)]">No content yet.</p>
    );
  }

  return (
    <div className="prose-liq">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
