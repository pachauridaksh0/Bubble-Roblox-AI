import { GoogleGenAI } from "@google/genai";
import { AgentInput, AgentOutput, AgentExecutionResult } from '../types';
import { intelligentPlanningInstruction } from './instructions';
import { agentResponseSchema } from './schemas';
import { Task } from '../../types';
import { getUserFriendlyError } from '../errorUtils';
import { getMemoriesForContext } from "../../services/databaseService";

interface AgentResponse {
    responseText?: string;
    clarification?: {
        prompt: string;
        questions: string[];
    };
    plan?: {
        title: string;
        introduction: string;
        features: string[];
        mermaidGraph: string;
        tasks: string[];
    };
}

export const runBuildAgent = async (input: AgentInput): Promise<AgentExecutionResult> => {
    const { profile, project, chat, prompt, apiKey, model, history, answers, supabase, user, onStreamChunk } = input;
    const ai = new GoogleGenAI({ apiKey });
    // FIX: Safely access ui_style with a default to prevent type errors when preferences are null.
    const uiStyle = profile?.onboarding_preferences?.ui_style ?? 'standard';

    // Provide immediate feedback that the agent is working
    onStreamChunk?.("Analyzing your request to create a plan... ✍️");

    // Construct a more detailed prompt for the AI
    let fullPrompt = `Target Platform: ${project.platform}\n\nUser request: "${prompt}"`;
    if (answers) {
        fullPrompt += "\n\nUser's answers to clarifying questions:\n" + answers.map((a, i) => `${i + 1}. ${a}`).join("\n");
    }

    const geminiHistory = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model' as 'user' | 'model',
        parts: [{ text: msg.text }],
    })).filter(msg => msg.parts[0].text.trim() !== '');

    const contents = [...geminiHistory, { role: 'user', parts: [{ text: fullPrompt }] }];
    
    const memoryContext = await getMemoriesForContext(supabase, user.id, project.id);
    const systemInstruction = `${intelligentPlanningInstruction}\n\nMEMORY CONTEXT:\n${memoryContext}`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: agentResponseSchema,
                temperature: 0.7,
                topP: 0.95,
            }
        });

        const rawResponseText = response.text.trim();
        const agentResponse = JSON.parse(rawResponseText) as AgentResponse;
        let messages: AgentOutput = [];

        // Case 1: The AI chose to have a simple conversation
        if (agentResponse.responseText) {
            const message: AgentOutput[0] = {
                project_id: project.id,
                chat_id: chat.id,
                sender: 'ai',
                text: agentResponse.responseText,
            };
            if (input.profile?.role === 'admin') {
                message.raw_ai_response = rawResponseText;
            }
            messages.push(message);
        }
        // Case 2: The AI chose to ask clarifying questions
        else if (agentResponse.clarification) {
             const clarificationLeadIn = uiStyle === 'minimal'
                ? "To proceed, I need a few details:"
                : uiStyle === 'advanced'
                ? "Excellent idea! Let's flesh out the details with a few questions to make it perfect:"
                : "Sounds like a plan! I just have a couple of quick questions to make sure I get it right:";
                
            const message: AgentOutput[0] = {
                project_id: project.id,
                chat_id: chat.id,
                sender: 'ai',
                text: clarificationLeadIn,
                clarification: agentResponse.clarification,
            };
            if (input.profile?.role === 'admin') {
                message.raw_ai_response = rawResponseText;
            }
            messages.push(message);
        }
        // Case 3: The AI chose to create a plan
        else if (agentResponse.plan) {
            const planTasks: Task[] = agentResponse.plan.tasks.map(t => ({ text: t, status: 'pending' }));
            const message: AgentOutput[0] = {
                project_id: project.id,
                chat_id: chat.id,
                sender: 'ai',
                text: agentResponse.plan.introduction,
                plan: {
                    title: agentResponse.plan.title,
                    features: agentResponse.plan.features,
                    mermaidGraph: agentResponse.plan.mermaidGraph,
                    tasks: planTasks,
                    isComplete: false,
                },
            };
             if (input.profile?.role === 'admin') {
                message.raw_ai_response = rawResponseText;
            }
            messages.push(message);
        }
        // Fallback if the AI returns an empty or invalid response
        else {
            throw new Error("The AI returned an unexpected or empty response. The response may not conform to the required schema.");
        }
        
        return { messages };

    } catch (error) {
        console.error("Error in runBuildAgent:", error);
        const errorMessage = getUserFriendlyError(error);
        const fallbackMessage: AgentOutput[0] = {
            project_id: project.id,
            chat_id: chat.id,
            sender: 'ai',
            text: `I'm sorry, but I encountered an error while trying to process your request. ${errorMessage}`
        };
        return { messages: [fallbackMessage] };
    }
};