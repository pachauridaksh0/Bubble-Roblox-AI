import { AgentInput, AgentOutput } from './types';
import { runChatAgent } from './chat/handler';
import { runPlanAgent } from './plan/handler';
import { runBuildAgent } from './build/handler';
import { runThinkerAgent } from './thinker/handler';
import { runSuperAgent } from './super_agent/handler';

export const runAgent = async (input: AgentInput): Promise<AgentOutput> => {
    try {
        switch (input.chat.mode) {
            case 'chat':
                return await runChatAgent(input);
            case 'plan':
                return await runPlanAgent(input);
            case 'build':
                return await runBuildAgent(input);
            case 'thinker':
                return await runThinkerAgent(input);
            case 'super_agent':
                return await runSuperAgent(input);
            default:
                // Fallback to the plan agent for any undefined modes
                return await runPlanAgent(input);
        }
    } catch(error) {
        console.error(`Error running agent for mode "${input.chat.mode}":`, error);
        // Re-throw the error to be handled by the calling component (ChatView)
        throw error;
    }
};
