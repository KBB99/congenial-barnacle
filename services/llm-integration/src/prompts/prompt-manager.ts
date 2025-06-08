import { MemoryStream } from '../../../shared/types';

export class PromptManager {
  
  getReflectionPrompt(recentMemories: MemoryStream[], agentContext?: any): string {
    const memoryTexts = recentMemories.map(m => `- ${m.content}`).join('\n');
    const agentInfo = agentContext ? `Agent: ${agentContext.name}\nPersonality: ${agentContext.description}\nTraits: ${agentContext.traits?.join(', ')}\n\n` : '';
    
    return `${agentInfo}Based on these recent experiences:

${memoryTexts}

Generate a thoughtful reflection that synthesizes insights from these experiences. The reflection should:
1. Identify patterns or themes across the experiences
2. Draw meaningful connections between different memories
3. Provide insights about relationships, goals, or personal growth
4. Include specific evidence from the memories to support the insights

Respond in JSON format:
{
  "insight": "A meaningful insight or realization",
  "evidence": ["specific memory references that support this insight"],
  "importance": 1-10 (how important this reflection is for the agent)
}`;
  }

  getPlanningPrompt(planType: 'daily' | 'hourly' | 'minute', context: any, currentPlan?: any): string {
    const agentInfo = context.agent ? `Agent: ${context.agent.name}\nPersonality: ${context.agent.description}\nGoals: ${context.agent.goals?.join(', ')}\n\n` : '';
    const currentPlanInfo = currentPlan ? `Current Plan: ${JSON.stringify(currentPlan, null, 2)}\n\n` : '';
    
    switch (planType) {
      case 'daily':
        return `${agentInfo}${currentPlanInfo}Create a daily plan for today. Consider the agent's personality, goals, and current situation.

Current time: ${context.currentTime || 'morning'}
Current location: ${context.location || 'unknown'}
Recent events: ${context.recentEvents?.join(', ') || 'none'}

Generate a realistic daily schedule with 5-8 high-level activities. Respond in JSON format:
{
  "date": "YYYY-MM-DD",
  "activities": ["activity 1", "activity 2", ...],
  "goals": ["primary goal for the day"],
  "reasoning": "brief explanation of the plan"
}`;

      case 'hourly':
        return `${agentInfo}${currentPlanInfo}Create an hourly plan based on the current daily plan and situation.

Current time: ${context.currentTime}
Current activity: ${context.currentActivity || 'none'}
Location: ${context.location || 'unknown'}
Available time: ${context.availableHours || 1} hours

Break down the current activity into specific hourly actions. Respond in JSON format:
{
  "hours": [
    {
      "hour": 9,
      "action": "specific action to take",
      "location": "where to do it",
      "duration": 60
    }
  ],
  "reasoning": "why this hourly breakdown makes sense"
}`;

      case 'minute':
        return `${agentInfo}${currentPlanInfo}Create a specific minute-level action plan for the immediate situation.

Current situation: ${context.situation || 'general activity'}
Current location: ${context.location || 'unknown'}
Available objects: ${context.availableObjects?.join(', ') || 'none'}
Other agents nearby: ${context.nearbyAgents?.join(', ') || 'none'}

Generate the next specific action to take right now. Respond in JSON format:
{
  "action": "specific action to take",
  "target": "what/who to interact with",
  "duration": 5-15,
  "reasoning": "why this action makes sense now"
}`;

      default:
        throw new Error(`Unknown plan type: ${planType}`);
    }
  }

  getActionPrompt(situation: string, availableActions: string[], agentContext?: any): string {
    const agentInfo = agentContext ? `Agent: ${agentContext.name}\nPersonality: ${agentContext.description}\nCurrent mood: ${agentContext.mood || 'neutral'}\n\n` : '';
    const actionsText = availableActions.length > 0 ? availableActions.join(', ') : 'move, observe, interact, communicate';
    
    return `${agentInfo}Current situation: ${situation}

Available actions: ${actionsText}

Choose the most appropriate action for this agent in this situation. Consider the agent's personality and current state.

Respond in JSON format:
{
  "type": "action_type",
  "target": "what/who to target (if applicable)",
  "parameters": {
    "key": "value"
  },
  "reasoning": "why this action was chosen"
}`;
  }

  getDialoguePrompt(speakerId: string, listenerId: string, context: any, conversationHistory?: any[]): string {
    const speakerInfo = context.speaker ? `Speaker: ${context.speaker.name}\nPersonality: ${context.speaker.description}\nRelationship to listener: ${context.speaker.relationships?.[listenerId] || 'acquaintance'}\n\n` : '';
    const listenerInfo = context.listener ? `Listener: ${context.listener.name}\nPersonality: ${context.listener.description}\n\n` : '';
    const historyText = conversationHistory?.length ? 
      `Recent conversation:\n${conversationHistory.map(msg => `${msg.speakerId === speakerId ? 'Speaker' : 'Listener'}: ${msg.content}`).join('\n')}\n\n` : '';
    
    return `${speakerInfo}${listenerInfo}${historyText}Current context: ${context.situation || 'casual conversation'}
Location: ${context.location || 'unknown'}
Mood: ${context.mood || 'neutral'}

Generate what the speaker would say in this situation. Consider their personality, relationship with the listener, and the current context.

Respond in JSON format:
{
  "content": "what the speaker says",
  "emotion": "happy/sad/angry/neutral/excited/etc",
  "intent": "inform/question/request/joke/compliment/etc",
  "reasoning": "why they said this"
}`;
  }

  getImportancePrompt(content: string, agentContext?: any): string {
    const agentInfo = agentContext ? `For agent: ${agentContext.name}\nPersonality: ${agentContext.description}\nCurrent goals: ${agentContext.goals?.join(', ')}\n\n` : '';
    
    return `${agentInfo}Rate the importance of this memory/event on a scale of 1-10:

"${content}"

Consider:
- How much this affects the agent's goals
- How emotionally significant this is
- How much this might influence future decisions
- How memorable this would be

Respond with just a number from 1-10, where:
1-3: Mundane, everyday occurrences
4-6: Moderately important events
7-8: Significant events that affect goals or relationships
9-10: Life-changing or extremely memorable events

Importance score:`;
  }

  getMemoryRetrievalPrompt(query: string, agentContext?: any): string {
    const agentInfo = agentContext ? `Agent: ${agentContext.name}\nCurrent situation: ${agentContext.situation}\n\n` : '';
    
    return `${agentInfo}Convert this query into keywords for memory retrieval:

Query: "${query}"

Extract the most relevant keywords and concepts that would help find related memories. Focus on:
- Key nouns (people, places, objects)
- Important actions or events
- Emotional states or feelings
- Time references

Respond with a comma-separated list of keywords:`;
  }

  getObservationPrompt(environment: any, agentContext?: any): string {
    const agentInfo = agentContext ? `Agent: ${agentContext.name}\nPersonality: ${agentContext.description}\n\n` : '';
    
    return `${agentInfo}Observe the current environment and generate a natural language description of what the agent notices:

Environment:
- Location: ${environment.location || 'unknown'}
- Objects present: ${environment.objects?.join(', ') || 'none'}
- Other agents: ${environment.agents?.join(', ') || 'none'}
- Weather/atmosphere: ${environment.atmosphere || 'normal'}
- Time of day: ${environment.timeOfDay || 'unknown'}

Generate an observation from this agent's perspective, considering their personality and what they would naturally notice or find interesting.

Respond with a natural language observation (1-2 sentences):`;
  }

  getRelationshipUpdatePrompt(agentId: string, otherAgentId: string, interaction: any, currentRelationship?: string): string {
    return `Update the relationship between two agents based on their recent interaction:

Agent 1: ${agentId}
Agent 2: ${otherAgentId}
Current relationship: ${currentRelationship || 'neutral'}

Recent interaction:
Type: ${interaction.type || 'conversation'}
Content: ${interaction.content || 'general interaction'}
Outcome: ${interaction.outcome || 'neutral'}

How should this interaction affect their relationship? Consider:
- The nature of the interaction (positive/negative/neutral)
- The agents' personalities
- The current relationship status

Respond in JSON format:
{
  "newRelationship": "friend/enemy/acquaintance/romantic/family/rival/etc",
  "relationshipStrength": 1-10,
  "reasoning": "why the relationship changed this way"
}`;
  }

  getGoalUpdatePrompt(agentContext: any, recentEvents: any[]): string {
    const agentInfo = `Agent: ${agentContext.name}\nPersonality: ${agentContext.description}\nCurrent goals: ${agentContext.goals?.join(', ')}\n\n`;
    const eventsText = recentEvents.map(e => `- ${e.description}`).join('\n');
    
    return `${agentInfo}Recent events:
${eventsText}

Based on these recent events, should the agent's goals be updated? Consider:
- Have any current goals been achieved?
- Do recent events suggest new goals?
- Should goal priorities change?

Respond in JSON format:
{
  "updatedGoals": ["goal 1", "goal 2", ...],
  "newGoals": ["any new goals to add"],
  "completedGoals": ["any goals that were achieved"],
  "reasoning": "explanation of changes"
}`;
  }
}