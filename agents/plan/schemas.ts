import { Type } from "@google/genai";

export const clarificationSchema = {
    type: Type.OBJECT,
    properties: {
        questions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of clarifying questions for the user."
        }
    },
    required: ["questions"]
};

export const planSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A short, descriptive title for the overall plan. e.g., 'Treasure Hunt System'." },
        introduction: { type: Type.STRING, description: "A friendly introductory sentence to present the plan." },
        features: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of high-level features for the user." },
        mermaidGraph: { type: Type.STRING, description: "A Mermaid.js graph definition string representing the project structure." },
        tasks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of specific, actionable sub-tasks." }
    },
    required: ["title", "introduction", "features", "mermaidGraph", "tasks"]
};
