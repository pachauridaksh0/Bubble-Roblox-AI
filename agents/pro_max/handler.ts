import { GoogleGenAI, Type } from "@google/genai";
import { AgentInput, AgentOutput, AgentExecutionResult } from '../types';
import { clarificationInstruction, proMaxPlanGenerationInstruction } from './instructions';
import { planSchema } from '../build/schemas'; // Re-use schemas
import { Task, Message } from '../../types';

interface ClarificationQuestionsResponse {
    questions: string[];
}

interface PlanResponse {
    title: string;
    introduction: string;
    features: string[];
    mermaidGraph: string;
    tasks: string[];
}

// Helper for retries
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const mapMessagesToGeminiHistory = (messages: Message[]) => {
  return messages.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'model' as 'user' | 'model',
    parts: [{ text: msg.text }],
  })).filter(msg => msg.parts[0].text.trim() !== '');
};

const proMaxClarificationSchema = {
    type: Type.OBJECT,
    properties: {
        questions: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "A list of questions to ask the user. Return an empty array if no clarification is needed."
        }
    },
    required: ["questions"]
};

const generateClarifyingQuestions = async (input: AgentInput): Promise<ClarificationQuestionsResponse> => {
    const { prompt, apiKey, model, history, project } = input;
    const ai = new GoogleGenAI({ apiKey });

    const geminiHistory = mapMessagesToGeminiHistory(history);
    const contextPrompt = `PROJECT CONTEXT:\n${project.project_memory || 'No project context has been set yet.'}\n\nUSER REQUEST: "${prompt}"`;
    const contents = [...geminiHistory, { role: 'user', parts: [{ text: contextPrompt }] }];

    const response = await ai.models.generateContent({
        model,
        contents: contents,
        config: {
            systemInstruction: clarificationInstruction,
            responseMimeType: "application/json",
            responseSchema: proMaxClarificationSchema
        }
    });
    return JSON.parse(response.text.trim()) as ClarificationQuestionsResponse;
};

const generatePlan = async (input: AgentInput): Promise<PlanResponse> => {
    const { prompt, answers, apiKey, model, history, project } = input;
    const ai = new GoogleGenAI({ apiKey });
    const maxRetries = 3;
    let lastError: Error | null = null;

    let fullPrompt = `PROJECT CONTEXT:\n${project.project_memory || 'No project context has been set yet.'}\n\nUser request: "${prompt}"`;
    if (answers) {
        fullPrompt += "\n\nUser's answers to clarifying questions:\n" + answers.map((a, i) => `${i + 1}. ${a}`).join("\n");
    }

    const geminiHistory = mapMessagesToGeminiHistory(history);
    const contents = [...geminiHistory, { role: 'user', parts: [{ text: fullPrompt }] }];

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model,
                contents: contents,
                config: {
                    systemInstruction: proMaxPlanGenerationInstruction,
                    responseMimeType: "application/json",
                    responseSchema: planSchema
                }
            });
            return JSON.parse(response.text.trim()) as PlanResponse;
        } catch (error) {
            lastError = error as Error;
            console.error(`Attempt ${attempt} failed for pro_max plan generation:`, error);
            if (attempt < maxRetries) {
                await delay(Math.pow(2, attempt) * 1000);
            }
        }
    }
    const errorMessage = lastError instanceof Error ? lastError.message : "An unknown error occurred.";
    throw new Error(`AI service unavailable after multiple retries. Details: ${errorMessage}`);
};

export const runProMaxAgent = async (input: AgentInput): Promise<AgentExecutionResult> => {
    const { project, chat, prompt } = input;
    let messages: AgentOutput = [];

    // If answers are provided, skip asking questions and generate the plan directly.
    if (input.answers) {
        const planResponse = await generatePlan(input);
        const planTasks: Task[] = planResponse.tasks.map(t => ({ text: t, status: 'pending' }));
        messages.push({
            project_id: project.id,
            chat_id: chat.id,
            sender: 'ai',
            text: planResponse.introduction,
            plan: {
                title: planResponse.title,
                features: planResponse.features,
                mermaidGraph: planResponse.mermaidGraph,
                tasks: planTasks,
                isComplete: false,
            }
        });
        return { messages };
    }

    // Otherwise, start by asking clarifying questions.
    const questionResponse = await generateClarifyingQuestions(input);

    if (questionResponse.questions && questionResponse.questions.length > 0) {
        // If there are questions, return a clarification message
        messages.push({
            project_id: project.id,
            chat_id: chat.id,
            sender: 'ai',
            text: "Before I create a plan, I have a few technical questions to ensure the architecture is sound:",
            clarification: {
                prompt: prompt,
                questions: questionResponse.questions,
            }
        });
        return { messages };
    } else {
        // If no questions are needed, generate the plan immediately
        const planResponse = await generatePlan(input);
        const planTasks: Task[] = planResponse.tasks.map(t => ({ text: t, status: 'pending' }));
        messages.push({
            project_id: project.id,
            chat_id: chat.id,
            sender: 'ai',
            text: planResponse.introduction,
            plan: {
                title: planResponse.title,
                features: planResponse.features,
                mermaidGraph: planResponse.mermaidGraph,
                tasks: planTasks,
                isComplete: false,
            }
        });
        return { messages };
    }
};
