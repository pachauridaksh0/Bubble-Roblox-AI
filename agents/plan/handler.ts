import { GoogleGenAI } from "@google/genai";
import { AgentInput, AgentOutput } from '../types';
import { clarificationInstruction, planGenerationInstruction } from './instructions';
import { clarificationSchema, planSchema } from './schemas';
import { Task } from '../../types';

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

const generateClarifyingQuestions = async (input: AgentInput): Promise<ClarificationQuestionsResponse> => {
    const { prompt, apiKey, model } = input;
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
        model,
        contents: `User's goal: "${prompt}"`,
        config: {
            systemInstruction: clarificationInstruction,
            responseMimeType: "application/json",
            responseSchema: clarificationSchema
        }
    });
    return JSON.parse(response.text.trim()) as ClarificationQuestionsResponse;
};

const generatePlan = async (input: AgentInput): Promise<PlanResponse> => {
    const { prompt, answers, apiKey, model } = input;
    const ai = new GoogleGenAI({ apiKey });
    const maxRetries = 3;
    let lastError: Error | null = null;

    let fullPrompt = `User request: "${prompt}"`;
    if (answers) {
        fullPrompt += "\n\nUser's answers to clarifying questions:\n" + answers.map((a, i) => `${i + 1}. ${a}`).join("\n");
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await ai.models.generateContent({
                model,
                contents: fullPrompt,
                config: {
                    systemInstruction: planGenerationInstruction,
                    responseMimeType: "application/json",
                    responseSchema: planSchema
                }
            });
            return JSON.parse(response.text.trim()) as PlanResponse;
        } catch (error) {
            lastError = error as Error;
            console.error(`Attempt ${attempt} failed for plan generation:`, error);
            if (attempt < maxRetries) {
                await delay(Math.pow(2, attempt) * 1000);
            }
        }
    }
    const errorMessage = lastError instanceof Error ? lastError.message : "An unknown error occurred.";
    throw new Error(`AI service unavailable after multiple retries. Details: ${errorMessage}`);
};

export const runPlanAgent = async (input: AgentInput): Promise<AgentOutput> => {
    const { project, chat, prompt } = input;

    // If answers are provided, skip asking questions and generate the plan directly.
    if (input.answers) {
        const planResponse = await generatePlan(input);
        const planTasks: Task[] = planResponse.tasks.map(t => ({ text: t, status: 'pending' }));
        const planMessage: AgentOutput[0] = {
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
        };
        return [planMessage];
    }

    // Otherwise, start by asking clarifying questions.
    const questionResponse = await generateClarifyingQuestions(input);

    if (questionResponse.questions && questionResponse.questions.length > 0) {
        // If there are questions, return a clarification message
        const clarificationMessage: AgentOutput[0] = {
            project_id: project.id,
            chat_id: chat.id,
            sender: 'ai',
            text: "Before I create a plan, I have a few questions to make sure I build exactly what you need:",
            clarification: {
                prompt: prompt,
                questions: questionResponse.questions,
            }
        };
        return [clarificationMessage];
    } else {
        // If no questions are needed, generate the plan immediately
        const planResponse = await generatePlan(input);
        const planTasks: Task[] = planResponse.tasks.map(t => ({ text: t, status: 'pending' }));
        const planMessage: AgentOutput[0] = {
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
        };
        return [planMessage];
    }
};
