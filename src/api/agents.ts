export interface AgentProfile {
    id: string;
    name: string;
    description?: string;
    system_prompt: string;
    voice_profile_id?: string;
    color: string;
    created_at: string;
    updated_at: string;
}

export interface ChatMessage {
    id: string;
    role: string;
    content: string;
    agent_id?: string;
    timestamp: string;
}

export interface ChatSession {
    id: string;
    title: string;
    messages: ChatMessage[];
    active_agent_ids: string[];
    created_at: string;
    updated_at: string;
}

const API_BASE = 'http://localhost:8000/agents';

export async function fetchAgents(): Promise<AgentProfile[]> {
    try {
        const response = await fetch(`${API_BASE}/`);
        if (!response.ok) throw new Error('Failed to fetch agents');
        return await response.json();
    } catch (error) {
        console.error("fetchAgents error", error);
        return [];
    }
}

export async function createAgent(data: Partial<AgentProfile>): Promise<AgentProfile> {
    const response = await fetch(`${API_BASE}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create agent');
    return await response.json();
}

export async function updateAgent(id: string, data: Partial<AgentProfile>): Promise<AgentProfile> {
    const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update agent');
    return await response.json();
}

export async function deleteAgent(id: string): Promise<boolean> {
    const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE'
    });
    return response.ok;
}

export async function fetchSessions(): Promise<ChatSession[]> {
    try {
        const response = await fetch(`${API_BASE}/sessions/`);
        if (!response.ok) throw new Error('Failed to fetch sessions');
        return await response.json();
    } catch (error) {
        console.error("fetchSessions error", error);
        return [];
    }
}
