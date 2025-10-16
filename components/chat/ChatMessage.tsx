import React, { useState, useEffect, useRef } from 'react';
import { Message, Task } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { CodeBlock } from '../ui/CodeBlock';
import { CheckCircleIcon, LightBulbIcon, CodeBracketSquareIcon, EyeIcon, ShareIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { CpuChipIcon, ExclamationTriangleIcon, ChevronDownIcon, ArrowsPointingOutIcon, XMarkIcon, PlusIcon, MinusIcon, ArrowPathIcon, ArrowsPointingInIcon } from '@heroicons/react/24/outline';
import { ClarificationForm } from './ClarificationForm';
import { useToast } from '../../hooks/useToast';

const ImageLoadingPlaceholder: React.FC = () => {
    return (
        <div className="relative aspect-square w-full max-w-md my-4 p-4 rounded-lg bg-black/20 border border-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-bg-tertiary via-bg-secondary to-bg-tertiary animate-pulse"></div>
            <div className="relative z-10 flex flex-col items-center justify-center h-full text-center">
                <SparklesIcon className="w-10 h-10 text-primary-start/50 mb-3" />
                <p className="font-semibold text-white/80">Generating Image...</p>
                <p className="text-sm text-white/50">The AI is creating your visual, this may take a moment.</p>
            </div>
        </div>
    );
};

// New Image Modal Component for viewing generated images
const ImageModal: React.FC<{ src: string; onClose: () => void }> = ({ src, onClose }) => {
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const panState = useRef({ isPanning: false, startX: 0, startY: 0 });

    const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        if (!containerRef.current) return;
    
        const rect = containerRef.current.getBoundingClientRect();
        const zoomIntensity = 0.1;
        const newScale = clamp(transform.scale - e.deltaY * zoomIntensity * 0.1, 0.2, 5);
    
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
    
        const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
        const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);
    
        setTransform({ scale: newScale, x: newX, y: newY });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        panState.current = {
            isPanning: true,
            startX: e.clientX - transform.x,
            startY: e.clientY - transform.y,
        };
        if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!panState.current.isPanning) return;
        const newX = e.clientX - panState.current.startX;
        const newY = e.clientY - panState.current.startY;
        setTransform({ ...transform, x: newX, y: newY });
    };

    const handleMouseUp = () => {
        panState.current.isPanning = false;
        if (containerRef.current) containerRef.current.style.cursor = 'grab';
    };

    const zoom = (direction: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const zoomIntensity = 0.4;
        const newScale = clamp(transform.scale + direction * zoomIntensity, 0.2, 5);
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const newX = centerX - (centerX - transform.x) * (newScale / transform.scale);
        const newY = centerY - (centerY - transform.y) * (newScale / transform.scale);
        setTransform({ scale: newScale, x: newX, y: newY });
    };
    
    const resetTransform = () => setTransform({ scale: 1, x: 0, y: 0 });

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="relative w-full h-full bg-transparent flex items-center justify-center overflow-hidden"
                onWheel={handleWheel}
            >
                {/* Close Button in corner */}
                <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 bg-bg-secondary rounded-full hover:text-white transition-colors z-20">
                    <XMarkIcon className="w-6 h-6" />
                </button>
                
                {/* Image Container */}
                <div
                    ref={containerRef}
                    className="w-full h-full flex items-center justify-center p-8"
                    style={{ cursor: 'grab' }}
                    onMouseDown={handleMouseDown}
                >
                    <img
                        className="max-w-full max-h-full object-contain transition-transform duration-[50ms] ease-linear"
                        src={src}
                        alt="Enlarged generated content"
                        style={{
                            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                        }}
                    />
                </div>

                {/* Control Bubble */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-bg-secondary rounded-full shadow-lg z-20">
                     <button onClick={() => zoom(-1)} title="Zoom Out" className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                        <MinusIcon className="w-6 h-6" />
                    </button>
                    <button onClick={resetTransform} className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Reset View">
                        <ArrowsPointingInIcon className="w-6 h-6" />
                    </button>
                    <button onClick={() => zoom(1)} title="Zoom In" className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                        <PlusIcon className="w-6 h-6" />
                    </button>
                </div>
            </motion.div>
        </div>
    );
};


// New Modal Component for Mermaid Diagrams
const MermaidModal: React.FC<{ svgContent: string; onClose: () => void }> = ({ svgContent, onClose }) => {
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
    const diagramRef = useRef<HTMLDivElement>(null);
    const panState = useRef({ isPanning: false, startX: 0, startY: 0 });
    const pinchState = useRef({ isPinching: false, initialDist: 0, initialScale: 1 });

    const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        if (!diagramRef.current) return;
    
        const rect = diagramRef.current.getBoundingClientRect();
        const zoomIntensity = 0.1;
        const newScale = clamp(transform.scale - e.deltaY * zoomIntensity * 0.1, 0.2, 8);
    
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
    
        const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
        const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);
    
        setTransform({ scale: newScale, x: newX, y: newY });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        panState.current = {
            isPanning: true,
            startX: e.clientX - transform.x,
            startY: e.clientY - transform.y,
        };
        if (diagramRef.current) diagramRef.current.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!panState.current.isPanning) return;
        const newX = e.clientX - panState.current.startX;
        const newY = e.clientY - panState.current.startY;
        setTransform({ ...transform, x: newX, y: newY });
    };

    const handleMouseUp = () => {
        panState.current.isPanning = false;
        if (diagramRef.current) diagramRef.current.style.cursor = 'grab';
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            panState.current = {
                isPanning: true,
                startX: touch.clientX - transform.x,
                startY: touch.clientY - transform.y,
            };
        } else if (e.touches.length === 2) {
             panState.current.isPanning = false;
             const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
             pinchState.current = { isPinching: true, initialDist: dist, initialScale: transform.scale };
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        e.preventDefault();
        if (e.touches.length === 1 && panState.current.isPanning) {
            const touch = e.touches[0];
            const newX = touch.clientX - panState.current.startX;
            const newY = touch.clientY - panState.current.startY;
            setTransform({ ...transform, x: newX, y: newY });
        } else if (e.touches.length === 2 && pinchState.current.isPinching && diagramRef.current) {
            const rect = diagramRef.current.getBoundingClientRect();
            const newDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            const scaleFactor = newDist / pinchState.current.initialDist;
            const newScale = clamp(pinchState.current.initialScale * scaleFactor, 0.2, 8);
            
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

            const newX = midX - (midX - transform.x) * (newScale / transform.scale);
            const newY = midY - (midY - transform.y) * (newScale / transform.scale);
            
            setTransform({ scale: newScale, x: newX, y: newY });
        }
    };

    const handleTouchEnd = () => {
        panState.current.isPanning = false;
        pinchState.current.isPinching = false;
    };
    
    const handleDoubleClick = (e: React.MouseEvent) => {
        e.preventDefault();
         if (!diagramRef.current) return;
        const rect = diagramRef.current.getBoundingClientRect();
        const newScale = clamp(transform.scale * 1.8, 0.2, 8);
    
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
    
        const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
        const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);
    
        setTransform({ scale: newScale, x: newX, y: newY });
    };

    const zoom = (direction: number) => {
        if (!diagramRef.current) return;
        const rect = diagramRef.current.getBoundingClientRect();
        const zoomIntensity = 0.5;
        const newScale = clamp(transform.scale + direction * zoomIntensity, 0.2, 8);
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const newX = centerX - (centerX - transform.x) * (newScale / transform.scale);
        const newY = centerY - (centerY - transform.y) * (newScale / transform.scale);
        setTransform({ scale: newScale, x: newX, y: newY });
    };
    
    const resetTransform = () => setTransform({ scale: 1, x: 0, y: 0 });

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp} // Stop panning if mouse leaves window
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                className="relative w-full h-full bg-transparent flex items-center justify-center overflow-hidden"
                onWheel={handleWheel}
            >
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 bg-bg-secondary rounded-full hover:text-white transition-colors z-20">
                    <XMarkIcon className="w-6 h-6" />
                </button>
                
                {/* Diagram Container */}
                <div
                    ref={diagramRef}
                    className="w-full h-full flex items-center justify-center"
                    style={{ cursor: 'grab' }}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    onDoubleClick={handleDoubleClick}
                >
                    <div
                        className="transition-transform duration-[50ms] ease-linear"
                        style={{
                            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                        }}
                        dangerouslySetInnerHTML={{ __html: svgContent }}
                    />
                </div>

                {/* Zoom Controls */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-bg-secondary rounded-full shadow-lg z-20">
                     <button onClick={() => zoom(-1)} className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                        <MinusIcon className="w-6 h-6" />
                    </button>
                    <button onClick={resetTransform} className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors" title="Reset View">
                        <ArrowsPointingInIcon className="w-6 h-6" />
                    </button>
                    <button onClick={() => zoom(1)} className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                        <PlusIcon className="w-6 h-6" />
                    </button>
                </div>
            </motion.div>
        </div>
    );
};


// MermaidDiagram Component
const MermaidDiagram: React.FC<{ graphDefinition: string }> = ({ graphDefinition }) => {
    const mermaidRef = useRef<HTMLDivElement>(null);
    const [svgContent, setSvgContent] = useState('');
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        const renderMermaid = async () => {
            const trimmedGraphDef = graphDefinition ? graphDefinition.trim() : '';
            
            if (trimmedGraphDef && (window as any).mermaid) {
                const { mermaidAPI } = (window as any).mermaid;
                try {
                    await mermaidAPI.parse(trimmedGraphDef);
                    setError('');

                    const { svg } = await mermaidAPI.render(`mermaid-graph-${Date.now()}`, trimmedGraphDef);
                    setSvgContent(svg);
                } catch (e) {
                    const errorMessage = "Could not render the visual plan. The diagram syntax returned by the AI appears to be invalid.";
                    console.error("Mermaid rendering error:", e);
                    setError(errorMessage);
                    setSvgContent('');
                    addToast(errorMessage, 'error');
                }
            } else {
                setSvgContent('');
            }
        };
        renderMermaid();
    }, [graphDefinition, addToast]);

    if (error) {
        return (
            <div className="p-4 bg-error/10 text-error/80 text-sm rounded-lg flex items-center gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                <div>
                    <p className="font-semibold">Visual Plan Error</p>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!svgContent) {
        return <div className="p-4 text-center text-gray-500">Generating blueprint...</div>;
    }

    return (
        <>
            <div className="relative group">
                <div ref={mermaidRef} dangerouslySetInnerHTML={{ __html: svgContent }} className="flex justify-center p-2" />
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg cursor-pointer"
                    aria-label="Enlarge diagram"
                >
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-primary rounded-full text-white text-sm shadow-lg">
                        <ArrowsPointingOutIcon className="w-4 h-4" />
                        <span>View Larger</span>
                    </div>
                </button>
            </div>
            <AnimatePresence>
                {isModalOpen && <MermaidModal svgContent={svgContent} onClose={() => setIsModalOpen(false)} />}
            </AnimatePresence>
        </>
    );
};


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
             {plan.mermaidGraph && (
                <div className="mb-4">
                     <MermaidDiagram graphDefinition={plan.mermaidGraph} />
                </div>
             )}
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
    if (!plan) return null;

    const isPlanEmpty = (!plan.features || plan.features.length === 0 || (plan.features.length === 1 && plan.features[0].includes("insufficient"))) && !plan.mermaidGraph;
    if (isPlanEmpty) {
        return <p className="whitespace-pre-wrap"><HighlightedText text={message.text} highlight={searchQuery || ''} /></p>;
    }

    const hasStartedExecution = plan.tasks.some(t => t.status !== 'pending');

    if (hasStartedExecution) {
        return (
            <>
                <p><HighlightedText text={message.text} highlight={searchQuery || ''} /></p>
                <PlanExecutionRenderer plan={plan} />
            </>
        );
    }
    
    return (
        <div className="space-y-4">
            <p><HighlightedText text={message.text} highlight={searchQuery || ''} /></p>
            
            <div className="p-4 rounded-lg bg-black/20 border border-white/10">
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
            
            <div className="p-4 rounded-lg bg-black/20 border border-white/10">
                 <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <ShareIcon className="w-5 h-5 text-primary-start/80"/>
                    Project Blueprint
                </h4>
                 <p className="text-sm text-gray-400 mb-2">Here's a visual breakdown of how the components will work together.</p>
                 <div className="p-2 rounded-lg bg-bg-secondary/70">
                    {plan.mermaidGraph ? (
                        <MermaidDiagram graphDefinition={plan.mermaidGraph} />
                    ) : (
                        <div className="p-6 text-center text-gray-400 border-2 border-dashed border-bg-tertiary rounded-lg">
                            <p className="font-semibold">Please Provide Project Details</p>
                        </div>
                    )}
                 </div>
             </div>
            
            <div className="pb-3">
                 <button
                    onClick={() => onExecutePlan(message.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-primary-start text-white rounded-lg shadow-lg hover:bg-primary-start/80 transition-all duration-150 ease-in-out transform hover:scale-[1.02] active:scale-95"
                >
                    <SparklesIcon className="w-5 h-5"/>
                    <span>Start Building</span>
                </button>
            </div>
        </div>
    )
}

const ClarificationRenderer: React.FC<{ message: Message, onClarificationSubmit: (messageId: string, answers: string[]) => void, searchQuery?: string }> = ({ message, onClarificationSubmit, searchQuery }) => {
    const { clarification } = message;
    if (!clarification) return null;

    const handleSubmit = (answers: string[]) => {
        onClarificationSubmit(message.id, answers);
    }

    if (clarification.answers) {
        return <p className="whitespace-pre-wrap"><HighlightedText text={message.text} highlight={searchQuery || ''} /></p>;
    }

    return (
        <div className="space-y-4">
            <p><HighlightedText text={message.text} highlight={searchQuery || ''} /></p>
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
        return <p className="whitespace-pre-wrap"><HighlightedText text={message.text} highlight={searchQuery || ''} /></p>;
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
            <div className="flex border-b border-white/10">
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
            <div className="pt-4">
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
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // User Message Bubble
  if (isUser) {
    return (
        <motion.div
          variants={variants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.3 }}
          className={`flex justify-end mb-3 px-4 ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
        >
            <div className={`bg-indigo-600 text-white rounded-2xl px-4 py-2 max-w-[60%] break-words shadow-md ${isCurrentResult ? 'ring-2 ring-offset-2 ring-offset-bg-primary ring-yellow-400' : ''}`}>
                <p className="text-sm whitespace-pre-wrap">
                    <HighlightedText text={message.text} highlight={searchQuery} />
                </p>
            </div>
        </motion.div>
    );
  }
  
  // AI Full-Width Response
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.3 }}
      className={`flex flex-col items-start transition-opacity duration-300 ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
    >
        <div className={`w-full prose ${isCurrentResult ? 'rounded-lg ring-2 ring-offset-2 ring-offset-bg-primary ring-yellow-400' : ''}`}>
            {showRaw ? (
                <pre className="p-4 text-xs bg-black/30 rounded-lg overflow-x-auto">
                    {JSON.stringify(message, null, 2)}
                </pre>
            ) : message.imageStatus === 'generating' ? (
                <ImageLoadingPlaceholder />
            ) : (
                <>
                    {message.standing_response ? (
                        <ThinkerRenderer message={message} searchQuery={searchQuery} />
                    ) : message.plan ? (
                        <PlanUIRenderer message={message} onExecutePlan={onExecutePlan} searchQuery={searchQuery} />
                    ) : message.clarification ? (
                        <ClarificationRenderer message={message} onClarificationSubmit={onClarificationSubmit} searchQuery={searchQuery}/>
                    ) : (
                        <p className="whitespace-pre-wrap"><HighlightedText text={message.text} highlight={searchQuery} /></p>
                    )}
        
                    {message.image_base64 && (
                        <>
                            <div className="mt-4 not-prose">
                                <button 
                                    onClick={() => setIsImageModalOpen(true)} 
                                    className="block w-full group"
                                    aria-label="Enlarge image"
                                >
                                    <img
                                        src={`data:image/png;base64,${message.image_base64}`}
                                        alt="Generated content"
                                        className="rounded-lg max-w-md mx-auto h-auto shadow-lg transition-transform duration-200 group-hover:scale-[1.02] cursor-pointer"
                                    />
                                </button>
                            </div>
                    
                            <AnimatePresence>
                                {isImageModalOpen && (
                                    <ImageModal 
                                        src={`data:image/png;base64,${message.image_base64}`}
                                        onClose={() => setIsImageModalOpen(false)}
                                    />
                                )}
                            </AnimatePresence>
                        </>
                    )}
        
                    {message.code && (
                      <div className="not-prose">
                        <CodeBlock code={message.code} language={message.language || 'lua'} />
                      </div>
                    )}
                </>
            )}
        </div>
      {isAdmin && (
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