import { SupabaseClient } from '@supabase/supabase-js';
import { Project, Message, Plan, ProjectPlatform, Profile, Chat, ChatMode, Memory, ProjectType, MemoryLayer, AppSettings } from '../types';

// A new type to represent the data returned from the joined query
export interface ChatWithProjectData extends Chat {
  projects: Project | null;
}

// Helper to extract a clean error message from various error formats.
const getErrorMessage = (error: any): string => {
    if (!error) return "An unknown error occurred.";
    if (typeof error === 'string') return error;

    // Prioritize specific string fields from Supabase/PostgREST
    let message = error.message || error.error_description || error.details || error.hint;

    // If message is still an object (e.g., a nested error), try to stringify it
    if (typeof message === 'object' && message !== null) {
        try {
            message = JSON.stringify(message);
        } catch {
            message = "A nested, non-serializable error object was received.";
        }
    }
    
    // If we have a string at this point, return it.
    if (typeof message === 'string' && message.trim() !== '' && message.trim() !== '{}') {
        return message;
    }
    
    // Fallback for other complex objects: try to stringify the whole error.
    try {
        const stringified = JSON.stringify(error);
        if (stringified !== '{}') return stringified;
    } catch {
        // Ignore circular reference errors during stringification
    }

    return "An un-serializable error object was thrown. Check the developer console for details.";
};


// Centralized error handler for Supabase calls to provide better user feedback.
const handleSupabaseError = (error: any, context: string): never => {
    console.error(`${context}:`, error); // Log the full error object for debugging.

    const message = getErrorMessage(error);

    // Specific check for schema cache errors, which are often transient.
    if (message.includes('schema cache') || (message.includes('relation') && message.includes('does not exist'))) {
        throw new Error(`There was a problem syncing with the database schema. A page refresh usually fixes this. Please refresh and try again.`);
    }
    
    // Check for common network-related fetch errors that manifest differently in browsers.
    if (message.includes('fetch') || message.includes('Load failed') || message.includes('NetworkError')) {
        throw new Error(`Network error: Could not connect to the database. Please check your internet connection and disable any ad-blockers.`);
    }
    
    // Throw a new error with a cleaner message for other database issues.
    throw new Error(`Database operation failed in ${context.toLowerCase()}. Reason: ${message}`);
};

// === App Settings ===
export const getAppSettings = async (supabase: SupabaseClient): Promise<AppSettings> => {
    const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('id', 1)
        .single();

    if (error) handleSupabaseError(error, 'Error fetching app settings');
    return data;
};

export const updateAppSettings = async (supabase: SupabaseClient, updates: Partial<Omit<AppSettings, 'id' | 'updated_at'>>): Promise<AppSettings> => {
    const { data, error } = await supabase
        .from('app_settings')
        .update(updates)
        .eq('id', 1)
        .select()
        .single();
    
    if (error) handleSupabaseError(error, 'Error updating app settings');
    return data;
};

// === Projects ===

export const getProjects = async (supabase: SupabaseClient, userId: string): Promise<Project[]> => {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) handleSupabaseError(error, 'Error fetching projects');
    return data || [];
};

export const getAllProjects = async (supabase: SupabaseClient): Promise<Project[]> => {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) handleSupabaseError(error, 'Error fetching all projects for admin');
    return data || [];
};

export const createProject = async (supabase: SupabaseClient, userId: string, name: string, platform: ProjectPlatform, projectType: ProjectType, description?: string): Promise<Project> => {
    // First, create the project
    const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert({ 
            user_id: userId,
            name,
            platform,
            description: description || 'Newly created project.', // Default description
            status: 'In Progress', // Default status
            default_model: 'gemini-2.5-flash',
            project_type: projectType,
        })
        .select()
        .single();
    
    if (projectError) handleSupabaseError(projectError, 'Error creating project');
    return projectData;
}

export const updateProject = async (supabase: SupabaseClient, projectId: string, updates: Partial<Project>): Promise<Project> => {
    const { data, error } = await supabase
        .from('projects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', projectId)
        .select()
        .single();

    if (error) handleSupabaseError(error, 'Error updating project');
    return data;
};

export const deleteProject = async (supabase: SupabaseClient, projectId: string): Promise<void> => {
    // This assumes that RLS is configured and cascade deletes are enabled on the 'projects' table
    // for foreign key constraints in the 'chats' and 'messages' tables.
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

    if (error) handleSupabaseError(error, 'Error deleting project');
};


// === Chats ===

export const getAllChatsForUser = async (supabase: SupabaseClient, userId: string): Promise<ChatWithProjectData[]> => {
    const { data, error } = await supabase
        .from('chats')
        .select('*, projects(*)') // This performs the join
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) handleSupabaseError(error, 'Error fetching all user chats with projects');
    // The type assertion is needed because Supabase TS inference isn't perfect on joins
    return (data as ChatWithProjectData[]) || [];
};


export const getChatsForProject = async (supabase: SupabaseClient, projectId: string): Promise<Chat[]> => {
    const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

    if (error) handleSupabaseError(error, 'Error fetching chats for project');
    return data || [];
};

export const createChat = async (supabase: SupabaseClient, projectId: string, userId: string, name: string, mode: ChatMode): Promise<Chat> => {
    const { data, error } = await supabase
        .from('chats')
        .insert({
            project_id: projectId,
            user_id: userId,
            name: name,
            mode: mode,
            updated_at: new Date().toISOString(),
        })
        .select()
        .single();
    
    if (error) handleSupabaseError(error, 'Error creating chat');
    return data;
};

export const updateChat = async (supabase: SupabaseClient, chatId: string, updates: Partial<Chat>): Promise<Chat> => {
    const { data, error } = await supabase
        .from('chats')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', chatId)
        .select()
        .single();
    
    if (error) handleSupabaseError(error, 'Error updating chat');
    return data;
};

export const deleteChat = async (supabase: SupabaseClient, chatId: string): Promise<void> => {
    const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);
    if (error) handleSupabaseError(error, 'Error deleting chat');
};


// === Profiles ===

export const createProfile = async (supabase: SupabaseClient, userId: string, displayName: string, avatarUrl: string): Promise<Profile> => {
    const { data, error } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            roblox_username: displayName, // Re-purposing this field for display name
            avatar_url: avatarUrl,
            roblox_id: userId, // Fallback value
        })
        .select()
        .single();

    if (error) handleSupabaseError(error, 'Error creating profile');
    return data;
};

export const updateProfile = async (supabase: SupabaseClient, userId: string, updates: Partial<Profile>): Promise<Profile> => {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    if (error) handleSupabaseError(error, 'Error updating profile');
    return data;
};

export const deductUserCredits = async (supabase: SupabaseClient, userId: string, amount: number): Promise<Profile> => {
    const { data, error } = await supabase.rpc('deduct_credits', { p_user_id: userId, p_amount: amount });
    if (error) handleSupabaseError(error, 'Error deducting credits');
    const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (profileError) handleSupabaseError(profileError, 'Error fetching profile after credit deduction');
    return profile;
}


export const getAllProfiles = async (supabase: SupabaseClient): Promise<Profile[]> => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('roblox_username', { ascending: true });
        
    if (error) handleSupabaseError(error, 'Error fetching all profiles for admin');
    return data || [];
};

export const updateProfileForAdmin = async (supabase: SupabaseClient, userId: string, updates: Partial<Profile>): Promise<Profile> => {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

    if (error) handleSupabaseError(error, 'Error updating profile for admin');
    return data;
};


// === Messages ===

export const getMessages = async (supabase: SupabaseClient, chatId: string): Promise<Message[]> => {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

    if (error) handleSupabaseError(error, 'Error fetching messages');
    return data || [];
};

export const addMessage = async (supabase: SupabaseClient, message: Omit<Message, 'id' | 'created_at'>): Promise<Message> => {
    // Create a copy of the message object to avoid mutating the original
    const messageToInsert = { ...message };

    // The 'imageStatus' property is for UI state management only and does not exist
    // in the database schema. It must be removed before insertion to prevent an error.
    delete (messageToInsert as Partial<Message>).imageStatus;

    const { data, error } = await supabase
        .from('messages')
        .insert(messageToInsert)
        .select()
        .single();
    
    if (error) handleSupabaseError(error, 'Error adding message');
    return data;
};

export const updateMessage = async (supabase: SupabaseClient, messageId: string, updates: Partial<Message>): Promise<Message> => {
    const { data, error } = await supabase
        .from('messages')
        .update(updates)
        .eq('id', messageId)
        .select()
        .single();
    if (error) handleSupabaseError(error, 'Error updating message');
    return data;
};

export const deleteMessage = async (supabase: SupabaseClient, messageId: string): Promise<void> => {
    const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);
    if (error) handleSupabaseError(error, 'Error deleting message');
};

export const updateMessagePlan = async (supabase: SupabaseClient, messageId: string, plan: Plan): Promise<Message> => {
    const { data, error } = await supabase
        .from('messages')
        .update({ plan })
        .eq('id', messageId)
        .select()
        .single();

    if (error) handleSupabaseError(error, 'Error updating message plan');
    return data;
};

export const updateMessageClarification = async (supabase: SupabaseClient, messageId: string, clarification: any): Promise<Message> => {
    const { data, error } = await supabase
        .from('messages')
        .update({ clarification })
        .eq('id', messageId)
        .select()
        .single();
    
    if (error) handleSupabaseError(error, 'Error updating message clarification');
    return data;
};

// === Memories ===

const MEMORY_TOKEN_LIMITS: Record<MemoryLayer, number> = {
  personal: 1500,
  project: 3000,
  codebase: 5000,
  aesthetic: 2000,
};

const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

// FIX: Update function to handle optional importance and set defaults for new memories.
export const createMemory = async (
  supabase: SupabaseClient,
  userId: string,
  layer: MemoryLayer,
  content: string,
  projectId?: string,
  metadata?: Record<string, any>,
  importance?: number
): Promise<Memory> => {
  const tokens = estimateTokens(content);
  const limit = MEMORY_TOKEN_LIMITS[layer];

  if (tokens > limit) {
    throw new Error(
      `Memory too large for ${layer} layer. Max ${limit} tokens, got ~${tokens}.`
    );
  }

  const { data, error } = await supabase
    .from('memories')
    .insert({
      user_id: userId,
      project_id: projectId || null,
      layer,
      content,
      metadata: metadata || {},
      token_count: tokens,
      importance: importance ?? 0.5,
      usage_count: 0,
    })
    .select()
    .single();

  if (error) handleSupabaseError(error, 'Failed to add memory');
  return data;
};

// FIX: Renamed function from getMemories to getMemoriesForUser to match usage in MemoryDashboard.
export const getMemoriesForUser = async (
  supabase: SupabaseClient,
  userId: string,
  projectId?: string,
  layer?: MemoryLayer
): Promise<Memory[]> => {
  let query = supabase
    .from('memories')
    .select('*')
    .eq('user_id', userId);

  if (projectId) {
    query = query.or(`project_id.is.null,project_id.eq.${projectId}`);
  } else {
    query = query.is('project_id', null);
  }

  if (layer) {
    query = query.eq('layer', layer);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) handleSupabaseError(error, 'Failed to get memories');
  return data || [];
};

// FIX: Renamed function from buildMemoryContext to getMemoriesForContext to match agent imports.
export const getMemoriesForContext = async (
  supabase: SupabaseClient,
  userId: string,
  projectId?: string
): Promise<string> => {
  const memories = await getMemoriesForUser(supabase, userId, projectId);

  const grouped: Record<MemoryLayer, Memory[]> = {
    personal: memories.filter(m => m.layer === 'personal'),
    project: memories.filter(m => m.layer === 'project'),
    codebase: memories.filter(m => m.layer === 'codebase'),
    aesthetic: memories.filter(m => m.layer === 'aesthetic'),
  };

  const context = `
=== PERSONAL MEMORY (User Preferences & Background) ===
${grouped.personal.map(m => m.content).join('\n') || 'None yet.'}

=== PROJECT MEMORY (Current Project Context) ===
${grouped.project.map(m => m.content).join('\n') || 'None yet.'}

=== CODEBASE MEMORY (Coding Patterns & Architecture) ===
${grouped.codebase.map(m => m.content).join('\n') || 'None yet.'}

=== AESTHETIC MEMORY (Design & UI Preferences) ===
${grouped.aesthetic.map(m => m.content).join('\n') || 'None yet.'}
`.trim();

  return context;
};

// FIX: Updated function to accept a partial updates object to allow updating more than just content.
export const updateMemory = async (
  supabase: SupabaseClient,
  memoryId: string,
  updates: Partial<Omit<Memory, 'id' | 'user_id' | 'created_at'>>
): Promise<Memory> => {
  const finalUpdates: Partial<Memory> = { ...updates, updated_at: new Date().toISOString() };
  if (updates.content) {
    finalUpdates.token_count = estimateTokens(updates.content);
  }
  
  const { data, error } = await supabase
    .from('memories')
    .update(finalUpdates)
    .eq('id', memoryId)
    .select()
    .single();
  if (error) handleSupabaseError(error, 'Failed to update memory');
  return data;
};

export const deleteMemory = async (supabase: SupabaseClient, memoryId: string): Promise<void> => {
  const { error } = await supabase.from('memories').delete().eq('id', memoryId);
  if (error) handleSupabaseError(error, 'Error deleting memory');
};

export const extractAndSaveMemory = async (
  supabase: SupabaseClient,
  userId: string,
  userMessage: string,
  aiResponse: string,
  projectId?: string
): Promise<void> => {
  const lower = userMessage.toLowerCase();
  
  if (lower.includes('my name is') || lower.includes('i prefer') || lower.includes('call me')) {
    await createMemory(supabase, userId, 'personal', `User stated: ${userMessage}`);
  }
  
  if (lower.includes('project') || lower.includes('building') || lower.includes('working on')) {
    await createMemory(supabase, userId, 'project', `Project context: ${userMessage} → AI noted: ${aiResponse.slice(0, 100)}`, projectId);
  }
  
  if (lower.includes('always use') || lower.includes('code style') || lower.includes('architecture')) {
    await createMemory(supabase, userId, 'codebase', `Coding preference: ${userMessage}`, projectId);
  }
  
  if (lower.includes('design') || lower.includes('color') || lower.includes('ui') || lower.includes('theme')) {
    await createMemory(supabase, userId, 'aesthetic', `Design preference: ${userMessage}`, projectId);
  }
};