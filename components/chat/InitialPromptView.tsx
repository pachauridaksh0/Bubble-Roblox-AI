
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SparklesIcon } from '@heroicons/react/24/solid';

interface InitialPromptViewProps {
    onGeneratePlan: (prompt: string) => void;
}

export const InitialPromptView: React.FC<InitialPromptViewProps> = ({ onGeneratePlan }) => {
    const [prompt, setPrompt] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim()) {
            onGeneratePlan(prompt);
        }
    };
    
    return (
        <div className="flex flex-col items-center justify-center h-full w-full p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="w-full max-w-2xl text-center"
            >
                <div className="inline-block p-4 bg-bg-secondary/80 border border-white/10 rounded-full mb-4 shadow-lg">
                    <span className="text-4xl">🫧</span>
                </div>
                <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Let's build something new</h1>
                <p className="text-gray-400 text-lg mb-8">Describe what you want to create, and I'll generate an execution plan to get started.</p>

                <form onSubmit={handleSubmit} className="relative">
                     <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g., A system where players get a sword when they join and a leaderboard that tracks kills..."
                      className="w-full bg-bg-secondary/70 backdrop-blur-lg border border-white/10 rounded-2xl shadow-xl text-lg p-6 pr-32 min-h-[140px] resize-none focus:outline-none focus:ring-2 focus:ring-primary-start transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!prompt.trim()}
                      className="absolute right-4 bottom-4 flex items-center justify-center gap-2 px-5 py-3 text-md font-semibold bg-gradient-to-r from-primary-start to-primary-end text-white rounded-lg shadow-lg hover:shadow-primary-start/20 transition-all duration-150 ease-in-out transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <SparklesIcon className="w-5 h-5"/>
                        Generate plan
                    </button>
                </form>
            </motion.div>
        </div>
    );
};