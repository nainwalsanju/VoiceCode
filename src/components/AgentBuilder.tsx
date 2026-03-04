import { useState, useEffect } from 'react';
import { AgentProfile, fetchAgents, createAgent, updateAgent, deleteAgent } from '../api/agents';
import { voiceProfilesApi } from '../api/voiceProfiles';
import type { VoiceProfile } from '../types/voiceProfile';

export function AgentBuilder() {
    const [agents, setAgents] = useState<AgentProfile[]>([]);
    const [voices, setVoices] = useState<VoiceProfile[]>([]);
    const [form, setForm] = useState<Partial<AgentProfile>>({ name: '', description: '', system_prompt: '', color: '#3B82F6' });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [a, v] = await Promise.all([fetchAgents(), voiceProfilesApi.list()]);
        setAgents(a);
        setVoices(v);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingId) {
                await updateAgent(editingId, form);
            } else {
                await createAgent(form);
            }
            setForm({ name: '', description: '', system_prompt: '', color: '#3B82F6' });
            setEditingId(null);
            await loadData();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = (agent: AgentProfile) => {
        setEditingId(agent.id);
        setForm(agent);
    };

    const handleDelete = async (id: string) => {
        await deleteAgent(id);
        await loadData();
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-mono font-bold uppercase tracking-widest text-text-secondary opacity-70">Agent Name</label>
                        <input
                            type="text"
                            value={form.name || ''}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full bg-background/50 border border-border/50 rounded-lg px-4 py-3 font-mono text-sm focus:outline-none focus:border-primary/50 text-text-primary transition-colors hover:border-border/80"
                            placeholder="e.g. Jarvis"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-mono font-bold uppercase tracking-widest text-text-secondary opacity-70">Linked Voice</label>
                        <select
                            value={form.voice_profile_id || ''}
                            onChange={(e) => setForm({ ...form, voice_profile_id: e.target.value })}
                            className="w-full bg-background/50 border border-border/50 rounded-lg px-4 py-3 font-mono text-sm focus:outline-none focus:border-primary/50 text-text-primary appearance-none transition-colors hover:border-border/80"
                        >
                            <option value="">Default System Voice</option>
                            {voices.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-mono font-bold uppercase tracking-widest text-text-secondary opacity-70">System Prompt / Persona</label>
                    <textarea
                        value={form.system_prompt || ''}
                        onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                        className="w-full bg-background/50 border border-border/50 rounded-lg px-4 py-3 font-mono text-sm focus:outline-none focus:border-primary/50 text-text-primary h-24 resize-none transition-colors hover:border-border/80"
                        placeholder="Define the agent's behavior..."
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-mono font-bold uppercase tracking-widest text-text-secondary opacity-70">Aura Color</label>
                    <div className="relative border border-border/50 rounded-lg overflow-hidden h-12 flex items-center bg-background/50 hover:border-border/80 transition-colors">
                        <input
                            type="color"
                            value={form.color || '#3B82F6'}
                            onChange={(e) => setForm({ ...form, color: e.target.value })}
                            className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] cursor-pointer opacity-0 z-10"
                        />
                        <div className="w-6 h-6 rounded-full ml-4 shadow-md" style={{ backgroundColor: form.color || '#3B82F6' }}></div>
                        <span className="font-mono text-sm text-text-primary ml-3 bg-transparent font-bold">
                            {form.color || '#3B82F6'}
                        </span>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-4 rounded-lg font-mono text-xs uppercase tracking-widest font-bold transition-all duration-300 border bg-surface/50 border-border hover:border-primary/50 hover:bg-primary/10 text-white disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                        {isSaving ? (
                            <>
                                <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                COMMITTING...
                            </>
                        ) : editingId ? (
                            "UPDATE_AGENT_LINK"
                        ) : (
                            "FORGE_NEW_AGENT"
                        )}
                    </span>
                    {!isSaving && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>}
                </button>
            </form>

            <div className="space-y-3 mt-8">
                {agents.map(agent => {
                    const linkedVoice = voices.find(v => v.id === agent.voice_profile_id);
                    return (
                        <div key={agent.id} className="flex flex-col gap-2 p-4 rounded-xl border border-border/40 bg-background/30 group hover:border-border/80 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: agent.color, boxShadow: `0 0 10px ${agent.color}` }}></div>
                                    <h4 className="font-mono text-sm uppercase tracking-wider font-bold text-text-primary">{agent.name}</h4>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(agent)} className="text-xs uppercase font-mono tracking-wider text-accent hover:text-white">Edit</button>
                                    <button onClick={() => handleDelete(agent.id)} className="text-xs uppercase font-mono tracking-wider text-error hover:text-white">Delete</button>
                                </div>
                            </div>
                            <div className="text-xs font-mono text-text-secondary opacity-60 ml-6">
                                Voice: {linkedVoice ? linkedVoice.name : 'Default System Voice'}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}
