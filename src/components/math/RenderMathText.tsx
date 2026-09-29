import React from 'react';
import katex from 'katex';

interface RenderMathTextProps {
  content: string;
  className?: string;
}

export function RenderMathText({ content, className = '' }: RenderMathTextProps) {
  if (!content) return null;

  // Split into tokens by $$block$$ and $inline$
  const renderFormatted = () => {
    const parts: React.ReactNode[] = [];
    let remaining = content;
    let keyIdx = 0;

    // Regex to capture $$...$$ or $...$
    const mathRegex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mathRegex.exec(content)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${keyIdx++}`}>
            {content.substring(lastIndex, match.index)}
          </span>
        );
      }

      const raw = match[0];
      const isBlock = raw.startsWith('$$') && raw.endsWith('$$');
      const mathExpr = isBlock ? raw.slice(2, -2).trim() : raw.slice(1, -1).trim();

      try {
        const html = katex.renderToString(mathExpr, {
          displayMode: isBlock,
          throwOnError: false,
          output: 'htmlAndMathml',
        });

        parts.push(
          <span
            key={`math-${keyIdx++}`}
            dangerouslySetInnerHTML={{ __html: html }}
            className={isBlock ? 'block my-3 text-center overflow-x-auto py-1' : 'inline-block px-1'}
          />
        );
      } catch (err) {
        parts.push(
          <code key={`err-${keyIdx++}`} className="text-red-500 bg-red-50 dark:bg-red-950 px-1 py-0.5 rounded text-xs">
            {raw}
          </code>
        );
      }

      lastIndex = mathRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(
        <span key={`text-${keyIdx++}`}>
          {content.substring(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  return (
    <div className={`leading-relaxed whitespace-pre-wrap ${className}`}>
      {renderFormatted()}
    </div>
  );
}
