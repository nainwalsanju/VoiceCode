import { useEffect, useRef } from "react";
import { useTranscriptStore } from "../stores/transcriptStore";
import { useSessionStore } from "../stores/sessionStore";

export function ChatFeed() {
    const { messages } = useTranscriptStore();
    const { currentState } = useSessionStore();
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentState]);

    return (
        <div className="flex flex-col h-[600px] border border-border/50 bg-background/30 rounded-xl overflow-hidden shadow-2xl relative">
            <div className="bg-surface/90 border-b border-border/50 p-4 shrink-0 flex items-center justify-between">
                <h3 className="font-mono text-xs uppercase tracking-widest text-text-secondary">Neural_Comms_Link</h3>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-accent">Active_Session</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-blend-soft-light relative">
                {messages.length === 0 && currentState !== 'PROCESSING' && currentState !== 'LISTENING' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 select-none pointer-events-none text-center p-8">
                        <svg className="w-16 h-16 text-text-secondary mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <h4 className="font-mono text-sm uppercase tracking-widest font-bold text-text-primary drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">AWAITING_NEURAL_UPLINK</h4>
                        <p className="font-mono text-[10px] mt-2 text-text-secondary max-w-xs leading-relaxed uppercase tracking-wider">
                            Microphone is idle. Initiate voice capture to establish cross-talk protocols with active agents.
                        </p>
                    </div>
                )}

                {messages.map((msg, i) => {
                    const isUser = msg.role === 'user';
                    const isFirstOrSeparated = i === 0 || messages[i - 1].role !== msg.role || messages[i - 1].agent?.id !== msg.agent?.id;

                    return (
                        <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}>
                            {isFirstOrSeparated && (
                                <div className={`mb-2 font-mono text-[10px] uppercase tracking-widest opacity-60 flex items-center gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                                    {!isUser && msg.agent && (
                                        <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: msg.agent.color, color: msg.agent.color }} />
                                    )}
                                    {isUser ? 'User_Uplink' : msg.agent ? msg.agent.name : 'System_Voice'}
                                </div>
                            )}
                            <div className={`
                 px-5 py-3 rounded-2xl max-w-[80%] break-words
                 ${isUser ? 'bg-primary/20 border border-primary/30 text-text-primary rounded-tr-sm' : 'bg-surface border border-border/50 text-text-secondary rounded-tl-sm'}
                 ${!isUser && msg.agent ? 'shadow-[0_0_15px_rgba(currentColor,0.1)]' : ''}
               `} style={!isUser && msg.agent ? { color: msg.agent.color } : {}}>
                                <p className={`text-sm ${!isUser && msg.agent ? 'text-text-primary' : ''}`}>{msg.content}</p>
                            </div>
                        </div>
                    );
                })}

                {currentState === 'PROCESSING' && (
                    <div className="flex flex-col items-start max-w-full">
                        <div className="mb-2 font-mono text-[10px] uppercase tracking-widest opacity-60">System_Processing</div>
                        <div className="px-5 py-3 rounded-2xl bg-surface border border-border/50 rounded-tl-sm w-16">
                            <div className="flex justify-center gap-1 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                {currentState === 'LISTENING' && (
                    <div className="flex flex-col items-end max-w-full">
                        <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-secondary opacity-60">User_Capturing</div>
                    </div>
                )}
                <div ref={bottomRef} className="h-10 shrink-0" />
            </div>

        </div>
    )
}
