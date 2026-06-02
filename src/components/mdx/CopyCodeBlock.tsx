import React, { useState } from 'react';

type CopyCodeBlockProps = {
  label: string;
  code: string;
  copyLabel?: string;
  copiedLabel?: string;
};

export function CopyCodeBlock({
  label,
  code,
  copyLabel = 'Copy',
  copiedLabel = 'Copied',
}: CopyCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-steam-item-in rounded p-4 mt-3 not-prose">
      <div className="flex justify-between items-center mb-2 gap-3">
        <h4 className="text-steam-textPrimary font-medium">{label}</h4>
        <button
          type="button"
          onClick={handleCopy}
          className="bg-steam-primary text-steam-buttonText px-3 py-1 rounded text-sm hover:bg-steam-secondary transition-colors shrink-0"
        >
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <pre className="text-steam-textMuted text-sm bg-steam-background-color rounded p-3 overflow-x-auto whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}
