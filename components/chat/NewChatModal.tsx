import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ExclamationTriangleIcon, BoltIcon, CpuChipIcon } from '@heroicons/react/24/solid';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChat: (name: string, model: string) => Promise<void>;
  existingChatCount: number;
}

// FIX: Add an interface for model objects to make the `disabled` property optional.
// This resolves TypeScript errors when accessing `model.disabled` later in the component.
interface ModelInfo {
    id: string;
    name: string;
    description: string;
    icon: JSX.Element;
    disabled?: boolean;
}

const models: ModelInfo[] = [
    { 
        id: 'gemini-2.5-flash', 
        name: 'Gemini 2.5 Flash', 
        description: 'Fast, multimodal, and cost-effective for most tasks.', 
        icon: <BoltIcon className="w-6 h-6 text-white"/> 
    },
    // Example of a future disabled option
    // { 
    //     id: 'gemini-pro', 
    //     name: 'Gemini Pro', 
    //     description: 'Powerful model for complex reasoning.', 
    //     icon: <CpuChipIcon className="w-6 h-6 text-white"/>, 
    //     disabled: true 
    // },
];

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose, onCreateChat, existingChatCount }) => {
  const [chatName, setChatName] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  
  useEffect(() => {
    if (isOpen) {
        setChatName(`Chat ${existingChatCount + 1}`);
        setSelectedModel('gemini-2.5-flash');
        setIsCreating(false);
        setCreationError(null);
    }
  }, [isOpen, existingChatCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatName.trim() || !selectedModel || isCreating) return;

    setIsCreating(true);
    setCreationError(null);
    try {
      await onCreateChat(chatName, selectedModel);
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setCreationError(`Failed to create chat. Please try again. (Error: ${errorMessage})`);
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-primary/50 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="w-full max-w-lg p-8 bg-bg-secondary/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl relative"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors">
                <XMarkIcon className="w-6 h-6" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-2">New Chat</h2>
            <p className="text-gray-400 mb-6">Start a new conversation with a specific AI model.</p>
            
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="chatName" className="block text-sm font-medium text-gray-300 mb-2">Chat Name</label>
                    <input
                      type="text"
                      id="chatName"
                      value={chatName}
                      onChange={(e) => setChatName(e.target.value)}
                      placeholder="e.g., Inventory System"
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-start transition-colors"
                      required
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">AI Model</label>
                    <div className="space-y-3">
                        {models.map(model => (
                            <div 
                                key={model.id}
                                onClick={() => !model.disabled && setSelectedModel(model.id)}
                                className={`p-3 border-2 rounded-lg flex items-start gap-4 transition-colors ${
                                    selectedModel === model.id ? 'border-primary-start bg-primary-start/10' : 'border-white/20 bg-white/5'
                                } ${model.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-white/40'}`}
                            >
                                <div className={`mt-1 flex-shrink-0 ${model.disabled ? 'text-gray-500' : ''}`}>{model.icon}</div>
                                <div>
                                    <h3 className={`font-semibold ${model.disabled ? 'text-gray-400' : 'text-white'}`}>{model.name} {model.disabled && '(Coming Soon)'}</h3>
                                    <p className="text-sm text-gray-400">{model.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {creationError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg flex items-start gap-3 my-4">
                        <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5"/>
                        <p>{creationError}</p>
                    </div>
                )}

                <button
                  type="submit"
                  disabled={!chatName.trim() || !selectedModel || isCreating}
                  className="w-full h-[51px] flex items-center justify-center px-4 py-3 bg-gradient-to-r from-primary-start to-primary-end text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-primary-start/20 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                  ) : 'Start Chat'}
                </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
