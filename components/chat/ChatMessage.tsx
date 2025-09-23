import React, { useState } from 'react';
import { Message, Task } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { CodeBlock } from '../ui/CodeBlock';
import { CheckCircleIcon, BuildingStorefrontIcon, PhotoIcon, LightBulbIcon, CodeBracketSquareIcon, EyeIcon } from '@heroicons/react/24/solid';
import { CpuChipIcon, ExclamationTriangleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { ClarificationForm } from './ClarificationForm';

interface ChatMessageProps {
  message: Message;
  onExecutePlan: (messageId: string) => void;
  onClarificationSubmit: (messageId: string, answers: string[]) => void;
  isDimmed?: boolean;
  isCurrentResult?: boolean;
  searchQuery?: string;
  isAdmin?: boolean;
}

const HighlightedText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
    if (!highlight.trim()) {
        return <>{text}</>;
    }
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
        <>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <mark key={i} className="bg-yellow-400 text-black rounded px-0.5 py-0">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </>
    );
};

const TaskStatusIcon: React.FC<{ status: Task['status'] }> = ({ status }) => {
    if (status === 'in-progress') {
        return (
            <svg className="animate-spin h-5 w-5 text-primary-start flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        );
    }
    if (status === 'pending') {
        return (
            <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-gray-500"></div>
            </div>
        );
    }
    // 'complete' status icon is handled inside TaskRenderer
    return null;
}

const TaskRenderer: React.FC<{ task: Task }> = ({ task }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const taskTextStyle = task.status === 'in-progress' ? 'text-white' : 'text-gray-300';

    if (task.status !== 'complete') {
        return (
            <div className="flex items-center space-x-3 p-3">
                <TaskStatusIcon status={task.status} />
                <span className={taskTextStyle}>{task.text}</span>
            </div>
        )
    }

    const hasError = !task.code;

    return (
        <div className={`rounded-lg transition-colors ${hasError ? 'bg-error/10' : 'bg-success/5'}`}>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex justify-between items-center p-3 text-left"
            >
                <div className="flex items-center space-x-3">
                    {hasError 
                        ? <ExclamationTriangleIcon className="w-5 h-5 text-error flex-shrink-0" />
                        : <CheckCircleIcon className="w-5 h-5 text-success flex-shrink-0" />
                    }
                    <span className={`text-sm ${hasError ? 'text-error/90' : 'text-gray-400'} line-through`}>{task.text}</span>
                </div>
                <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 pb-3">
                            <div className="p-4 rounded-md border border-white/10 bg-black/20 space-y-4">
                                {hasError ? (
                                    <div>
                                        <h5 className="font-semibold text-error mb-2">Error Details</h5>
                                        <p className="text-sm text-error/80 whitespace-pre-wrap">{task.explanation}</p>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <LightBulbIcon className="w-5 h-5 text-yellow-400" />
                                                <h5 className="font-semibold text-white">Explanation</h5>
                                            </div>
                                            <p className="text-sm text-gray-300 whitespace-pre-wrap">{task.explanation}</p>
                                        </div>
                                        {task.code && (
                                           <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <CodeBracketSquareIcon className="w-5 h-5 text-gray-400" />
                                                    <h5 className="font-semibold text-white">Generated Code</h5>
                                                </div>
                                                <CodeBlock code={task.code} language="lua" />
                                           </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

const PlanExecutionRenderer: React.FC<{ plan: Message['plan'] }> = ({ plan }) => {
    if (!plan) return null;
    return (
        <div className="mx-4 mb-4 p-4 rounded-lg bg-black/20 border border-white/10">
            <div className="flex items-center mb-4">
                <CpuChipIcon className="w-6 h-6 text-primary-start mr-3" />
                <div>
                    <h4 className="font-semibold text-white">Building: {plan.title}</h4>
                    <p className="text-sm text-gray-400">The AI is working on the tasks below.</p>
                </div>
            </div>
            <div className="space-y-2">
                {plan.tasks.map((task, index) => (
                    <TaskRenderer key={index} task={task} />
                ))}
            </div>
        </div>
    );
};


const PlanUIRenderer: React.FC<{ message: Message, onExecutePlan: (messageId: string) => void, searchQuery?: string }> = ({ message, onExecutePlan, searchQuery }) => {
    const { plan } = message;
    const [selectedOption, setSelectedOption] = useState('build');

    if (!plan) return null;

    const hasStartedExecution = plan.tasks.some(t => t.status !== 'pending');

    return (
        <div className="space-y-4">
            <p className="px-5 py-3"><HighlightedText text={message.text} highlight={searchQuery || ''} /></p>
            
            <div className="mx-4 p-4 rounded-lg bg-black/20 border border-white/10">
                <h4 className="font-semibold text-white mb-2">I'll include the following features:</h4>
                <ul className="space-y-1.5">
                    {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                            <CheckCircleIcon className="w-5 h-5 text-primary-start/80 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-300">{feature}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {hasStartedExecution ? (
                <PlanExecutionRenderer plan={plan} />
            ) : (
                <div className="mx-4 mb-4 p-4 rounded-lg bg-black/20 border border-white/10">
                    <p className="text-gray-300 mb-1">I've created a feature list based on your request.</p>
                    <h4 className="font-semibold text-white mb-4">How do you want to continue?</h4>
                    <div className="space-y-3">
                        <div 
                            onClick={() => setSelectedOption('build')}
                            className={`p-3 rounded-lg border-2 transition-colors cursor-pointer flex items-start gap-4 ${selectedOption === 'build' ? 'bg-primary-start/20 border-primary-start' : 'bg-white/5 border-transparent hover:border-white/20'}`}
                        >
                            <BuildingStorefrontIcon className="w-6 h-6 text-white mt-1 flex-shrink-0" />
                            <div>
                                <h5 className="font-bold text-white">Build the entire app</h5>
                                <p className="text-sm text-gray-400">Best if you want Agent to build out the full functionality of your app.</p>
                            </div>
                        </div>
                        <div 
                            onClick={() => setSelectedOption('design')}
                            className={`p-3 rounded-lg border-2 transition-colors cursor-pointer flex items-start gap-4 ${selectedOption === 'design' ? 'bg-primary-start/20 border-primary-start' : 'bg-white/5 border-transparent hover:border-white/20'}`}
                        >
                            <PhotoIcon className="w-6 h-6 text-white mt-1 flex-shrink-0" />
                            <div>
                                <h5 className="font-bold text-white">Start with a design</h5>
                                <p className="text-sm text-gray-400">Best if you want to see a design prototype first, then iterate on visuals or features.</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => onExecutePlan(message.id)}
                        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-primary-start text-white rounded-lg shadow-lg hover:bg-primary-start/80 transition-all duration-150 ease-in-out transform hover:scale-[1.02] active:scale-95"
                    >
                        Start building
                    </button>
                </div>
            )}
        </div>
    )
}

const ClarificationRenderer: React.FC<{ message: Message, onClarificationSubmit: (messageId: string, answers: string[]) => void, searchQuery?: string }> = ({ message, onClarificationSubmit, searchQuery }) => {
    const { clarification } = message;
    if (!clarification) return null;

    const handleSubmit = (answers: string[]) => {
        onClarificationSubmit(message.id, answers);
    }

    // If answers are already provided, just show the text.
    if (clarification.answers) {
        return <p className="px-5 py-3 whitespace-pre-wrap"><HighlightedText text={message.text} highlight={searchQuery || ''} /></p>;
    }

    return (
        <div className="space-y-4">
            <p className="px-5 pt-3"><HighlightedText text={message.text} highlight={searchQuery || ''} /></p>
            <ClarificationForm 
                questions={clarification.questions}
                onSubmit={handleSubmit}
            />
        </div>
    )
}

const ThinkerRenderer: React.FC<{ message: Message; searchQuery?: string }> = ({ message, searchQuery }) => {
    const [activeTab, setActiveTab] = useState<'final' | 'standing' | 'opposing'>('final');
    
    if (!message.standing_response || !message.opposing_response) {
        // Fallback for when data is not available
        return <p className="px-5 py-3 whitespace-pre-wrap"><HighlightedText text={message.text} highlight={searchQuery || ''} /></p>;
    }

    const tabs = [
        { id: 'final', label: 'Final Plan' },
        { id: 'standing', label: 'Standing' },
        { id: 'opposing', label: 'Opposing' }
    ];

    const renderContent = () => {
        switch(activeTab) {
            case 'standing':
                return (
                    <div>
                        <h5 className="font-semibold text-white mb-1">Thought Process</h5>
                        <p className="text-sm text-gray-400 italic mb-3">"{message.standing_response?.thought}"</p>
                        <h5 className="font-semibold text-white mb-2">Proposed Plan</h5>
                        <p className="whitespace-pre-wrap text-gray-300">{message.standing_response?.response}</p>
                    </div>
                );
            case 'opposing':
                return (
                    <div>
                        <h5 className="font-semibold text-white mb-1">Thought Process</h5>
                        <p className="text-sm text-gray-400 italic mb-3">"{message.opposing_response?.thought}"</p>
                        <h5 className="font-semibold text-white mb-2">Critique & Alternatives</h5>
                        <p className="whitespace-pre-wrap text-gray-300">{message.opposing_response?.response}</p>
                    </div>
                );
            case 'final':
            default:
                 return <p className="whitespace-pre-wrap"><HighlightedText text={message.text} highlight={searchQuery || ''} /></p>;
        }
    }

    return (
        <div className="py-2">
            <div className="flex border-b border-white/10 px-4">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`-mb-px px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id ? 'text-primary-start border-primary-start' : 'text-gray-400 hover:text-white border-transparent'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="p-4">
                 {renderContent()}
            </div>
        </div>
    )
}


export const ChatMessage: React.FC<ChatMessageProps> = ({ 
    message, 
    onExecutePlan, 
    onClarificationSubmit,
    isDimmed = false,
    isCurrentResult = false,
    searchQuery = '',
    isAdmin = false,
}) => {
  const isUser = message.sender === 'user';
  const [showRaw, setShowRaw] = useState(false);

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };
  
  const containerClasses = [
    'flex',
    'flex-col',
    isUser ? 'items-end' : 'items-start',
    'transition-opacity duration-300',
    isDimmed ? 'opacity-30' : 'opacity-100'
  ].join(' ');
  
  const bubbleClasses = [
      'rounded-2xl shadow-lg transition-all duration-200',
      isUser
        ? 'bg-gradient-to-br from-primary-start to-primary-end text-white'
        : 'bg-bg-tertiary/50 backdrop-blur-md border border-white/10 text-gray-200',
      isCurrentResult ? 'ring-2 ring-offset-2 ring-offset-bg-primary ring-yellow-400' : ''
  ].join(' ');

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.3 }}
      className={containerClasses}
    >
      <div className={`max-w-md lg:max-w-3xl px-1 w-full`}>
        <div className={bubbleClasses}>
            {showRaw ? (
                <pre className="p-4 text-xs bg-black/30 rounded-lg overflow-x-auto">
                    {JSON.stringify(message, null, 2)}
                </pre>
            ) : message.standing_response ? (
                <ThinkerRenderer message={message} searchQuery={searchQuery} />
            ) : message.plan ? (
                <PlanUIRenderer message={message} onExecutePlan={onExecutePlan} searchQuery={searchQuery} />
            ) : message.clarification ? (
                <ClarificationRenderer message={message} onClarificationSubmit={onClarificationSubmit} searchQuery={searchQuery}/>
            ) : (
                <p className="px-5 py-3 whitespace-pre-wrap"><HighlightedText text={message.text} highlight={searchQuery} /></p>
            )}

            {message.code && !showRaw && (
                <CodeBlock code={message.code} language={message.language || 'lua'} />
            )}
        </div>
      </div>
      {isAdmin && !isUser && (
        <button
            onClick={() => setShowRaw(!showRaw)}
            className="mt-2 flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 hover:text-white bg-white/5 rounded-md transition-colors"
        >
            <EyeIcon className="w-3 h-3" />
            {showRaw ? "Show Formatted" : "Raw Output"}
        </button>
      )}
    </motion.div>
  );
};