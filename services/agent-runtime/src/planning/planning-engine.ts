import { Agent, DailyPlan, HourlyPlan, MinutePlan, PlanningError } from '../../../shared/types';
import { db } from '../../../shared/database';
import { createLogger, generateTimestamp } from '../../../shared/utils';

const logger = createLogger('planning-engine');

interface PlanContext {
  agent?: Agent;
  currentTime?: string;
  location?: any;
  recentEvents?: string[];
  availableObjects?: string[];
  nearbyAgents?: string[];
  worldState?: any;
}

export class PlanningEngine {
  private llmServiceUrl: string;

  constructor() {
    this.llmServiceUrl = process.env.LLM_SERVICE_URL || 'http://localhost:3002';
  }

  async generatePlan(
    agentId: string, 
    planType: 'daily' | 'hourly' | 'minute', 
    context: PlanContext = {}
  ): Promise<any> {
    try {
      const agent = await db.getAgent(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      const planContext = {
        ...context,
        agent,
        currentTime: context.currentTime || generateTimestamp()
      };

      let plan;
      switch (planType) {
        case 'daily':
          plan = await this.generateDailyPlan(agentId, planContext);
          break;
        case 'hourly':
          plan = await this.generateHourlyPlan(agentId, planContext);
          break;
        case 'minute':
          plan = await this.generateMinutePlan(agentId, planContext);
          break;
        default:
          throw new Error(`Unknown plan type: ${planType}`);
      }

      // Update agent's current plan
      await this.updateAgentPlan(agentId, planType, plan);

      logger.info('Plan generated successfully', { agentId, planType });
      return plan;
    } catch (error) {
      logger.error('Failed to generate plan', error as Error, { agentId, planType });
      throw new PlanningError('Failed to generate plan', { agentId, planType });
    }
  }

  async getCurrentPlan(agentId: string): Promise<any> {
    try {
      const agent = await db.getAgent(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      return agent.currentPlan;
    } catch (error) {
      logger.error('Failed to get current plan', error as Error, { agentId });
      throw new PlanningError('Failed to get current plan', { agentId });
    }
  }

  async updatePlan(agentId: string, planType: 'daily' | 'hourly' | 'minute', updates: any): Promise<void> {
    try {
      const agent = await db.getAgent(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      switch (planType) {
        case 'daily':
          agent.currentPlan.dailyPlan = updates.activities || agent.currentPlan.dailyPlan;
          break;
        case 'hourly':
          agent.currentPlan.hourlyPlan = updates.actions || agent.currentPlan.hourlyPlan;
          break;
        case 'minute':
          agent.currentPlan.currentStep = updates.action || agent.currentPlan.currentStep;
          break;
      }

      await db.putAgent(agent);
      logger.debug('Plan updated', { agentId, planType });
    } catch (error) {
      logger.error('Failed to update plan', error as Error, { agentId, planType });
      throw new PlanningError('Failed to update plan', { agentId, planType });
    }
  }

  async replanIfNeeded(agentId: string, newObservation: string, context: PlanContext = {}): Promise<boolean> {
    try {
      const agent = await db.getAgent(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      // Check if replanning is needed based on the observation
      const needsReplanning = await this.shouldReplan(agent, newObservation, context);

      if (needsReplanning) {
        logger.info('Replanning triggered by observation', { agentId, observation: newObservation.substring(0, 100) });
        
        // Generate new minute plan first (most immediate)
        await this.generatePlan(agentId, 'minute', context);
        
        // Optionally update hourly plan if the change is significant
        if (await this.isSignificantChange(newObservation)) {
          await this.generatePlan(agentId, 'hourly', context);
        }

        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to check replanning', error as Error, { agentId });
      throw new PlanningError('Failed to check replanning', { agentId });
    }
  }

  async executePlanStep(agentId: string): Promise<any> {
    try {
      const agent = await db.getAgent(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      const currentStep = agent.currentPlan.currentStep;
      if (!currentStep) {
        // Generate a new minute plan if none exists
        const plan = await this.generatePlan(agentId, 'minute');
        return plan;
      }

      // Execute the current step
      const action = await this.parseActionFromStep(currentStep);
      
      logger.debug('Executing plan step', { agentId, currentStep, action });
      return action;
    } catch (error) {
      logger.error('Failed to execute plan step', error as Error, { agentId });
      throw new PlanningError('Failed to execute plan step', { agentId });
    }
  }

  private async generateDailyPlan(agentId: string, context: PlanContext): Promise<DailyPlan> {
    try {
      const response = await fetch(`${this.llmServiceUrl}/planning/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          planType: 'daily',
          context,
          currentPlan: context.agent?.currentPlan
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM service error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.plan;
    } catch (error) {
      logger.error('Failed to generate daily plan', error as Error, { agentId });
      
      // Fallback to default daily plan
      return this.getDefaultDailyPlan(context.agent);
    }
  }

  private async generateHourlyPlan(agentId: string, context: PlanContext): Promise<HourlyPlan[]> {
    try {
      const response = await fetch(`${this.llmServiceUrl}/planning/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          planType: 'hourly',
          context,
          currentPlan: context.agent?.currentPlan
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM service error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.plan.hours || [];
    } catch (error) {
      logger.error('Failed to generate hourly plan', error as Error, { agentId });
      
      // Fallback to default hourly plan
      return this.getDefaultHourlyPlan(context.agent);
    }
  }

  private async generateMinutePlan(agentId: string, context: PlanContext): Promise<MinutePlan> {
    try {
      const response = await fetch(`${this.llmServiceUrl}/planning/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          planType: 'minute',
          context,
          currentPlan: context.agent?.currentPlan
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM service error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.plan;
    } catch (error) {
      logger.error('Failed to generate minute plan', error as Error, { agentId });
      
      // Fallback to default minute plan
      return this.getDefaultMinutePlan(context.agent);
    }
  }

  private async updateAgentPlan(agentId: string, planType: string, plan: any): Promise<void> {
    const agent = await db.getAgent(agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    switch (planType) {
      case 'daily':
        agent.currentPlan.dailyPlan = plan.activities || plan.items || [];
        break;
      case 'hourly':
        agent.currentPlan.hourlyPlan = plan.hours?.map((h: any) => h.action) || plan.items || [];
        break;
      case 'minute':
        agent.currentPlan.currentStep = plan.action || plan.description || 'continue current activity';
        break;
    }

    await db.putAgent(agent);
  }

  private async shouldReplan(agent: Agent, observation: string, context: PlanContext): Promise<boolean> {
    // Simple heuristics for replanning triggers
    const replanTriggers = [
      'unexpected', 'blocked', 'interrupted', 'emergency', 'urgent',
      'changed', 'cancelled', 'unavailable', 'conflict', 'problem'
    ];

    const observationLower = observation.toLowerCase();
    const hasReplanTrigger = replanTriggers.some(trigger => observationLower.includes(trigger));

    // Also check if the observation conflicts with current plan
    const currentStep = agent.currentPlan.currentStep?.toLowerCase() || '';
    const hasConflict = currentStep && observationLower.includes('cannot') && observationLower.includes(currentStep);

    return hasReplanTrigger || hasConflict;
  }

  private async isSignificantChange(observation: string): Promise<boolean> {
    const significantTriggers = [
      'emergency', 'urgent', 'important', 'cancelled', 'changed location',
      'new person', 'unexpected event', 'problem', 'conflict'
    ];

    const observationLower = observation.toLowerCase();
    return significantTriggers.some(trigger => observationLower.includes(trigger));
  }

  private parseActionFromStep(step: string): any {
    // Parse the current step into an actionable format
    const stepLower = step.toLowerCase();
    
    if (stepLower.includes('move') || stepLower.includes('go')) {
      return { type: 'move', description: step };
    } else if (stepLower.includes('talk') || stepLower.includes('speak') || stepLower.includes('say')) {
      return { type: 'communicate', description: step };
    } else if (stepLower.includes('use') || stepLower.includes('interact')) {
      return { type: 'interact', description: step };
    } else if (stepLower.includes('observe') || stepLower.includes('look') || stepLower.includes('watch')) {
      return { type: 'observe', description: step };
    } else {
      return { type: 'general', description: step };
    }
  }

  private getDefaultDailyPlan(agent?: Agent): DailyPlan {
    const defaultActivities = [
      'Wake up and start the day',
      'Have breakfast',
      'Work on main goals',
      'Take a break and socialize',
      'Continue productive activities',
      'Have dinner',
      'Relax and reflect on the day',
      'Prepare for rest'
    ];

    return {
      date: new Date().toISOString().split('T')[0],
      activities: defaultActivities,
      goals: agent?.goals || ['Be productive', 'Maintain relationships']
    };
  }

  private getDefaultHourlyPlan(agent?: Agent): HourlyPlan[] {
    const currentHour = new Date().getHours();
    const defaultHours: HourlyPlan[] = [];

    for (let i = 0; i < 8; i++) {
      defaultHours.push({
        hour: currentHour + i,
        actions: [`Continue with planned activity ${i + 1}`],
        context: 'Default hourly plan'
      });
    }

    return defaultHours;
  }

  private getDefaultMinutePlan(agent?: Agent): MinutePlan {
    return {
      minute: new Date().getMinutes(),
      action: 'Observe surroundings and decide next action',
      reasoning: 'Default action when no specific plan is available'
    };
  }

  async getPlanningStatistics(agentId: string): Promise<any> {
    try {
      const agent = await db.getAgent(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }

      const stats = {
        hasCurrentPlan: !!agent.currentPlan,
        dailyPlanItems: agent.currentPlan?.dailyPlan?.length || 0,
        hourlyPlanItems: agent.currentPlan?.hourlyPlan?.length || 0,
        currentStep: agent.currentPlan?.currentStep || 'none',
        goalCount: agent.goals?.length || 0,
        planCompleteness: 0
      };

      // Calculate plan completeness score
      let completeness = 0;
      if (stats.dailyPlanItems > 0) completeness += 0.4;
      if (stats.hourlyPlanItems > 0) completeness += 0.4;
      if (stats.currentStep !== 'none') completeness += 0.2;
      stats.planCompleteness = completeness;

      return stats;
    } catch (error) {
      logger.error('Failed to get planning statistics', error as Error, { agentId });
      throw new PlanningError('Failed to get planning statistics', { agentId });
    }
  }
}