
import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { Chat, ChatMode } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatBubbleLeftEllipsisIcon, SparklesIcon, CpuChipIcon, PuzzlePieceIcon, AcademicCapIcon } from '@heroicons/react/24/solid';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  chat: Chat;
  onChatUpdate: (updates: Partial<Chat>) => void;
  isAdmin: boolean;
}

const quickActions = [
    { label: "Make a part that kills players", prompt: "Make a part that kills players when they touch it" },
    { label: "Create a simple leaderboard", prompt: "Create a simple leaderboard that shows player kills" },
    { label: "Add a double jump script", prompt: "Write a script that allows players to double jump" },
];

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, chat, onChatUpdate, isAdmin }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isModeSelectorOpen, setModeSelectorOpen] = useState(false);
  const modeSelectorRef = useRef<HTMLDivElement>(null);
  
  const modeMap: Record<ChatMode, { name: string, description: string, icon: JSX.Element }> = {
    'chat': { name: 'Bubble Chat', description: 'For conversational chat', icon: <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-primary-start" /> },
    'plan': { name: 'Bubble Plan', description: 'Plan & build projects', icon: <SparklesIcon className="w-5 h-5 text-green-400" /> },
    'build': { name: 'Bubble Plan', description: 'Plan & build projects', icon: <SparklesIcon className="w-5 h-5 text-green-400" /> },
    'thinker': { name: 'Bubble Thinker', description: 'Debate ideas', icon: <CpuChipIcon className="w-5 h-5 text-yellow-400" /> },
    'super_agent': { name: 'Bubble Max', description: 'Advanced agent', icon: <PuzzlePieceIcon className="w-5 h-5 text-violet-400" /> },
    'pro_max': { name: 'Bubble Pro Max', description: 'Developer-only expert agent', icon: <AcademicCapIcon className="w-5 h-5 text-orange-400" /> }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(adjustTextareaHeight, [text]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (modeSelectorRef.current && !modeSelectorRef.current.contains(event.target as Node)) {
            setModeSelectorOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
  
  const handleModeChange = (newMode: ChatMode) => {
    onChatUpdate({ mode: newMode });
    setModeSelectorOpen(false);
  };

  const currentModeDetails = modeMap[chat.mode] || modeMap['chat'];
  
  const modesToShow = ['chat', 'plan', 'thinker', 'super_agent'];
  if (isAdmin) {
      modesToShow.push('pro_max');
  }

  return (
    <div className="px-4 pb-4 md:px-8 md:pb-8">
        <div className="relative max-w-4xl mx-auto">
          <div className="relative bg-bg-secondary/70 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl">
            {/* Mode Selector Dropdown */}
            <div ref={modeSelectorRef} className="relative p-2 border-b border-white/10">
              <button
                onClick={() => setModeSelectorOpen(!isModeSelectorOpen)}
                className="flex items-center gap-2 text-sm font-semibold text-white px-1 py-1"
                aria-haspopup="true"
                aria-expanded={isModeSelectorOpen}
              >
                {currentModeDetails.icon}
                <span>{currentModeDetails.name}</span>
                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isModeSelectorOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {isModeSelectorOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute bottom-full left-0 mb-2 w-72 bg-bg-tertiary p-2 rounded-lg shadow-lg border border-white/10 z-10"
                    role="menu"
                  >
                    {Object.entries(modeMap)
                      .filter(([key]) => modesToShow.includes(key))
                      .map(([key, { name, icon, description }]) => (
                        <button
                          key={key}
                          onClick={() => handleModeChange(key as ChatMode)}
                          className={`w-full flex items-start gap-3 p-2 text-left rounded-md text-sm transition-colors ${chat.mode === key ? 'bg-primary-start/20 text-white' : 'text-gray-300 hover:bg-white/10'}`}
                          role="menuitem"
                        >
                          {React.cloneElement(icon, { className: "w-5 h-5 mt-0.5 flex-shrink-0" })}
                          <div>
                            <span className="font-semibold">{name}</span>
                            <p className="text-xs text-gray-400">{description}</p>
                          </div>
                        </button>
                      ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Text Input Form */}
            <form
              onSubmit={handleSubmit}
              className="flex items-end p-2"
            >
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${currentModeDetails.name}...`}
                className="flex-1 bg-transparent text-gray-200 placeholder-gray-500 focus:outline-none resize-none px-3 py-2 max-h-48"
                rows={1}
                disabled={isLoading}
                aria-label="Chat message input"
              />
              <button
                type="submit"
                disabled={isLoading || !text.trim()}
                className="ml-2 flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-primary-start to-primary-end flex items-center justify-center text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
                aria-label="Send message"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </form>
          </div>

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
