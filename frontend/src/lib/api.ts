import { 
  World, 
  Agent, 
  MemoryStream, 
  WorldObject, 
  WorldEvent, 
  Snapshot,
  CreateWorldForm,
  CreateAgentForm,
  ApiResponse,
  PaginatedResponse 
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  constructor() {
    // Bind all methods to ensure 'this' context is preserved
    this.getWorlds = this.getWorlds.bind(this);
    this.getWorld = this.getWorld.bind(this);
    this.createWorld = this.createWorld.bind(this);
    this.updateWorld = this.updateWorld.bind(this);
    this.deleteWorld = this.deleteWorld.bind(this);
    this.pauseWorld = this.pauseWorld.bind(this);
    this.resumeWorld = this.resumeWorld.bind(this);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  private get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  private post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  private put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  private delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // World API methods
  async getWorlds(): Promise<World[]> {
    const response = await this.get<ApiResponse<World[]>>('/api/worlds');
    return response.data || [];
  }

  async getWorld(worldId: string): Promise<World> {
    const response = await this.get<ApiResponse<World>>(`/api/worlds/${worldId}`);
    if (!response.data) {
      throw new Error('World not found');
    }
    return response.data;
  }

  async createWorld(worldData: CreateWorldForm): Promise<World> {
    const response = await this.post<ApiResponse<World>>('/api/worlds', worldData);
    if (!response.data) {
      throw new Error('Failed to create world');
    }
    return response.data;
  }

  async updateWorld(worldId: string, updates: Partial<World>): Promise<World> {
    const response = await this.put<ApiResponse<World>>(`/api/worlds/${worldId}`, updates);
    if (!response.data) {
      throw new Error('Failed to update world');
    }
    return response.data;
  }

  async deleteWorld(worldId: string): Promise<void> {
    await this.delete<ApiResponse<void>>(`/api/worlds/${worldId}`);
  }

  async pauseWorld(worldId: string): Promise<World> {
    const response = await this.post<ApiResponse<World>>(`/api/worlds/${worldId}/pause`);
    if (!response.data) {
      throw new Error('Failed to pause world');
    }
    return response.data;
  }

  async resumeWorld(worldId: string): Promise<World> {
    const response = await this.post<ApiResponse<World>>(`/api/worlds/${worldId}/resume`);
    if (!response.data) {
      throw new Error('Failed to resume world');
    }
    return response.data;
  }

  // Agent API methods
  async getAgents(worldId: string): Promise<Agent[]> {
    const response = await this.get<ApiResponse<Agent[]>>(`/api/worlds/${worldId}/agents`);
    return response.data || [];
  }

  async getAgent(worldId: string, agentId: string): Promise<Agent> {
    const response = await this.get<ApiResponse<Agent>>(`/api/worlds/${worldId}/agents/${agentId}`);
    if (!response.data) {
      throw new Error('Agent not found');
    }
    return response.data;
  }

  async createAgent(worldId: string, agentData: CreateAgentForm): Promise<Agent> {
    const response = await this.post<ApiResponse<Agent>>(`/api/worlds/${worldId}/agents`, agentData);
    if (!response.data) {
      throw new Error('Failed to create agent');
    }
    return response.data;
  }

  async updateAgent(worldId: string, agentId: string, updates: Partial<Agent>): Promise<Agent> {
    const response = await this.put<ApiResponse<Agent>>(`/api/worlds/${worldId}/agents/${agentId}`, updates);
    if (!response.data) {
      throw new Error('Failed to update agent');
    }
    return response.data;
  }

  async deleteAgent(worldId: string, agentId: string): Promise<void> {
    await this.delete<ApiResponse<void>>(`/api/worlds/${worldId}/agents/${agentId}`);
  }

  // Memory API methods
  async getMemories(
    worldId: string, 
    agentId: string, 
    page = 1, 
    pageSize = 50
  ): Promise<PaginatedResponse<MemoryStream>> {
    const response = await this.get<ApiResponse<PaginatedResponse<MemoryStream>>>(
      `/api/worlds/${worldId}/agents/${agentId}/memories?page=${page}&pageSize=${pageSize}`
    );
    if (!response.data) {
      throw new Error('Failed to fetch memories');
    }
    return response.data;
  }

  async createMemory(worldId: string, agentId: string, memory: Partial<MemoryStream>): Promise<MemoryStream> {
    const response = await this.post<ApiResponse<MemoryStream>>(
      `/api/worlds/${worldId}/agents/${agentId}/memories`, 
      memory
    );
    if (!response.data) {
      throw new Error('Failed to create memory');
    }
    return response.data;
  }

  async updateMemory(
    worldId: string, 
    agentId: string, 
    memoryId: string, 
    updates: Partial<MemoryStream>
  ): Promise<MemoryStream> {
    const response = await this.put<ApiResponse<MemoryStream>>(
      `/api/worlds/${worldId}/agents/${agentId}/memories/${memoryId}`, 
      updates
    );
    if (!response.data) {
      throw new Error('Failed to update memory');
    }
    return response.data;
  }

  async deleteMemory(worldId: string, agentId: string, memoryId: string): Promise<void> {
    await this.delete<ApiResponse<void>>(`/api/worlds/${worldId}/agents/${agentId}/memories/${memoryId}`);
  }

  // World Objects API methods
  async getWorldObjects(worldId: string): Promise<WorldObject[]> {
    const response = await this.get<ApiResponse<WorldObject[]>>(`/api/worlds/${worldId}/objects`);
    return response.data || [];
  }

  async createWorldObject(worldId: string, object: Partial<WorldObject>): Promise<WorldObject> {
    const response = await this.post<ApiResponse<WorldObject>>(`/api/worlds/${worldId}/objects`, object);
    if (!response.data) {
      throw new Error('Failed to create world object');
    }
    return response.data;
  }

  async updateWorldObject(worldId: string, objectId: string, updates: Partial<WorldObject>): Promise<WorldObject> {
    const response = await this.put<ApiResponse<WorldObject>>(`/api/worlds/${worldId}/objects/${objectId}`, updates);
    if (!response.data) {
      throw new Error('Failed to update world object');
    }
    return response.data;
  }

  async deleteWorldObject(worldId: string, objectId: string): Promise<void> {
    await this.delete<ApiResponse<void>>(`/api/worlds/${worldId}/objects/${objectId}`);
  }

  // Events API methods
  async getEvents(
    worldId: string, 
    page = 1, 
    pageSize = 50
  ): Promise<PaginatedResponse<WorldEvent>> {
    const response = await this.get<ApiResponse<PaginatedResponse<WorldEvent>>>(
      `/api/worlds/${worldId}/events?page=${page}&pageSize=${pageSize}`
    );
    if (!response.data) {
      throw new Error('Failed to fetch events');
    }
    return response.data;
  }

  // Snapshots API methods
  async getSnapshots(worldId: string): Promise<Snapshot[]> {
    const response = await this.get<ApiResponse<Snapshot[]>>(`/api/worlds/${worldId}/snapshots`);
    return response.data || [];
  }

  async createSnapshot(worldId: string, name: string, description?: string): Promise<Snapshot> {
    const response = await this.post<ApiResponse<Snapshot>>(`/api/worlds/${worldId}/snapshots`, {
      name,
      description,
    });
    if (!response.data) {
      throw new Error('Failed to create snapshot');
    }
    return response.data;
  }

  async restoreSnapshot(worldId: string, snapshotId: string): Promise<World> {
    const response = await this.post<ApiResponse<World>>(`/api/worlds/${worldId}/snapshots/${snapshotId}/restore`);
    if (!response.data) {
      throw new Error('Failed to restore snapshot');
    }
    return response.data;
  }

  async deleteSnapshot(worldId: string, snapshotId: string): Promise<void> {
    await this.delete<ApiResponse<void>>(`/api/worlds/${worldId}/snapshots/${snapshotId}`);
  }

  // Chat API methods
  async sendMessage(worldId: string, message: string, agentId?: string): Promise<any> {
    const response = await this.post<ApiResponse<any>>(`/api/worlds/${worldId}/chat`, {
      message,
      agentId,
    });
    return response.data;
  }
}

// Export singleton instance
export const worldApi = new ApiClient();

// Export individual API modules for better organization
export const agentApi = {
  getAgents: (worldId: string) => worldApi.getAgents(worldId),
  getAgent: (worldId: string, agentId: string) => worldApi.getAgent(worldId, agentId),
  createAgent: (worldId: string, agentData: CreateAgentForm) => worldApi.createAgent(worldId, agentData),
  updateAgent: (worldId: string, agentId: string, updates: Partial<Agent>) => worldApi.updateAgent(worldId, agentId, updates),
  deleteAgent: (worldId: string, agentId: string) => worldApi.deleteAgent(worldId, agentId),
};

export const memoryApi = {
  getMemories: (worldId: string, agentId: string, page?: number, pageSize?: number) => 
    worldApi.getMemories(worldId, agentId, page, pageSize),
  createMemory: (worldId: string, agentId: string, memory: Partial<MemoryStream>) => 
    worldApi.createMemory(worldId, agentId, memory),
  updateMemory: (worldId: string, agentId: string, memoryId: string, updates: Partial<MemoryStream>) => 
    worldApi.updateMemory(worldId, agentId, memoryId, updates),
  deleteMemory: (worldId: string, agentId: string, memoryId: string) => 
    worldApi.deleteMemory(worldId, agentId, memoryId),
};

export const objectApi = {
  getWorldObjects: (worldId: string) => worldApi.getWorldObjects(worldId),
  createWorldObject: (worldId: string, object: Partial<WorldObject>) => worldApi.createWorldObject(worldId, object),
  updateWorldObject: (worldId: string, objectId: string, updates: Partial<WorldObject>) => 
    worldApi.updateWorldObject(worldId, objectId, updates),
  deleteWorldObject: (worldId: string, objectId: string) => worldApi.deleteWorldObject(worldId, objectId),
};

export const eventApi = {
  getEvents: (worldId: string, page?: number, pageSize?: number) => worldApi.getEvents(worldId, page, pageSize),
};

export const snapshotApi = {
  getSnapshots: (worldId: string) => worldApi.getSnapshots(worldId),
  createSnapshot: (worldId: string, name: string, description?: string) => 
    worldApi.createSnapshot(worldId, name, description),
  restoreSnapshot: (worldId: string, snapshotId: string) => worldApi.restoreSnapshot(worldId, snapshotId),
  deleteSnapshot: (worldId: string, snapshotId: string) => worldApi.deleteSnapshot(worldId, snapshotId),
};

export const chatApi = {
  sendMessage: (worldId: string, message: string, agentId?: string) => worldApi.sendMessage(worldId, message, agentId),
};