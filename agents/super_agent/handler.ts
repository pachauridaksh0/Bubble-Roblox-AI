import { runPlanAgent } from '../plan/handler';

// The "Super Agent" will start with the same clarification and planning
// logic as the standard "Plan" agent. This provides a foundation that can
// be expanded with more advanced capabilities in the future.
export const runSuperAgent = runPlanAgent;
