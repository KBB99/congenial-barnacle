import { createLogger, generateId } from '../../../shared/utils';

const logger = createLogger('event-scheduler');

export enum EventType {
  AGENT_ACTION = 'agent_action',
  WORLD_EVENT = 'world_event',
  SCHEDULED_EVENT = 'scheduled_event',
  USER_INTERVENTION = 'user_intervention',
  SYSTEM_EVENT = 'system_event'
}

export enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

export interface SimulationEvent {
  id: string;
  type: EventType;
  scheduledTime: Date;
  priority: EventPriority;
  payload: any;
  recurring?: {
    interval: number; // milliseconds
    endTime?: Date;
    count?: number;   // max occurrences
  };
  metadata?: {
    source?: string;
    tags?: string[];
    description?: string;
  };
}

export interface RecurringEventConfig {
  type: EventType;
  payload: any;
  time: string;      // "HH:MM" or ISO date string
  interval: string;  // "1h", "30m", "1d", etc.
  priority?: EventPriority;
  endTime?: Date;
  count?: number;
}

interface QueuedEvent {
  event: SimulationEvent;
  nextOccurrence: Date;
  occurrenceCount: number;
}

export class EventScheduler {
  private eventQueue: QueuedEvent[] = [];
  private recurringEvents: Map<string, SimulationEvent> = new Map();
  private processedEvents: Set<string> = new Set();

  constructor() {
    logger.info('Event scheduler initialized');
  }

  /**
   * Schedule a one-time event
   */
  schedule(event: Partial<SimulationEvent>): string {
    const fullEvent: SimulationEvent = {
      id: event.id || generateId(),
      type: event.type || EventType.SCHEDULED_EVENT,
      scheduledTime: event.scheduledTime || new Date(),
      priority: event.priority || EventPriority.NORMAL,
      payload: event.payload || {},
      metadata: event.metadata
    };

    this.insertEvent({
      event: fullEvent,
      nextOccurrence: fullEvent.scheduledTime,
      occurrenceCount: 0
    });

    logger.debug('Event scheduled', {
      id: fullEvent.id,
      type: fullEvent.type,
      scheduledTime: fullEvent.scheduledTime
    });

    return fullEvent.id;
  }

  /**
   * Schedule a recurring event
   */
  scheduleRecurring(config: RecurringEventConfig): string {
    const interval = this.parseInterval(config.interval);
    const firstOccurrence = this.parseTime(config.time);
    
    const event: SimulationEvent = {
      id: generateId(),
      type: config.type,
      scheduledTime: firstOccurrence,
      priority: config.priority || EventPriority.NORMAL,
      payload: config.payload,
      recurring: {
        interval,
        endTime: config.endTime,
        count: config.count
      },
      metadata: {
        description: `Recurring ${config.type} every ${config.interval}`
      }
    };

    this.recurringEvents.set(event.id, event);
    this.scheduleNextOccurrence(event);

    logger.info('Recurring event scheduled', {
      id: event.id,
      type: event.type,
      interval: config.interval,
      firstOccurrence
    });

    return event.id;
  }

  /**
   * Cancel an event
   */
  cancel(eventId: string): boolean {
    // Remove from queue
    const queueIndex = this.eventQueue.findIndex(q => q.event.id === eventId);
    if (queueIndex !== -1) {
      this.eventQueue.splice(queueIndex, 1);
    }

    // Remove from recurring events
    const wasRecurring = this.recurringEvents.delete(eventId);

    const cancelled = queueIndex !== -1 || wasRecurring;
    if (cancelled) {
      logger.debug('Event cancelled', { eventId });
    }

    return cancelled;
  }

  /**
   * Process events up to the current time
   */
  processEvents(currentTime: Date): SimulationEvent[] {
    const readyEvents: SimulationEvent[] = [];

    // Process all events that should have occurred by now
    while (this.eventQueue.length > 0) {
      const next = this.eventQueue[0];
      
      if (next.nextOccurrence <= currentTime) {
        // Remove from queue
        this.eventQueue.shift();
        
        // Add to ready events
        readyEvents.push(next.event);
        this.processedEvents.add(next.event.id);

        // Handle recurring events
        if (next.event.recurring) {
          this.handleRecurringEvent(next);
        }
      } else {
        // Queue is sorted, so we can stop here
        break;
      }
    }

    if (readyEvents.length > 0) {
      logger.debug('Events ready for processing', {
        count: readyEvents.length,
        currentTime
      });
    }

    return readyEvents;
  }

  /**
   * Get upcoming events
   */
  getUpcomingEvents(limit: number = 10): SimulationEvent[] {
    return this.eventQueue
      .slice(0, limit)
      .map(q => q.event);
  }

  /**
   * Get event statistics
   */
  getStats(): {
    queuedEvents: number;
    recurringEvents: number;
    processedEvents: number;
    nextEvent?: Date;
  } {
    return {
      queuedEvents: this.eventQueue.length,
      recurringEvents: this.recurringEvents.size,
      processedEvents: this.processedEvents.size,
      nextEvent: this.eventQueue[0]?.nextOccurrence
    };
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.eventQueue = [];
    this.recurringEvents.clear();
    this.processedEvents.clear();
    logger.info('Event scheduler cleared');
  }

  /**
   * Insert event into queue maintaining sort order
   */
  private insertEvent(queuedEvent: QueuedEvent): void {
    // Binary search for insertion point
    let left = 0;
    let right = this.eventQueue.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const comparison = this.compareEvents(queuedEvent, this.eventQueue[mid]);
      
      if (comparison < 0) {
        right = mid;
      } else {
        left = mid + 1;
      }
    }

    this.eventQueue.splice(left, 0, queuedEvent);
  }

  /**
   * Compare events for sorting
   */
  private compareEvents(a: QueuedEvent, b: QueuedEvent): number {
    // First compare by time
    const timeDiff = a.nextOccurrence.getTime() - b.nextOccurrence.getTime();
    if (timeDiff !== 0) return timeDiff;

    // Then by priority (higher priority first)
    return b.event.priority - a.event.priority;
  }

  /**
   * Handle recurring event scheduling
   */
  private handleRecurringEvent(processed: QueuedEvent): void {
    const event = processed.event;
    if (!event.recurring) return;

    const newCount = processed.occurrenceCount + 1;

    // Check if we should continue recurring
    if (event.recurring.count && newCount >= event.recurring.count) {
      this.recurringEvents.delete(event.id);
      logger.debug('Recurring event completed', {
        id: event.id,
        occurrences: newCount
      });
      return;
    }

    if (event.recurring.endTime && new Date() >= event.recurring.endTime) {
      this.recurringEvents.delete(event.id);
      logger.debug('Recurring event expired', {
        id: event.id,
        endTime: event.recurring.endTime
      });
      return;
    }

    // Schedule next occurrence
    this.scheduleNextOccurrence(event, newCount);
  }

  /**
   * Schedule the next occurrence of a recurring event
   */
  private scheduleNextOccurrence(event: SimulationEvent, count: number = 0): void {
    if (!event.recurring) return;

    const nextTime = new Date(
      event.scheduledTime.getTime() + 
      (event.recurring.interval * (count + 1))
    );

    this.insertEvent({
      event,
      nextOccurrence: nextTime,
      occurrenceCount: count
    });
  }

  /**
   * Parse interval string to milliseconds
   */
  private parseInterval(interval: string): number {
    const match = interval.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid interval format: ${interval}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: throw new Error(`Unknown interval unit: ${unit}`);
    }
  }

  /**
   * Parse time string to Date
   */
  private parseTime(time: string): Date {
    // If it's already a valid date string
    const date = new Date(time);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Parse HH:MM format
    const match = time.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const now = new Date();
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      
      const result = new Date(now);
      result.setHours(hours, minutes, 0, 0);
      
      // If the time has already passed today, schedule for tomorrow
      if (result <= now) {
        result.setDate(result.getDate() + 1);
      }
      
      return result;
    }

    throw new Error(`Invalid time format: ${time}`);
  }
}