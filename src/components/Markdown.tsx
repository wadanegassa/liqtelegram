"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { resolveContentUrl } from "@/lib/content-assets";

const components: Components = {
  img: ({ src, alt, title }) => {
    const url = resolveContentUrl(typeof src === "string" ? src : "");
    if (!url) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={alt || ""}
        title={title}
        loading="lazy"
        decoding="async"
        className="liq-md-img"
      />
    );
  },
  a: ({ href, children, title }) => {
    const url = resolveContentUrl(href || "");
    const external = /^https?:/i.test(url);
    return (
      <a
        href={url || href || "#"}
        title={title}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    );
  },
};

export function Markdown({ content }: { content: string }) {
  if (!content?.trim()) {
    return <p className="text-sm text-neutral-500">No content yet.</p>;
  }

  return (
    <div className="prose-liq">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={components}
        urlTransform={(url) => resolveContentUrl(url) || url}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
