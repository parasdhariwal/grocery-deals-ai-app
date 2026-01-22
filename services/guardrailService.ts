
/**
 * Guardrail logic is now handled by the Gemini AI System Instruction 
 * for more nuanced and natural language filtering.
 */
export const guardrailService = {
  getInvalidResponse: (): string => {
    return "I am specialized in finding you the best grocery deals. Please ask me about current offers, discounts, or specific food items!";
  }
};
