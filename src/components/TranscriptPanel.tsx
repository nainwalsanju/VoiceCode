import { useEffect, useRef } from 'react';
import { useTranscriptStore, Message } from '../stores/transcriptStore';

// Format timestamp to HH:MM
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// Message bubble component
const MessageBubble = ({ message }: { message: Message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
        {/* Role icon */}
        <div className={`
          flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
          ${isUser
            ? 'bg-secondary/20 border border-secondary/30'
            : 'bg-primary/20 border border-primary/30'
          }
        `}>
          {isUser ? (
            <svg className="w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        {/* Message content */}
        <div className={`
          flex flex-col gap-1 p-3 rounded-xl
          ${isUser
            ? 'bg-secondary/10 border border-secondary/20'
            : 'bg-primary/10 border border-primary/20'
          }
        `}>
          <p className={`text-xs font-mono leading-relaxed break-words ${isUser ? 'text-text-primary' : 'text-text-primary'
            }`}>
            {message.content}
          </p>
          <span className={`
            text-[10px] font-mono uppercase tracking-wide opacity-70 self-end
            ${isUser ? 'text-secondary' : 'text-primary'}
          `}>
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
};

interface TranscriptPanelProps {
  className?: string;
}

export function TranscriptPanel({ className = '' }: TranscriptPanelProps) {
  const { messages, clearTranscript } = useTranscriptStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 px-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary/40 shadow-[0_0_8px_rgba(99,102,241,0.3)]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-accent/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-secondary/40 shadow-[0_0_8px_rgba(168,85,247,0.3)]"></div>
          </div>
          <h3 className="text-xs font-mono font-bold tracking-widest text-text-primary uppercase opacity-80">
            Conversation_Log
          </h3>
          {messages.length > 0 && (
            <span className="text-xs font-mono text-text-secondary opacity-80 ml-2">
              ({messages.length} messages)
            </span>
          )}
        </div>

        {messages.length > 0 && (
          <button
            onClick={clearTranscript}
            className="px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wide text-text-secondary hover:text-error transition-colors cursor-pointer border border-transparent hover:border-error/20 rounded-md bg-surface/30"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px] px-2"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <svg className="w-12 h-12 text-text-secondary/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-xs font-mono text-text-secondary italic opacity-70">
              Conversation will appear here
            </p>
            <p className="text-xs font-mono text-text-secondary opacity-70 mt-2">
              Start speaking to begin
            </p>
          </div>
        ) : (
          <div className="py-2">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        )}
      </div>

      {/* Status bar */}
      {messages.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-text-secondary uppercase opacity-70 tracking-wide">Session_Status</span>
              <span className="text-[10px] font-mono text-accent font-bold uppercase tracking-tight">
                Active // {messages.length} exchanges
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
            <span className="text-[10px] font-mono text-text-secondary uppercase opacity-80">
              Live
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
