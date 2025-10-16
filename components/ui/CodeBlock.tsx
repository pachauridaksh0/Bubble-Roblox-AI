

import React, { useState } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { ClipboardDocumentIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/solid';

interface CodeBlockProps {
  code: string;
  language: string;
  showFooter?: boolean; // Keep prop for compatibility, but it's no longer used
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Normalize language for prism-react-renderer if needed
  const prismLanguage = language === 'lua' ? 'lua' : 'jsx';

  return (
    <div className="relative group bg-[#1E1E1E] rounded-lg my-4">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-1 bg-white/10 rounded-md text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        {copied ? (
            <span className="flex items-center gap-1"><ClipboardDocumentCheckIcon className="w-4 h-4 text-green-400"/> Copied!</span>
        ) : (
            <span className="flex items-center gap-1"><ClipboardDocumentIcon className="w-4 h-4"/> Copy</span>
        )}
      </button>
      <Highlight theme={themes.vsDark} code={code.trim()} language={prismLanguage}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={`${className} p-4 overflow-x-auto text-sm`} style={style}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
};