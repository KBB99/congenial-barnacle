import { Dialogue, DialogueMessage, Agent, GenerativeWorldError } from '../../../shared/types';
import { db } from '../../../shared/database';
import { createLogger, generateId, generateTimestamp } from '../../../shared/utils';

const logger = createLogger('dialogue-manager');

interface DialogueContext {
  location?: any;
  situation?: string;
  mood?: string;
  previousInteractions?: DialogueMessage[];
  worldState?: any;
}

export class DialogueManager {
  private llmServiceUrl: string;
  private activeDialogues: Map<string, Dialogue>;

  constructor() {
    this.llmServiceUrl = process.env.LLM_SERVICE_URL || 'http://localhost:3002';
    this.activeDialogues = new Map();
  }

  async initiateDialogue(
    initiatorId: string, 
    targetId: string, 
    context: DialogueContext = {}
  ): Promise<Dialogue> {
    try {
      const initiator = await db.getAgent(initiatorId);
      const target = await db.getAgent(targetId);

      if (!initiator || !target) {
        throw new Error('One or both agents not found');
      }

      if (initiator.worldId !== target.worldId) {
        throw new Error('Agents must be in the same world');
      }

      // Check if agents are in proximity
      if (!this.areAgentsInProximity(initiator, target)) {
        throw new Error('Agents are not close enough to communicate');
      }

      const dialogueId = generateId();
      const dialogue: Dialogue = {
        dialogueId,
        participants: [initiatorId, targetId],
        worldId: initiator.worldId,
        location: context.location || initiator.currentLocation,
        startTime: generateTimestamp(),
        messages: [],
        context: context.situation || 'casual conversation'
      };

      // Generate opening message from initiator
      const openingMessage = await this.generateDialogueMessage(
        initiatorId, 
        targetId, 
        dialogue, 
        context
      );

      dialogue.messages.push(openingMessage);
      this.activeDialogues.set(dialogueId, dialogue);

      // Store dialogue event
      await this.storeDialogueEvent(dialogue, 'initiated');

      logger.info('Dialogue initiated', { 
        dialogueId, 
        initiatorId, 
        targetId, 
        location: dialogue.location 
      });

      return dialogue;
    } catch (error) {
      logger.error('Failed to initiate dialogue', error as Error, { initiatorId, targetId });
      throw new GenerativeWorldError('Failed to initiate dialogue', 'DIALOGUE_ERROR', { initiatorId, targetId });
    }
  }

  async generateResponse(
    responderId: string, 
    dialogueId: string, 
    incomingMessage: DialogueMessage
  ): Promise<DialogueMessage> {
    try {
      const dialogue = this.activeDialogues.get(dialogueId);
      if (!dialogue) {
        throw new Error('Dialogue not found');
      }

      if (!dialogue.participants.includes(responderId)) {
        throw new Error('Agent is not a participant in this dialogue');
      }

      const responder = await db.getAgent(responderId);
      if (!responder) {
        throw new Error('Responder agent not found');
      }

      // Get the other participant for context
      const otherParticipantId = dialogue.participants.find(id => id !== responderId);
      const otherParticipant = otherParticipantId ? await db.getAgent(otherParticipantId) : null;

      // Generate response using LLM
      const response = await this.generateDialogueResponse(
        responder,
        otherParticipant,
        dialogue,
        incomingMessage
      );

      // Add response to dialogue
      dialogue.messages.push(response);

      // Store dialogue message as memory for both agents
      await this.storeDialogueMemories(dialogue, response);

      logger.debug('Dialogue response generated', { 
        dialogueId, 
        responderId, 
        messageLength: response.content.length 
      });

      return response;
    } catch (error) {
      logger.error('Failed to generate dialogue response', error as Error, { responderId, dialogueId });
      throw new GenerativeWorldError('Failed to generate dialogue response', 'DIALOGUE_ERROR', { responderId, dialogueId });
    }
  }

  async endDialogue(dialogueId: string, reason: string = 'natural conclusion'): Promise<void> {
    try {
      const dialogue = this.activeDialogues.get(dialogueId);
      if (!dialogue) {
        throw new Error('Dialogue not found');
      }

      dialogue.endTime = generateTimestamp();
      
      // Store final dialogue state
      await this.storeDialogueEvent(dialogue, 'ended', { reason });

      // Remove from active dialogues
      this.activeDialogues.delete(dialogueId);

      logger.info('Dialogue ended', { dialogueId, reason, messageCount: dialogue.messages.length });
    } catch (error) {
      logger.error('Failed to end dialogue', error as Error, { dialogueId });
      throw new GenerativeWorldError('Failed to end dialogue', 'DIALOGUE_ERROR', { dialogueId });
    }
  }

  async getActiveDialogues(agentId: string): Promise<Dialogue[]> {
    const activeDialogues: Dialogue[] = [];
    
    for (const dialogue of this.activeDialogues.values()) {
      if (dialogue.participants.includes(agentId) && !dialogue.endTime) {
        activeDialogues.push(dialogue);
      }
    }

    return activeDialogues;
  }

  async getDialogueHistory(agentId: string, limit: number = 10): Promise<Dialogue[]> {
    try {
      // In a full implementation, this would query stored dialogues from the database
      // For now, return recent active dialogues
      const allDialogues = Array.from(this.activeDialogues.values())
        .filter(d => d.participants.includes(agentId))
        .sort((a, b) => b.startTime.localeCompare(a.startTime))
        .slice(0, limit);

      return allDialogues;
    } catch (error) {
      logger.error('Failed to get dialogue history', error as Error, { agentId });
      throw new GenerativeWorldError('Failed to get dialogue history', 'DIALOGUE_ERROR', { agentId });
    }
  }

  async updateRelationshipFromDialogue(dialogue: Dialogue): Promise<void> {
    try {
      if (dialogue.participants.length !== 2) {
        return; // Only handle two-party conversations for now
      }

      const [agent1Id, agent2Id] = dialogue.participants;
      const agent1 = await db.getAgent(agent1Id);
      const agent2 = await db.getAgent(agent2Id);

      if (!agent1 || !agent2) {
        return;
      }

      // Analyze dialogue sentiment and update relationships
      const dialogueAnalysis = await this.analyzeDialogue(dialogue);
      
      // Update relationships based on analysis
      if (dialogueAnalysis.sentiment === 'positive') {
        await this.strengthenRelationship(agent1, agent2);
      } else if (dialogueAnalysis.sentiment === 'negative') {
        await this.weakenRelationship(agent1, agent2);
      }

      logger.debug('Relationships updated from dialogue', { 
        dialogueId: dialogue.dialogueId, 
        sentiment: dialogueAnalysis.sentiment 
      });
    } catch (error) {
      logger.error('Failed to update relationships from dialogue', error as Error, { dialogueId: dialogue.dialogueId });
      // Don't throw - this is a background process
    }
  }

  private async generateDialogueMessage(
    speakerId: string, 
    listenerId: string, 
    dialogue: Dialogue, 
    context: DialogueContext
  ): Promise<DialogueMessage> {
    const speaker = await db.getAgent(speakerId);
    const listener = await db.getAgent(listenerId);

    if (!speaker || !listener) {
      throw new Error('Speaker or listener not found');
    }

    try {
      const response = await fetch(`${this.llmServiceUrl}/dialogue/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          speakerId,
          listenerId,
          context: {
            speaker,
            listener,
            situation: context.situation || dialogue.context,
            location: dialogue.location,
            mood: context.mood || 'neutral'
          },
          conversationHistory: dialogue.messages
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM service error: ${response.statusText}`);
      }

      const data = await response.json();
      const dialogueResponse = data.dialogue;

      const message: DialogueMessage = {
        messageId: generateId(),
        speakerId,
        content: dialogueResponse.content || 'Hello!',
        timestamp: generateTimestamp(),
        emotion: dialogueResponse.emotion || 'neutral',
        intent: dialogueResponse.intent || 'conversation'
      };

      return message;
    } catch (error) {
      logger.warn('Failed to generate dialogue with LLM, using fallback', { speakerId, error: (error as Error).message });
      
      // Fallback message
      return {
        messageId: generateId(),
        speakerId,
        content: this.getFallbackMessage(speaker, listener, context),
        timestamp: generateTimestamp(),
        emotion: 'neutral',
        intent: 'conversation'
      };
    }
  }

  private async generateDialogueResponse(
    responder: Agent,
    otherParticipant: Agent | null,
    dialogue: Dialogue,
    incomingMessage: DialogueMessage
  ): Promise<DialogueMessage> {
    try {
      const response = await fetch(`${this.llmServiceUrl}/dialogue/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          speakerId: responder.agentId,
          listenerId: otherParticipant?.agentId,
          context: {
            speaker: responder,
            listener: otherParticipant,
            situation: dialogue.context,
            location: dialogue.location,
            incomingMessage: incomingMessage.content
          },
          conversationHistory: dialogue.messages
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM service error: ${response.statusText}`);
      }

      const data = await response.json();
      const dialogueResponse = data.dialogue;

      return {
        messageId: generateId(),
        speakerId: responder.agentId,
        content: dialogueResponse.content || 'I understand.',
        timestamp: generateTimestamp(),
        emotion: dialogueResponse.emotion || 'neutral',
        intent: dialogueResponse.intent || 'response'
      };
    } catch (error) {
      logger.warn('Failed to generate response with LLM, using fallback', { responderId: responder.agentId });
      
      return {
        messageId: generateId(),
        speakerId: responder.agentId,
        content: this.getFallbackResponse(responder, incomingMessage),
        timestamp: generateTimestamp(),
        emotion: 'neutral',
        intent: 'response'
      };
    }
  }

  private areAgentsInProximity(agent1: Agent, agent2: Agent): boolean {
    // Simple proximity check - agents must be in the same area
    return agent1.currentLocation.area === agent2.currentLocation.area;
  }

  private async storeDialogueEvent(dialogue: Dialogue, eventType: string, data?: any): Promise<void> {
    const event = {
      eventId: generateId(),
      worldId: dialogue.worldId,
      timestamp: generateTimestamp(),
      type: 'agent_action',
      description: `Dialogue ${eventType}: ${dialogue.participants.join(' and ')}`,
      data: {
        dialogueId: dialogue.dialogueId,
        participants: dialogue.participants,
        eventType,
        ...data
      },
      consequences: []
    };

    await db.putEvent(event);
  }

  private async storeDialogueMemories(dialogue: Dialogue, message: DialogueMessage): Promise<void> {
    // Store the dialogue message as a memory for all participants
    for (const participantId of dialogue.participants) {
      const memoryContent = participantId === message.speakerId 
        ? `I said: "${message.content}"`
        : `${message.speakerId} said: "${message.content}"`;

      // This would typically call the memory manager
      // For now, we'll create a simple memory entry
      const memory = {
        agentId: participantId,
        worldId: dialogue.worldId,
        type: 'observation' as const,
        content: memoryContent,
        importance: 4, // Conversations are moderately important
        tags: ['conversation', 'dialogue', message.emotion || 'neutral']
      };

      // In a full implementation, this would call memoryManager.addMemory()
      logger.debug('Would store dialogue memory', { participantId, content: memoryContent.substring(0, 50) });
    }
  }

  private async analyzeDialogue(dialogue: Dialogue): Promise<{ sentiment: string; topics: string[] }> {
    // Simple sentiment analysis based on emotion tags
    const emotions = dialogue.messages.map(m => m.emotion || 'neutral');
    const positiveEmotions = emotions.filter(e => ['happy', 'excited', 'pleased', 'friendly'].includes(e));
    const negativeEmotions = emotions.filter(e => ['angry', 'sad', 'frustrated', 'annoyed'].includes(e));

    let sentiment = 'neutral';
    if (positiveEmotions.length > negativeEmotions.length) {
      sentiment = 'positive';
    } else if (negativeEmotions.length > positiveEmotions.length) {
      sentiment = 'negative';
    }

    // Extract topics from message content (simplified)
    const allContent = dialogue.messages.map(m => m.content).join(' ');
    const topics = this.extractTopics(allContent);

    return { sentiment, topics };
  }

  private extractTopics(content: string): string[] {
    // Simple topic extraction - in a full implementation, this would use NLP
    const commonTopics = ['work', 'family', 'food', 'weather', 'plans', 'feelings', 'news', 'hobbies'];
    const contentLower = content.toLowerCase();
    
    return commonTopics.filter(topic => contentLower.includes(topic));
  }

  private async strengthenRelationship(agent1: Agent, agent2: Agent): Promise<void> {
    // Update relationship strength (simplified)
    const currentRelation = agent1.relationships[agent2.agentId] || 'acquaintance';
    // Logic to improve relationship would go here
    logger.debug('Strengthening relationship', { agent1: agent1.agentId, agent2: agent2.agentId, current: currentRelation });
  }

  private async weakenRelationship(agent1: Agent, agent2: Agent): Promise<void> {
    // Update relationship strength (simplified)
    const currentRelation = agent1.relationships[agent2.agentId] || 'acquaintance';
    // Logic to weaken relationship would go here
    logger.debug('Weakening relationship', { agent1: agent1.agentId, agent2: agent2.agentId, current: currentRelation });
  }

  private getFallbackMessage(speaker: Agent, listener: Agent, context: DialogueContext): string {
    const greetings = [
      `Hello ${listener.name}!`,
      `Hi there, ${listener.name}.`,
      `Good to see you, ${listener.name}.`,
      `Hey ${listener.name}, how are you?`
    ];

    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  private getFallbackResponse(responder: Agent, incomingMessage: DialogueMessage): string {
    const responses = [
      "That's interesting.",
      "I see what you mean.",
      "Thanks for sharing that.",
      "I understand.",
      "That makes sense."
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  async getDialogueStatistics(agentId: string): Promise<any> {
    try {
      const activeDialogues = await this.getActiveDialogues(agentId);
      const dialogueHistory = await this.getDialogueHistory(agentId, 50);

      const stats = {
        activeDialogues: activeDialogues.length,
        totalDialogues: dialogueHistory.length,
        averageMessagesPerDialogue: 0,
        mostFrequentPartner: null as string | null,
        commonTopics: [] as string[],
        sentimentDistribution: { positive: 0, neutral: 0, negative: 0 }
      };

      if (dialogueHistory.length > 0) {
        // Calculate average messages per dialogue
        const totalMessages = dialogueHistory.reduce((sum, d) => sum + d.messages.length, 0);
        stats.averageMessagesPerDialogue = totalMessages / dialogueHistory.length;

        // Find most frequent partner
        const partnerCounts: Record<string, number> = {};
        dialogueHistory.forEach(d => {
          const otherParticipant = d.participants.find(p => p !== agentId);
          if (otherParticipant) {
            partnerCounts[otherParticipant] = (partnerCounts[otherParticipant] || 0) + 1;
          }
        });

        const mostFrequent = Object.entries(partnerCounts).sort(([,a], [,b]) => b - a)[0];
        stats.mostFrequentPartner = mostFrequent ? mostFrequent[0] : null;

        // Analyze sentiment distribution
        dialogueHistory.forEach(d => {
          const analysis = this.analyzeDialogue(d);
          stats.sentimentDistribution[analysis.sentiment as keyof typeof stats.sentimentDistribution]++;
        });
      }

      return stats;
    } catch (error) {
      logger.error('Failed to get dialogue statistics', error as Error, { agentId });
      throw new GenerativeWorldError('Failed to get dialogue statistics', 'DIALOGUE_ERROR', { agentId });
    }
  }
}