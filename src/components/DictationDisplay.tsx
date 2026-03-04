import { useState, useEffect, useRef } from 'react';

interface DictationDisplayProps {
  text: string;
  onTextChange?: (text: string) => void;
  isRecording?: boolean;
}

export function DictationDisplay({ text, onTextChange, isRecording = false }: DictationDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditedText(text);
  }, [text]);

  useEffect(() => {
    if (isRecording && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [text, isRecording]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
  };

  const handleClear = () => {
    if (onTextChange) {
      onTextChange('');
    }
  };

  const handleSave = () => {
    if (onTextChange) {
      onTextChange(editedText);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedText(text);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-border/30 pb-4 mb-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 px-2">
              <div className="w-2.5 h-2.5 rounded-full bg-error/40 shadow-[0_0_8px_rgba(239,68,68,0.3)]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-warning/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-success/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
            </div>
            <h3 className="text-[10px] font-mono font-bold tracking-[0.2em] text-text-primary uppercase opacity-80">Neural_Output_Buffer</h3>
          </div>

          <div className="hidden lg:flex items-center gap-4 border-l border-border/30 pl-6">
            <div className="flex flex-col gap-0.5">
              <span className="text-[7px] font-mono text-text-secondary uppercase opacity-40">Bitstream_Status</span>
              <span className="text-[9px] font-mono text-accent font-bold uppercase tracking-tighter">Verified // 1024kbps</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[7px] font-mono text-text-secondary uppercase opacity-40">Data_Integrity</span>
              <span className="text-[9px] font-mono text-primary font-bold uppercase tracking-tighter">99.98% Crypt_Check</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && text && (
            <>
              <button onClick={handleCopy} className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-text-secondary hover:text-primary transition-colors cursor-pointer border border-transparent hover:border-primary/20 rounded-md bg-surface/30">
                Copy
              </button>
              <button onClick={() => setIsEditing(true)} className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-text-secondary hover:text-secondary transition-colors cursor-pointer border border-transparent hover:border-secondary/20 rounded-md bg-surface/30">
                Edit
              </button>
              <button onClick={handleClear} className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-error/60 hover:text-error transition-colors cursor-pointer border border-transparent hover:border-error/20 rounded-md bg-surface/30">
                Purge
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`relative min-h-[300px] font-mono text-sm leading-relaxed p-8 rounded-xl transition-all duration-500 overflow-hidden group
        ${isRecording ? 'bg-secondary/10 ring-2 ring-secondary/50 shadow-neon' : 'bg-surface/60 border border-border/80 shadow-sm'}`}>

        {/* Glowing Edge */}
        <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-1000 ${isRecording ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-secondary/50 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-secondary/50 to-transparent"></div>
        </div>
        {isEditing ? (
          <div className="flex flex-col gap-4 h-full">
            <textarea
              ref={textareaRef}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none resize-none text-text-primary placeholder:text-text-secondary/30 min-h-[150px]"
              placeholder="Inject manual string data..."
              rows={6}
            />
            <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
              <button onClick={handleCancel} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors cursor-pointer">Abort</button>
              <button onClick={handleSave} className="px-6 py-2 text-[10px] font-bold uppercase tracking-widest bg-primary text-white rounded-lg shadow-neon hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all cursor-pointer">Commit</button>
            </div>
          </div>
        ) : (
          <div className="relative group min-h-[150px]">
            {text ? (
              <p className="whitespace-pre-wrap text-text-primary/90">
                <span className="text-accent mr-2 font-bold opacity-50">&gt;_</span>
                {text}
                {isRecording && <span className="inline-block w-2.5 h-5 bg-secondary animate-pulse ml-1 align-middle"></span>}
              </p>
            ) : (
              <p className="text-text-secondary/40 italic flex flex-col items-center justify-center min-h-[150px] gap-2">
                <svg className="w-8 h-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Waiting for neural stream input...
              </p>
            )}
            {isRecording && (
              <div className="absolute bottom-[-10px] right-2 flex items-center gap-2 px-3 py-1 bg-secondary text-white text-[9px] font-bold uppercase tracking-widest rounded-full shadow-lg shadow-secondary/30 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                Uplink Active
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
