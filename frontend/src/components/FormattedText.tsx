import { Fragment, ReactNode } from "react";
import { Inline, parseBlocks } from "../richText";

function renderInline(nodes: Inline[]): ReactNode {
  return nodes.map((node, i) => {
    switch (node.type) {
      case "text":
        return <Fragment key={i}>{node.text}</Fragment>;
      case "bold":
        return <strong key={i}>{renderInline(node.children)}</strong>;
      case "italic":
        return <em key={i}>{renderInline(node.children)}</em>;
      case "underline":
        return <u key={i}>{renderInline(node.children)}</u>;
    }
  });
}

// Shows a long-text field with its formatting (see richText.ts): bold,
// italic, underline, bullet and numbered lists, and line breaks as typed.
// Unformatted text looks exactly as it did before. A <div>, not a <p>,
// since lists can't sit inside a paragraph.
export default function FormattedText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {parseBlocks(text).map((block, i) => {
        switch (block.type) {
          case "blank":
            return <div key={i} className="h-3" aria-hidden="true" />;
          case "line":
            return <div key={i}>{renderInline(block.content)}</div>;
          case "ul":
            return (
              <ul key={i} className="list-disc pl-5 space-y-0.5">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} start={block.start} className="list-decimal pl-5 space-y-0.5">
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ol>
            );
        }
      })}
    </div>
  );
}
