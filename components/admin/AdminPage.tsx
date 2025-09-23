

import React, { useState, useEffect } from 'react';
import { LeftSidebar } from '../layout/LeftSidebar';
import { ChatView } from '../chat/ChatView';
import { ProjectsPage } from '../pages/ProjectsPage';
import { AdminTopBar } from './AdminTopBar';
import { Project, Message, ProjectPlatform, Chat } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { getAllProjects, createProject, getMessages, getChatsForProject } from '../../services/databaseService';
import { validateApiKey } from '../../services/geminiService';
import { motion } from 'framer-motion';
import { KeyIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { AdminUsersPage } from './AdminUsersPage';
import { NewProjectModal } from '../dashboard/NewProjectModal';


const AdminApiKeySetup: React.FC = () => {
    const { setGeminiApiKey } = useAuth();
    const [adminKeyInput, setAdminKeyInput] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleAdminKeySave = async () => {
        if (!adminKeyInput.trim() || isValidating) return;
        setIsValidating(true);
        setValidationError(null);
        const isValid = await validateApiKey(adminKeyInput);
        if (isValid) {
            setGeminiApiKey(adminKeyInput);
        } else {
            setValidationError('Invalid API Key. Please check the key and try again.');
        }
        setIsValidating(false);
    };

    const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAdminKeyInput(e.target.value);
        if (validationError) setValidationError(null);
    };

    return (
        <div className="flex items-center justify-center h-screen bg-bg-primary text-white">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-md p-8 bg-bg-secondary/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl text-center"
            >
                <KeyIcon className="w-10 h-10 mx-auto text-primary-start mb-4" />
                <h1 className="text-2xl font-bold mb-2">Admin API Key Setup</h1>
                <p className="text-gray-400 mb-6">A Gemini API Key is required to view project data. Please provide one to continue.</p>

                <div className="space-y-2 text-left">
                    <input
                        type="password"
                        value={adminKeyInput}
                        onChange={handleKeyChange}
                        placeholder="Enter your Gemini API Key"
                        className={`w-full px-4 py-3 bg-white/5 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${validationError ? 'border-red-500/50 focus:ring-red-500' : 'border-red-500/50 focus:ring-primary-start'}`}
                    />
                    <button
                        onClick={handleAdminKeySave}
                        disabled={!adminKeyInput.trim() || isValidating}
                        className="w-full px-4 py-3 bg-primary-start text-white rounded-lg font-semibold hover:bg-primary-start/80 transition-colors disabled:opacity-50 flex items-center justify-center h-[51px]"
                    >
                        {isValidating ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Save & Continue'}
                    </button>
                </div>
                {validationError && (
                    <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-sm mt-3 text-left flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        {validationError}
                    </motion.p>
                )}
                 <p className="text-center mt-4"><a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-sm text-primary-start/80 hover:text-primary-start underline">Where can I get a Gemini API key?</a></p>
            </motion.div>
        </div>
    );
};

type AdminView = 'projects' | 'users';

export const AdminPage: React.FC = () => {
  const { geminiApiKey, user, supabase, profile, isAdmin } = useAuth();
  const [view, setView] = useState<AdminView>('projects');
  const [isNewProjectModalOpen, setNewProjectModalOpen] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  const fetchAdminProjects = async () => {
      if (!supabase) return;
      setIsLoadingProjects(true);
      setProjectsError(null);
      try {
          const allProjects = await getAllProjects(supabase);
          setProjects(allProjects);
      } catch (error) {
          console.error("Failed to fetch all projects for admin:", error instanceof Error ? error.message : String(error));
          setProjectsError("An error occurred while fetching projects.");
      } finally {
          setIsLoadingProjects(false);
      }
  };

  useEffect(() => {
    if (supabase && geminiApiKey) {
        fetchAdminProjects();

        const channel = supabase
            .channel('admin-projects-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'projects' },
                () => fetchAdminProjects()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }
  }, [supabase, geminiApiKey]);

  useEffect(() => {
    const fetchChats = async () => {
      if (activeProject && supabase) {
        try {
          const projectChats = await getChatsForProject(supabase, activeProject.id);
          setChats(projectChats);
          if (projectChats.length > 0 && !activeChat) {
            setActiveChat(projectChats[0]);
          }
        } catch (error) {
          console.error("Failed to fetch chats:", error instanceof Error ? error.message : String(error));
          setChats([]);
        }
      } else {
        setChats([]);
      }
    };
    fetchChats();
  }, [activeProject, supabase]);


  useEffect(() => {
    const fetchMessages = async () => {
      if (activeChat && supabase) {
        setIsLoadingMessages(true);
        try {
          const history = await getMessages(supabase, activeChat.id);
          setMessages(history);
        } catch (error) {
          console.error("Failed to fetch message history:", error instanceof Error ? error.message : String(error));
          setMessages([]);
        } finally {
          setIsLoadingMessages(false);
        }
      } else {
        setMessages([]);
      }
    };
    fetchMessages();
  }, [activeChat, supabase]);


  if (!geminiApiKey) {
    return <AdminApiKeySetup />;
  }

  const handleSelectProject = (project: Project) => {
    setActiveProject(project);
    setActiveChat(null);
  };
  
  const handleSettingsClick = () => {
    alert("Settings are not available in admin mode.");
  };

  const handleCreateProject = async (name: string, platform: ProjectPlatform) => {
    // In admin mode, the "owner" is the admin themselves.
    const projectOwnerId = user?.id;
    if (!projectOwnerId || !supabase) return;
    
    try {
        const { project: newProject, chat: newChat } = await createProject(supabase, projectOwnerId, name, platform);
        // Real-time subscription will add the project to the main list.
        setActiveProject(newProject);
        setChats([newChat]);
        setActiveChat(newChat);
    } catch (error) {
        console.error("Failed to create project in admin mode:", error instanceof Error ? error.message : String(error));
        throw error;
    }
  };
  
  const renderContent = () => {
    if (view === 'users') {
        return <AdminUsersPage />;
    }

    if (activeProject && activeChat && geminiApiKey) {
        return (
            <ChatView
                key={activeChat.id}
                project={activeProject}
                chat={activeChat}
                geminiApiKey={geminiApiKey}
                // FIX: Changed `initialMessages` to `messages` to match ChatViewProps.
                messages={messages}
                isLoadingHistory={isLoadingMessages}
                // FIX: Changed `onMessagesUpdate` to `setMessages` to match ChatViewProps.
                setMessages={setMessages}
                onChatUpdate={() => {}} // Admin view is read-only for chat properties
                searchQuery=""
                onSearchResultsChange={() => {}}
                currentSearchResultMessageIndex={-1}
                isAdmin={isAdmin}
            />
        );
    }

    return (
        <ProjectsPage
            projects={projects}
            onSelectProject={handleSelectProject}
            onNewProjectClick={() => setNewProjectModalOpen(true)}
            isLoading={isLoadingProjects}
            profile={profile}
            error={projectsError}
        />
    );
  };
  
  return (
    <div className="flex h-screen w-full bg-bg-primary">
      <LeftSidebar 
        project={activeProject}
        chats={chats}
        activeChatId={activeChat?.id}
        onSelectChat={setActiveChat}
        onCreateChat={() => {}}
        onUpdateChat={() => {}}
        onSettingsClick={handleSettingsClick}
        isAdminView={true}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminTopBar 
            currentView={view} 
            setView={(newView) => {
                setActiveProject(null);
                setActiveChat(null);
                setView(newView);
            }} 
        />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setNewProjectModalOpen(false)}
        onCreateProject={handleCreateProject}
        isAdmin={isAdmin}
      />
    </div>
  );
};