

export type Sender = 'user' | 'ai';

export type TaskStatus = 'pending' | 'in-progress' | 'complete';

export interface Task {
    text: string;
    status: TaskStatus;
    code?: string | null;
    explanation?: string | null;
}

// Stored as JSONB in the database
export interface Plan {
    title: string;
    features: string[];
    tasks: Task[];
    isComplete: boolean;
}

// Stored as JSONB in the database
export interface Clarification {
    prompt: string;
    questions: string[];
    answers?: string[];
}

export type ChatMode = 'chat' | 'plan' | 'build' | 'thinker' | 'super_agent';

export interface Chat {
  id: string; // uuid
  project_id: string; // uuid
  user_id: string; // uuid
  name: string;
  mode: ChatMode;
  created_at: string;
  updated_at: string;
}

// For Thinker Mode
export interface ThinkerResponse {
    thought: string;
    response: string;
}

export interface Message {
  id: string; // uuid
  project_id: string; // uuid
  chat_id: string; // uuid
  user_id?: string; // uuid, nullable for AI messages
  text: string;
  sender: Sender;
  code?: string;
  language?: string;
  plan?: Plan;
  clarification?: Clarification;
  created_at?: string;

  // For Thinker Mode
  standing_response?: ThinkerResponse;
  opposing_response?: ThinkerResponse;
}

export type ProjectStatus = 'In Progress' | 'Archived';
// FIX: Added 'Roblox Studio' to the ProjectPlatform type to allow for both project types.
export type ProjectPlatform = 'Web App' | 'Roblox Studio';

export interface Project {
  id: string; // uuid
  user_id: string; // uuid
  name: string;
  description: string;
  status: ProjectStatus;
  platform: ProjectPlatform;
  default_model: string;
  updated_at: string; 
  created_at: string;
}

export interface Profile {
    id: string; // uuid, matches auth.users.id
    roblox_id: string; // Note: Re-purposed to provider_user_id
    roblox_username: string; // Note: Re-purposed to display_name
    avatar_url: string;
    role?: 'admin' | 'user';
    status?: 'active' | 'banned';
    ban_reason?: string | null;
}