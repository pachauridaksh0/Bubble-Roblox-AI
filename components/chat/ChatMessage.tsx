
import React, { useState } from 'react';
import { Message, Task } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { CodeBlock } from '../ui/CodeBlock';
import { CheckCircleIcon, BuildingStorefrontIcon, PhotoIcon, LightBulbIcon, CodeBracketSquareIcon } from '@heroicons/react/24/solid';
import { CpuChipIcon, ExclamationTriangleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { ClarificationForm } from './ClarificationForm';

interface ChatMessageProps {
  message: Message;
  onExecutePlan: (messageId: string) => void;
  onClarificationSubmit: (messageId: string, answers: string[]) => void;
}

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


const PlanUIRenderer: React.FC<{ message: Message, onExecutePlan: (messageId: string) => void }> = ({ message, onExecutePlan }) => {
    const { plan } = message;
    const [selectedOption, setSelectedOption] = useState('build');

    if (!plan) return null;

    const hasStartedExecution = plan.tasks.some(t => t.status !== 'pending');

    return (
        <div className="space-y-4">
            <p className="px-5 py-3">{message.text}</p>
            
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

const ClarificationRenderer: React.FC<{ message: Message, onClarificationSubmit: (messageId: string, answers: string[]) => void }> = ({ message, onClarificationSubmit }) => {
    const { clarification } = message;
    if (!clarification) return null;

    const handleSubmit = (answers: string[]) => {
        onClarificationSubmit(message.id, answers);
    }

    // If answers are already provided, just show the text.
    if (clarification.answers) {
        return <p className="px-5 py-3 whitespace-pre-wrap">{message.text}</p>;
    }

    return (
        <div className="space-y-4">
            <p className="px-5 pt-3">{message.text}</p>
            <ClarificationForm 
                questions={clarification.questions}
                onSubmit={handleSubmit}
            />
        </div>
    )
}


export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onExecutePlan, onClarificationSubmit }) => {
  const isUser = message.sender === 'user';

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-md lg:max-w-2xl px-1 ${isUser ? 'ml-auto' : 'mr-auto'}`}>
        <div
          className={`rounded-2xl shadow-lg ${
            isUser
              ? 'bg-gradient-to-br from-primary-start to-primary-end text-white'
              : 'bg-bg-tertiary/50 backdrop-blur-md border border-white/10 text-gray-200'
          }`}
        >
            {message.plan ? (
                <PlanUIRenderer message={message} onExecutePlan={onExecutePlan} />
            ) : message.clarification ? (
                <ClarificationRenderer message={message} onClarificationSubmit={onClarificationSubmit} />
            ) : (
                <p className="px-5 py-3 whitespace-pre-wrap">{message.text}</p>
            )}

            {message.code && message.language && (
                <CodeBlock code={message.code} language={message.language} />
            )}
        </div>
      </div>
    </motion.div>
  );
};