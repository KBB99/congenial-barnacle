import { createLogger } from '../../../shared/utils';

const logger = createLogger('time-controller');

// Custom EventEmitter implementation for TypeScript compatibility
interface EventListener {
  event: string;
  callback: (...args: any[]) => void;
}

class TypedEventEmitter {
  private listeners: EventListener[] = [];

  protected emit(event: string, ...args: any[]): void {
    this.listeners
      .filter(listener => listener.event === event)
      .forEach(listener => listener.callback(...args));
  }

  on(event: string, callback: (...args: any[]) => void): void {
    this.listeners.push({ event, callback });
  }

  removeAllListeners(): void {
    this.listeners = [];
  }
}

export interface SimulationTime {
  realTime: Date;
  simulationTime: Date;
  timeMultiplier: number;
  isPaused: boolean;
  tickRate: number;
  tickDuration: number;
}

export interface TimeControllerConfig {
  tickRate?: number;        // Ticks per second (default: 10)
  tickDuration?: number;    // Simulation minutes per tick (default: 1)
  startTime?: Date;         // Initial simulation time
  timeMultiplier?: number;  // Initial speed multiplier (default: 1)
}

export class TimeController extends TypedEventEmitter {
  private realStartTime: number;
  private simulationStartTime: Date;
  private currentSimulationTime: Date;
  private timeMultiplier: number;
  private isPaused: boolean;
  private lastTickTime: number;
  private tickRate: number;
  private tickDuration: number;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private accumulatedTime: number = 0;

  constructor(config: TimeControllerConfig = {}) {
    super();
    
    this.tickRate = config.tickRate || 10;
    this.tickDuration = config.tickDuration || 1;
    this.timeMultiplier = config.timeMultiplier || 1;
    this.simulationStartTime = config.startTime || new Date();
    this.currentSimulationTime = new Date(this.simulationStartTime);
    this.realStartTime = Date.now();
    this.lastTickTime = this.realStartTime;
    this.isPaused = true;
  }

  /**
   * Start the simulation time
   */
  start(): void {
    if (!this.isPaused) {
      logger.warn('Time controller already running');
      return;
    }

    this.isPaused = false;
    this.lastTickTime = Date.now();
    
    // Start the tick interval
    const tickInterval = 1000 / this.tickRate;
    this.tickInterval = setInterval(() => this.tick(), tickInterval);
    
    logger.info('Time controller started', {
      simulationTime: this.currentSimulationTime,
      timeMultiplier: this.timeMultiplier,
      tickRate: this.tickRate
    });
    
    this.emit('started', this.getTimeState());
  }

  /**
   * Pause the simulation time
   */
  pause(): void {
    if (this.isPaused) {
      logger.warn('Time controller already paused');
      return;
    }

    this.isPaused = true;
    
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    
    logger.info('Time controller paused', {
      simulationTime: this.currentSimulationTime
    });
    
    this.emit('paused', this.getTimeState());
  }

  /**
   * Resume the simulation time
   */
  resume(): void {
    this.start();
    this.emit('resumed', this.getTimeState());
  }

  /**
   * Set the time multiplier (speed)
   */
  setSpeed(multiplier: number): void {
    if (multiplier <= 0) {
      throw new Error('Time multiplier must be positive');
    }

    const oldMultiplier = this.timeMultiplier;
    this.timeMultiplier = multiplier;
    
    logger.info('Time speed changed', {
      from: oldMultiplier,
      to: multiplier
    });
    
    this.emit('speedChanged', {
      oldSpeed: oldMultiplier,
      newSpeed: multiplier,
      timeState: this.getTimeState()
    });
  }

  /**
   * Skip time forward
   */
  skipTime(minutes: number): void {
    if (minutes <= 0) {
      throw new Error('Skip time must be positive');
    }

    const oldTime = new Date(this.currentSimulationTime);
    this.currentSimulationTime = new Date(
      this.currentSimulationTime.getTime() + minutes * 60 * 1000
    );
    
    logger.info('Time skipped', {
      from: oldTime,
      to: this.currentSimulationTime,
      skippedMinutes: minutes
    });
    
    this.emit('timeSkipped', {
      from: oldTime,
      to: this.currentSimulationTime,
      minutes
    });
  }

  /**
   * Process a single tick
   */
  private tick(): void {
    if (this.isPaused) return;

    const now = Date.now();
    const deltaTime = now - this.lastTickTime;
    this.lastTickTime = now;

    // Calculate simulation time progression
    const simulationDelta = deltaTime * this.timeMultiplier;
    this.accumulatedTime += simulationDelta;

    // Update simulation time based on tick duration
    const ticksToProcess = Math.floor(this.accumulatedTime / (this.tickDuration * 60 * 1000));
    if (ticksToProcess > 0) {
      const timeToAdd = ticksToProcess * this.tickDuration * 60 * 1000;
      this.currentSimulationTime = new Date(
        this.currentSimulationTime.getTime() + timeToAdd
      );
      this.accumulatedTime -= timeToAdd;

      // Emit tick event
      this.emit('tick', {
        simulationTime: this.currentSimulationTime,
        tickCount: ticksToProcess,
        deltaTime: timeToAdd
      });
    }
  }

  /**
   * Get the current time state
   */
  getTimeState(): SimulationTime {
    return {
      realTime: new Date(),
      simulationTime: new Date(this.currentSimulationTime),
      timeMultiplier: this.timeMultiplier,
      isPaused: this.isPaused,
      tickRate: this.tickRate,
      tickDuration: this.tickDuration
    };
  }

  /**
   * Get the current simulation time
   */
  getCurrentTime(): Date {
    return new Date(this.currentSimulationTime);
  }

  /**
   * Get time of day information
   */
  getTimeOfDay(): {
    hour: number;
    minute: number;
    phase: 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';
    isDaytime: boolean;
  } {
    const hour = this.currentSimulationTime.getHours();
    const minute = this.currentSimulationTime.getMinutes();
    
    let phase: 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 5 && hour < 7) phase = 'dawn';
    else if (hour >= 7 && hour < 12) phase = 'morning';
    else if (hour >= 12 && hour < 18) phase = 'afternoon';
    else if (hour >= 18 && hour < 21) phase = 'evening';
    else phase = 'night';
    
    const isDaytime = hour >= 6 && hour < 20;
    
    return { hour, minute, phase, isDaytime };
  }

  /**
   * Format simulation time for display
   */
  formatTime(): string {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return this.currentSimulationTime.toLocaleString('en-US', options);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.removeAllListeners();
  }
}