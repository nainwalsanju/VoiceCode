import { useState, useEffect, useRef } from 'react';
import './DictationDisplay.css';

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
    <div className="dictation-display">
      <div className="dictation-header">
        <h3>Dictation</h3>
        <div className="dictation-actions">
          {!isEditing && text && (
            <>
              <button onClick={handleCopy} className="action-btn" title="Copy">
                Copy
              </button>
              <button onClick={() => setIsEditing(true)} className="action-btn" title="Edit">
                Edit
              </button>
              <button onClick={handleClear} className="action-btn clear-btn" title="Clear">
                Clear
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className={`dictation-content ${isRecording ? 'recording' : ''}`}>
        {isEditing ? (
          <div className="edit-mode">
            <textarea
              ref={textareaRef}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              placeholder="Edit your dictation..."
              rows={6}
            />
            <div className="edit-actions">
              <button onClick={handleSave} className="save-btn">Save</button>
              <button onClick={handleCancel} className="cancel-btn">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="display-mode">
            {text ? (
              <p>{text}</p>
            ) : (
              <p className="placeholder">Click the microphone and start speaking...</p>
            )}
            {isRecording && (
              <div className="recording-indicator">
                <span className="recording-dot"></span>
                Recording...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
