

import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ClipboardDocumentIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/solid';

interface CodeBlockProps {
  code: string;
  language: string;
  showFooter?: boolean;
}

type CopyStatus = 'idle' | 'copied';

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, showFooter = true }) => {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  const handleCopy = () => {
    navigator.clipboard.writeText(code.trim());
    setCopyStatus('copied');
    setTimeout(() => {
        setCopyStatus('idle');
    }, 2000);
  }

  return (
    <div className={`bg-black/30 backdrop-blur-sm ${showFooter ? 'rounded-b-2xl' : 'rounded-lg'} overflow-hidden h-full flex flex-col`}>
      <div className="overflow-auto flex-1">
         <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{ margin: 0, padding: '16px', background: 'transparent', height: '100%' }}
          codeTagProps={{ style: { fontFamily: '"Fira Code", monospace', fontSize: '14px' } }}
        >
          {code.trim()}
        </SyntaxHighlighter>
      </div>
      {showFooter && (
        <div className="p-3 bg-black/40 border-t border-white/10 flex justify-between items-center flex-shrink-0">
            <span className="text-xs text-gray-500 uppercase font-mono">{language}</span>
            <button 
                onClick={handleCopy}
                disabled={copyStatus === 'copied'}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold bg-gradient-to-r from-success to-emerald-600 text-white rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all duration-150 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed"
            >
            {copyStatus === 'copied' ? (
                <>
                    <ClipboardDocumentCheckIcon className="w-4 h-4" />
                    <span>Copied!</span>
                </>
            ) : (
                <>
                    <ClipboardDocumentIcon className="w-4 h-4" />
                    <span>Copy Code</span>
                </>
            )}
            </button>
        </div>
      )}
    </div>
  );
};