import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Trash2, Download } from 'lucide-react';

export default function InputArea({ onSendMessage, isStreaming, onClearChat, onExportChat }) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);

  // Initialize Speech-to-Text Recognition if supported
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    }
  }, []);

  // FIX #13: Auto-resize textarea height as user types
  const handleChange = (e) => {
    setText(e.target.value);
    // Reset height to auto so shrinking works correctly
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  // Reset textarea height when message is sent
  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleToggleVoice = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!text.trim() || isStreaming) return;
    onSendMessage(text.trim());
    setText('');
    resetTextareaHeight(); // FIX #13: Reset height after send
  };

  return (
    <div style={{ position: 'relative' }}>
      <div className="glass-panel" style={{ padding: '12px 16px' }}>

        {/* Input Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

          {/* FIX #13: onChange uses handleChange for auto-resize */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about candidate experience, skills, projects, or culture..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              fontSize: '0.95rem',
              resize: 'none',
              maxHeight: '120px',
              overflowY: 'auto',
              lineHeight: '1.5',
              transition: 'height 0.1s ease'
            }}
          />

          {/* Voice Input Button */}
          <button
            onClick={handleToggleVoice}
            className={`btn btn-icon ${isListening ? 'btn-primary' : ''}`}
            title={isListening ? 'Stop Listening' : 'Speak Message (Voice Input)'}
            style={{ color: isListening ? '#fff' : 'var(--text-secondary)', flexShrink: 0 }}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          {/* Send Button */}
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isStreaming}
            className="btn btn-primary"
            style={{ opacity: !text.trim() || isStreaming ? 0.5 : 1, flexShrink: 0 }}
          >
            <Send size={18} />
          </button>
        </div>

        {/* Footer Toolbar (Clear & Export) */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '10px',
          paddingTop: '8px',
          borderTop: '1px solid var(--border-color)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}>
          <span>Press <strong>Enter</strong> to send • <strong>Shift + Enter</strong> for line break</span>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onExportChat}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Export conversation history"
            >
              <Download size={13} /> Export Chat
            </button>

            <button
              onClick={onClearChat}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Clear conversation"
            >
              <Trash2 size={13} /> Clear Chat
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
