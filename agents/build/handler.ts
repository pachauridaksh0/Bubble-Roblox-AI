import { GoogleGenAI } from "@google/genai";
import { AgentInput, AgentOutput, AgentExecutionResult } from '../types';
import { intelligentPlanningInstruction } from './instructions';
import { agentResponseSchema } from './schemas';
import { Task } from '../../types';

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
    const { project, chat, prompt, apiKey, model, history, answers } = input;
    const ai = new GoogleGenAI({ apiKey });

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
    
    const systemInstruction = `${intelligentPlanningInstruction}\n\nPROJECT CONTEXT:\n${project.project_memory || 'No project context has been set yet.'}`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: agentResponseSchema,
            }
        });

        const agentResponse = JSON.parse(response.text.trim()) as AgentResponse;
        let messages: AgentOutput = [];

        // Case 1: The AI chose to have a simple conversation
        if (agentResponse.responseText) {
            messages.push({
                project_id: project.id,
                chat_id: chat.id,
                sender: 'ai',
                text: agentResponse.responseText,
            });
        }
        // Case 2: The AI chose to ask clarifying questions
        else if (agentResponse.clarification) {
            messages.push({
                project_id: project.id,
                chat_id: chat.id,
                sender: 'ai',
                text: "Before I create a plan, I have a few technical questions to ensure the architecture is sound:",
                clarification: agentResponse.clarification,
            });
        }
        // Case 3: The AI chose to create a plan
        else if (agentResponse.plan) {
            const planTasks: Task[] = agentResponse.plan.tasks.map(t => ({ text: t, status: 'pending' }));
            messages.push({
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
                }
            });
        }
        // Fallback if the AI returns an empty or invalid response
        else {
            throw new Error("The AI returned an unexpected or empty response. The response may not conform to the required schema.");
        }
        
        return { messages };

    } catch (error) {
        console.error("Error in runBuildAgent:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        const fallbackMessage: AgentOutput[0] = {
            project_id: project.id,
            chat_id: chat.id,
            sender: 'ai',
            text: `I'm sorry, but I encountered an error while trying to process your request. Please check the console for details. (Error: ${errorMessage})`
        };
        return { messages: [fallbackMessage] };
    }
};
