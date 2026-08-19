import React, { useEffect, useRef } from 'react';
import MessageItem from './MessageItem';
import QuickPrompts from './QuickPrompts';
import { Sparkles } from 'lucide-react';

function getInitials(name) {
  const parts = (name || 'N').trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

export default function ChatBox({ messages, isStreaming, profile, onSelectPrompt }) {
  const bottomRef = useRef(null);
  const candidateName = profile?.personal_info?.name || 'Nishant';

  // Auto-scroll to bottom on incoming message updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  return (
    <div className="glass-panel" style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      overflow: 'hidden'
    }}>
      
      {/* Scrollable Message Container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        paddingRight: '8px'
      }}>
        {messages.length === 0 ? (
          /* Welcome Card for Recruiter */
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '20px'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              fontWeight: 600,
              marginBottom: '18px'
            }}>
              {getInitials(candidateName)}
            </div>

            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              fontWeight: 600,
              marginBottom: '8px'
            }}>
              Chat with {candidateName}'s AI Representative
            </h2>

            <p style={{
              fontSize: '0.95rem',
              color: 'var(--text-secondary)',
              maxWidth: '520px',
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              Grounded strictly on verified background data — ask about engineering skills, projects, and experience, or evaluate role fit directly.
            </p>

            {/* Suggested Starter Questions */}
            <div style={{ width: '100%', maxWidth: '600px' }}>
              <span style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                display: 'block',
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Suggested Recruiter Questions:
              </span>
              <QuickPrompts onSelectPrompt={onSelectPrompt} />
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <MessageItem key={index} message={msg} candidateName={candidateName} />
            ))}

            {/* Typing Animation Indicator */}
            {isStreaming && messages[messages.length - 1]?.role === 'user' && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)',
                  flexShrink: 0
                }}>
                  <Sparkles size={16} />
                </div>
                <div style={{
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--assistant-msg-bg)',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>Synthesizing response</span>
                  <span className="pulse-dot"></span>
                </div>
              </div>
            )}
          </>
        )}

        <div ref={bottomRef} />
      </div>

    </div>
  );
}
