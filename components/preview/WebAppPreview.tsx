import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Message } from '../../types';
import { ComputerDesktopIcon } from '@heroicons/react/24/outline';

interface WebAppPreviewProps {
  messages: Message[];
}

export const WebAppPreview: React.FC<WebAppPreviewProps> = ({ messages }) => {
  const [width, setWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // FIX: Imported 'useMemo' from React to resolve reference error.
  const combinedHtml = useMemo(() => {
    // Concatenate code from all AI messages that contain it
    const codeSnippets = messages
      .filter(msg => msg.sender === 'ai' && msg.code)
      .map(msg => msg.code);

    if (codeSnippets.length === 0) {
      return null;
    }
    
    // For simplicity, we'll just use the latest code snippet for the preview.
    // A more advanced implementation might try to merge them.
    return codeSnippets[codeSnippets.length - 1];
  }, [messages]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !sidebarRef.current) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 300 && newWidth < window.innerWidth * 0.7) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizing(true);
  };

  return (
    <motion.aside
      ref={sidebarRef}
      style={{ width: `${width}px` }}
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex-shrink-0 bg-bg-secondary/30 border-l border-white/10 shadow-2xl flex flex-col relative"
    >
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 left-0 -ml-1 w-2 h-full cursor-col-resize z-10 group"
      >
        <div className="w-0.5 h-full bg-transparent group-hover:bg-primary-start transition-colors duration-200"></div>
      </div>

      <div className="p-4 border-b border-white/10 flex-shrink-0 flex items-center gap-2">
        <ComputerDesktopIcon className="w-5 h-5 text-gray-400" />
        <h2 className="text-lg font-semibold text-white">Live Preview</h2>
      </div>

      <div className="flex-1 bg-white overflow-hidden">
        {combinedHtml ? (
          <iframe
            srcDoc={combinedHtml}
            title="Web App Preview"
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="p-4 h-full flex items-center justify-center bg-gray-100">
            <p className="text-gray-500 text-center text-sm">
              The live preview for your web app will appear here as the AI generates code.
            </p>
          </div>
        )}
      </div>
    </motion.aside>
  );
};