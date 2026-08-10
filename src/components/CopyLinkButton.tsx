"use client";

import { useState } from "react";

export function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      const el = document.createElement("textarea");
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <code className="block flex-1 overflow-x-auto rounded-lg bg-black/5 px-3 py-2 text-xs break-all">
        {link}
      </code>
      <button
        type="button"
        onClick={copy}
        className="rounded-lg bg-[var(--tg-button)] px-3 py-2 text-sm font-medium text-[var(--tg-button-text)]"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
