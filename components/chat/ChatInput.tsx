
import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

const quickActions = [
    { label: "Make a part that kills players", prompt: "Make a part that kills players when they touch it" },
    { label: "Create a simple leaderboard", prompt: "Create a simple leaderboard that shows player kills" },
    { label: "Add a double jump script", prompt: "Write a script that allows players to double jump" },
];

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(adjustTextareaHeight, [text]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isLoading) {
      onSendMessage(text);
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
    }
  };

  const handleQuickAction = (prompt: string) => {
    if (isLoading) return;
    onSendMessage(prompt);
    setText('');
  };

  return (
    <div className="px-4 pb-4 md:px-8 md:pb-8">
        <div className="relative max-w-4xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="flex items-end p-2 bg-bg-secondary/70 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl"
          >
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Bubble to make something..."
              className="flex-1 bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none resize-none px-3 py-2 max-h-48"
              rows={1}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !text.trim()}
              className="ml-2 flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-primary-start to-primary-end flex items-center justify-center text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          </form>
          <div className="pt-3 px-2 flex items-center justify-center gap-2 md:gap-3 flex-wrap">
              <span className="text-xs text-gray-500 font-medium hidden sm:inline">Quick Actions:</span>
              {quickActions.map((action) => (
                <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.prompt)}
                    disabled={isLoading}
                    className="px-3 py-1.5 text-xs text-gray-400 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {action.label}
                </button>
              ))}
          </div>
        </div>
    </div>
  );
};
