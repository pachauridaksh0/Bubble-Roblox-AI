import { SupabaseClient, User } from '@supabase/supabase-js';
import { Project, Chat, Message } from '../types';

export interface AgentInput {
    prompt: string;
    apiKey: string;
    model: string;
    project: Project;
    chat: Chat;
    user: User;
    supabase: SupabaseClient;
    history: Message[];
    // Optional, for when a plan is being generated from answers
    answers?: string[];
    // Optional callback for streaming responses
    onStreamChunk?: (chunk: string) => void;
}

// The output is just the message content. The ChatView will handle saving it to the DB.
export type AgentOutput = Omit<Message, 'id' | 'created_at'>[];

export interface AgentExecutionResult {
    messages: AgentOutput;
    projectUpdate?: Partial<Project>;
}
