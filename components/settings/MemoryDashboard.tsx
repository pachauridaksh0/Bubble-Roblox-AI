import React, { useState, useEffect } from 'react';
import { Memory, MemoryLayer } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
// FIX: Renamed import from getMemories to getMemoriesForUser to match the updated export in databaseService.
import { getMemoriesForUser, createMemory, updateMemory, deleteMemory } from '../../services/databaseService';
import { PencilIcon, TrashIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../hooks/useToast';

const layerStyles: Record<MemoryLayer, { bg: string, text: string, border: string }> = {
    personal: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    project: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
    codebase: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
    aesthetic: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
};

interface MemoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (memory: Partial<Omit<Memory, 'id' | 'user_id'>>) => Promise<void>;
    memoryToEdit?: Memory | null;
}

const MemoryModal: React.FC<MemoryModalProps> = ({ isOpen, onClose, onSave, memoryToEdit }) => {
    const [content, setContent] = useState('');
    const [layer, setLayer] = useState<MemoryLayer>('personal');
    const [importance, setImportance] = useState(0.5);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (memoryToEdit) {
            setContent(memoryToEdit.content);
            setLayer(memoryToEdit.layer);
            // FIX: Use a default value for importance to prevent errors if it's undefined.
            setImportance(memoryToEdit.importance ?? 0.5);
        } else {
            setContent('');
            setLayer('personal');
            setImportance(0.5);
        }
    }, [memoryToEdit, isOpen]);

    const handleSubmit = async () => {
        if (!content.trim()) return;
        setIsSaving(true);
        // FIX: Correctly structure the object passed to onSave.
        await onSave({
            content,
            layer,
            importance,
            // If editing, pass the original project_id
            project_id: memoryToEdit ? memoryToEdit.project_id : null, 
        });
        setIsSaving(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-primary/50 backdrop-blur-md">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="w-full max-w-lg p-6 bg-bg-secondary border border-white/10 rounded-xl shadow-2xl"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">{memoryToEdit ? 'Edit Memory' : 'Create New Memory'}</h2>
                            <button onClick={onClose} className="p-1 text-gray-500 hover:text-white"><XMarkIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Content</label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    rows={4}
                                    className="w-full p-2 bg-white/5 border border-white/20 rounded-md"
                                    placeholder="Enter the memory content..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Layer</label>
                                <select value={layer} onChange={(e) => setLayer(e.target.value as MemoryLayer)} className="w-full p-2 bg-white/5 border border-white/20 rounded-md">
                                    {Object.keys(layerStyles).map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Importance ({importance.toFixed(2)})</label>
                                <input
                                    type="range"
                                    min="0" max="1" step="0.01"
                                    value={importance}
                                    onChange={(e) => setImportance(parseFloat(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-300 bg-white/5 rounded-lg hover:bg-white/10">Cancel</button>
                            <button onClick={handleSubmit} disabled={isSaving || !content.trim()} className="px-4 py-2 text-sm font-semibold bg-primary-start text-white rounded-lg hover:bg-primary-start/80 disabled:opacity-50">
                                {isSaving ? 'Saving...' : 'Save Memory'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};


const MemoryCard: React.FC<{ memory: Memory; onEdit: (memory: Memory) => void; onDelete: (memoryId: string) => void; }> = ({ memory, onEdit, onDelete }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`p-4 bg-bg-secondary rounded-lg border ${layerStyles[memory.layer].border} flex flex-col gap-3`}
        >
            <div className="flex justify-between items-center">
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${layerStyles[memory.layer].bg} ${layerStyles[memory.layer].text}`}>
                    {memory.layer}
                </span>
                <div className="flex gap-2">
                    <button onClick={() => onEdit(memory)} className="p-1 text-gray-400 hover:text-white"><PencilIcon className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(memory.id)} className="p-1 text-gray-400 hover:text-red-400"><TrashIcon className="w-4 h-4" /></button>
                </div>
            </div>
            <p className="text-sm text-gray-300 flex-1">{memory.content}</p>
            <div className="text-xs text-gray-500 flex justify-between items-center">
                {/* FIX: Use a default value for usage_count to prevent rendering errors. */}
                <span>Used: {memory.usage_count ?? 0} times</span>
                {/* FIX: Use a default value for importance to prevent rendering errors. */}
                <div className="flex items-center gap-1" title={`Importance: ${(memory.importance ?? 0.5).toFixed(2)}`}>
                    <span>Importance</span>
                    <div className="w-10 h-1.5 bg-white/10 rounded-full"><div className="h-full bg-primary-start rounded-full" style={{ width: `${(memory.importance ?? 0.5) * 100}%` }}></div></div>
                </div>
            </div>
        </motion.div>
    );
};


export const MemoryDashboard: React.FC = () => {
    const { user, supabase } = useAuth();
    const { addToast } = useToast();
    const [memories, setMemories] = useState<Memory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [memoryToEdit, setMemoryToEdit] = useState<Memory | null>(null);

    const fetchMemories = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const userMemories = await getMemoriesForUser(supabase, user.id);
            setMemories(userMemories);
        } catch (error) {
            console.error("Failed to fetch memories", error);
            addToast("Could not load memories.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMemories();
    }, [user, supabase]);

    const handleOpenModal = (memory?: Memory) => {
        setMemoryToEdit(memory || null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setMemoryToEdit(null);
    };

    const handleSaveMemory = async (memoryData: Partial<Omit<Memory, 'id' | 'user_id'>>) => {
        if (!user) return;
        try {
            if (memoryToEdit) {
                // FIX: Correctly call updateMemory with the updates object.
                await updateMemory(supabase, memoryToEdit.id, memoryData);
                addToast("Memory updated successfully!", "success");
            } else {
                // FIX: Correctly call createMemory with positional arguments from the memoryData object.
                const { content, layer, importance, project_id } = memoryData;
                await createMemory(
                    supabase,
                    user.id,
                    layer!,
                    content!,
                    project_id || undefined,
                    undefined, // No metadata from modal
                    importance
                );
                addToast("Memory created successfully!", "success");
            }
            fetchMemories(); // Refresh list
            handleCloseModal();
        } catch (error) {
            console.error("Failed to save memory", error);
            addToast("Failed to save memory.", "error");
        }
    };

    const handleDeleteMemory = async (memoryId: string) => {
        if (window.confirm("Are you sure you want to delete this memory?")) {
            try {
                await deleteMemory(supabase, memoryId);
                addToast("Memory deleted.", "info");
                fetchMemories(); // Refresh list
            } catch (error) {
                console.error("Failed to delete memory", error);
                addToast("Failed to delete memory.", "error");
            }
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">Memory Dashboard</h2>
                    <p className="text-gray-400 max-w-2xl">View and manage the atomic memories the AI uses for context.</p>
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-primary-start text-white rounded-md font-semibold text-sm hover:bg-primary-start/80">
                    <PlusIcon className="w-5 h-5" />
                    New Memory
                </button>
            </div>
            {isLoading ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({length: 3}).map((_, i) => (
                        <div key={i} className="p-4 bg-bg-secondary rounded-lg border border-white/10 space-y-3 animate-pulse">
                            <div className="flex justify-between items-center">
                                <div className="h-5 w-16 bg-bg-tertiary rounded-full"></div>
                                <div className="h-5 w-12 bg-bg-tertiary rounded"></div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-4 w-full bg-bg-tertiary rounded"></div>
                                <div className="h-4 w-5/6 bg-bg-tertiary rounded"></div>
                            </div>
                            <div className="flex justify-between">
                                 <div className="h-3 w-20 bg-bg-tertiary rounded-full"></div>
                                 <div className="h-3 w-24 bg-bg-tertiary rounded-full"></div>
                            </div>
                        </div>
                    ))}
                 </div>
            ) : memories.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                        {memories.map(mem => <MemoryCard key={mem.id} memory={mem} onEdit={handleOpenModal} onDelete={handleDeleteMemory} />)}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="text-center py-16 text-gray-500 border-2 border-dashed border-bg-tertiary rounded-lg">
                     <h3 className="text-lg font-semibold">No Memories Yet</h3>
                    <p>As you chat with the AI, memories will appear here.</p>
                </div>
            )}
            <MemoryModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveMemory} memoryToEdit={memoryToEdit} />
        </div>
    );
};