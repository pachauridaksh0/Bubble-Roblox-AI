



import React from 'react';
import { motion } from 'framer-motion';
import { ChatMode } from '../../types';
import { ChatBubbleLeftEllipsisIcon, CpuChipIcon, SparklesIcon, PuzzlePieceIcon, AcademicCapIcon } from '@heroicons/react/24/solid';

interface InitialPromptViewProps {
  onSendMessage: (text: string) => void;
  onChatUpdate: (updates: Partial<{ mode: ChatMode }>) => void;
  currentMode: ChatMode;
  isAdmin: boolean;
}

const promptStarters = [
  "How do I make a part that gives players points?",
  "Create a plan for a simple sword fighting game",
  "What's the best way to handle player data?",
  "Write a script for a day/night cycle",
];

export const InitialPromptView: React.FC<InitialPromptViewProps> = ({ onSendMessage, onChatUpdate, currentMode, isAdmin }) => {
  const models = [
    {
      mode: 'chat' as ChatMode,
      name: 'Bubble Chat',
      description: 'For conversational chat and quick questions.',
      icon: <ChatBubbleLeftEllipsisIcon className="w-8 h-8 text-primary-start" />,
    },
    {
      mode: 'plan' as ChatMode,
      name: 'Bubble Plan',
      description: 'For project planning and code generation.',
      icon: <SparklesIcon className="w-8 h-8 text-green-400" />,
    },
    {
      mode: 'thinker' as ChatMode,
      name: 'Bubble Thinker',
      description: 'Get multiple perspectives on a problem.',
      icon: <CpuChipIcon className="w-8 h-8 text-yellow-400" />,
    },
    {
      mode: 'super_agent' as ChatMode,
      name: 'Bubble Max',
      description: 'An advanced agent for complex, multi-step tasks.',
      icon: <PuzzlePieceIcon className="w-8 h-8 text-violet-400" />,
    },
  ];

  if (isAdmin) {
    models.push({
      mode: 'pro_max' as ChatMode,
      name: 'Bubble Pro Max',
      description: 'Developer-only agent for expert-level technical architecture.',
      icon: <AcademicCapIcon className="w-8 h-8 text-orange-400" />,
    });
  }
  
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-white overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
            Start Your Creation
          </h1>
          <p className="text-lg text-gray-400 mt-4">Choose an AI model and start with a prompt below, or type your own.</p>
        </div>

        <div className="mb-12">
            <h2 className="text-xl font-semibold text-center mb-6">Select a Model</h2>
            <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-4`}>
                {models.map((model) => (
                    <motion.div
                        key={model.mode}
                        onClick={() => onChatUpdate({ mode: model.mode })}
                        className={`p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 ${currentMode === model.mode ? 'border-primary-start bg-primary-start/10 shadow-lg shadow-primary-start/10' : 'border-bg-tertiary hover:border-primary-start/50 bg-bg-secondary'}`}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="flex items-center gap-4 mb-3">
                            {model.icon}
                            <h3 className="text-xl font-bold">{model.name}</h3>
                        </div>
                        <p className="text-sm text-gray-400">{model.description}</p>
                    </motion.div>
                ))}
            </div>
        </div>

        <div>
            <h2 className="text-xl font-semibold text-center mb-6">Prompt Starters</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {promptStarters.map((prompt, index) => (
                    <motion.button
                        key={index}
                        onClick={() => onSendMessage(prompt)}
                        className="p-4 bg-bg-secondary border border-bg-tertiary rounded-lg text-left hover:bg-bg-tertiary transition-colors"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <p className="text-gray-300">{prompt}</p>
                    </motion.button>
                ))}
            </div>
        </div>
      </motion.div>
    </div>
  );
};