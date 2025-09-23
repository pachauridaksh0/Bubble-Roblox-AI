import { runPlanAgent } from '../plan/handler';

// For now, the initial prompt in "Build" mode will generate a plan,
// same as the "Plan" agent. The code generation logic is handled separately
// during plan execution.
export const runBuildAgent = runPlanAgent;
