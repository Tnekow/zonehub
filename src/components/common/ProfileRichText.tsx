import React, { useState } from 'react';

type ParsedNode =
  | { type: 'text'; content: string }
  | {
      type: 'tag';
      name: string;
      attr?: string | null;
      children: ParsedNode[];
    };

// 允许标签名包含数字以支持 [h1] 这类形式
const TAG_REGEX = /^\[(\/?)([a-z0-9]+)(?:=([^\]]+))?\]/i;

interface ParseResult {
  nodes: ParsedNode[];
  index: number;
}

/**
 * Simple BBCode‑like parser for profile text formatting.
 * Supported tags:
 * [h1] [/h1], [b] [/b], [u] [/u], [i] [/i], [strike] [/strike],
 * [spoiler] [/spoiler], [noparse] [/noparse], [hr][/hr],
 * [url=...] [/url], [quote=author] [/quote], [code] [/code]
 */
function parseProfileText(source: string): ParsedNode[] {
  const { nodes } = parseInner(source, 0, null);
  return nodes;
}

function parseInner(source: string, start: number, stopTag: string | null): ParseResult {
  const nodes: ParsedNode[] = [];
  let textBuffer = '';
  let i = start;

  const flushText = () => {
    if (textBuffer) {
      nodes.push({ type: 'text', content: textBuffer });
      textBuffer = '';
    }
  };

  while (i < source.length) {
    const ch = source[i];

    if (ch !== '[') {
      textBuffer += ch;
      i += 1;
      continue;
    }

    const rest = source.slice(i);
    const match = rest.match(TAG_REGEX);

    if (!match) {
      // Not a valid tag, treat as plain text
      textBuffer += ch;
      i += 1;
      continue;
    }

    const [raw, slash, nameRaw, attrRaw] = match;
    const name = nameRaw.toLowerCase();
    const isClosing = slash === '/';
    const attr = attrRaw ?? null;
    const tagEnd = i + raw.length;

    // Handle closing tag
    if (isClosing) {
      if (stopTag && name === stopTag) {
        flushText();
        return { nodes, index: tagEnd };
      }
      // Unexpected closing tag, treat literally
      textBuffer += raw;
      i = tagEnd;
      continue;
    }

    // Opening tag
    // Self-contained [hr] (optional closing will be ignored by parser)
    if (name === 'hr') {
      flushText();
      nodes.push({ type: 'tag', name, attr: null, children: [] });
      i = tagEnd;
      continue;
    }

    // Tags that should not be parsed recursively inside (treated like [noparse])
    if (name === 'noparse' || name === 'code') {
      const closeToken = `[/${name}]`;
      const closeIndex = source.toLowerCase().indexOf(closeToken.toLowerCase(), tagEnd);
      if (closeIndex === -1) {
        // No closing tag, treat as plain text
        textBuffer += raw;
        i = tagEnd;
        continue;
      }
      flushText();
      const inner = source.slice(tagEnd, closeIndex);
      nodes.push({
        type: 'tag',
        name,
        attr,
        // store raw inner text as single text node
        children: [{ type: 'text', content: inner }],
      });
      i = closeIndex + closeToken.length;
      continue;
    }

    // Normal opening tag – recurse until matching closing tag
    flushText();
    const innerResult = parseInner(source, tagEnd, name);
    nodes.push({
      type: 'tag',
      name,
      attr,
      children: innerResult.nodes,
    });
    i = innerResult.index;
  }

  flushText();
  return { nodes, index: i };
}

// ---------- React rendering ----------

interface ProfileRichTextProps {
  text: string;
  className?: string;
}

const Spoiler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      className={
        'inline-block px-1 rounded cursor-pointer transition-colors ' +
        (revealed ? 'bg-transparent text-inherit' : 'bg-black/60 text-black hover:bg-black/80')
      }
      onClick={() => setRevealed(v => !v)}
    >
      {revealed ? children : 'Spoiler'}
    </span>
  );
};

const CodeBlock: React.FC<{ children: string }> = ({ children }) => {
  return (
    <pre className="bg-steam-item-in border border-steam-border rounded px-2 py-1 my-1 overflow-x-auto">
      <code className="font-mono whitespace-pre-wrap break-words text-sm">{children}</code>
    </pre>
  );
};

function renderTextContent(text: string, keyPrefix: string): React.ReactNode[] {
  // Preserve new lines using <br/>, outside of [code]
  const parts = text.split('\n');
  const result: React.ReactNode[] = [];
  parts.forEach((part, idx) => {
    if (idx > 0) {
      result.push(<br key={`${keyPrefix}-br-${idx}`} />);
    }
    if (part) {
      result.push(part);
    }
  });
  return result;
}

function renderNodes(nodes: ParsedNode[], keyPrefix: string = 'n'): React.ReactNode[] {
  const result: React.ReactNode[] = [];

  nodes.forEach((node, index) => {
    const key = `${keyPrefix}-${index}`;

    if (node.type === 'text') {
      result.push(...renderTextContent(node.content, key));
      return;
    }

    const { name, attr, children } = node;
    const lower = name.toLowerCase();

    switch (lower) {
      case 'h1':
        result.push(
          <h1 key={key} className="text-xl font-semibold text-steam-textPrimary mb-1">
            {renderNodes(children, key)}
          </h1>,
        );
        break;

      case 'b':
        result.push(
          <strong key={key} className="font-semibold">
            {renderNodes(children, key)}
          </strong>,
        );
        break;

      case 'u':
        result.push(
          <span key={key} className="underline">
            {renderNodes(children, key)}
          </span>,
        );
        break;

      case 'i':
        result.push(
          <em key={key} className="italic">
            {renderNodes(children, key)}
          </em>,
        );
        break;

      case 'strike':
        result.push(
          <span key={key} className="line-through">
            {renderNodes(children, key)}
          </span>,
        );
        break;

      case 'spoiler':
        result.push(
          <Spoiler key={key}>
            {renderNodes(children, key)}
          </Spoiler>,
        );
        break;

      case 'noparse': {
        // children is a single text node with raw content
        const raw = children
          .map(c => (c.type === 'text' ? c.content : ''))
          .join('');
        result.push(<span key={key}>{raw}</span>);
        break;
      }

      case 'hr':
        result.push(<hr key={key} className="my-2 border-steam-border border-t" />);
        break;

      case 'url': {
        const hrefRaw = (attr || '').trim();
        const childNodes = renderNodes(children, key);
        const contentText =
          childNodes.length === 0
            ? hrefRaw
            : childNodes;

        // Security: Validate URL protocol to prevent XSS via javascript: or data: protocols
        // Allowed protocols: http, https, steam, relative paths (/), and anchors (#)
        const allowedProtocols = ['http:', 'https:', 'steam:'];
        let href = hrefRaw || '#';

        // Check if it's a relative path or anchor
        if (href.startsWith('/') || href.startsWith('#')) {
          // Allow relative paths and anchors
        } else {
          try {
            const url = new URL(href);
            const protocol = url.protocol.toLowerCase();
            if (!allowedProtocols.includes(protocol)) {
              // Reject unsafe protocols (javascript:, data:, etc.)
              href = '#';
            }
          } catch {
            // If not a valid URL, check if it's a relative path
            if (!href.startsWith('/') && !href.startsWith('#')) {
              // Reject invalid URLs that aren't relative paths
              href = '#';
            }
          }
        }

        result.push(
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="text-steam-primary hover:text-steam-secondary underline"
          >
            {contentText}
          </a>,
        );
        break;
      }

      case 'quote': {
        const author = attr?.trim();
        result.push(
          <blockquote
            key={key}
            className="border-l-4 border-steam-border pl-3 my-2 text-sm text-steam-textPrimary bg-steam-item-in/40 rounded-sm"
          >
            {author && (
              <div className="text-steam-textMuted text-xs mb-1">
                {author} said:
              </div>
            )}
            <div>{renderNodes(children, key)}</div>
          </blockquote>,
        );
        break;
      }

      case 'code': {
        const raw = children
          .map(c => (c.type === 'text' ? c.content : ''))
          .join('');
        result.push(<CodeBlock key={key}>{raw}</CodeBlock>);
        break;
      }

      default:
        // Unknown tag – just render its children
        result.push(
          <span key={key}>{renderNodes(children, key)}</span>,
        );
    }
  });

  return result;
}

export const ProfileRichText: React.FC<ProfileRichTextProps> = ({ text, className }) => {
  const ast = parseProfileText(text || '');
  return <div className={className}>{renderNodes(ast)}</div>;
};

export default ProfileRichText;


