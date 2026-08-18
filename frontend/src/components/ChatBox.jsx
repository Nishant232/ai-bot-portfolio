import React, { useEffect, useRef } from 'react';
import MessageItem from './MessageItem';
import QuickPrompts from './QuickPrompts';
import { Sparkles, Bot } from 'lucide-react';

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
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              marginBottom: '16px',
              boxShadow: 'var(--accent-glow)'
            }}>
              <Bot size={36} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>
              Chat with {candidateName}'s AI Clone
            </h2>

            <p style={{
              fontSize: '0.95rem',
              color: 'var(--text-secondary)',
              maxWidth: '520px',
              marginBottom: '24px',
              lineHeight: '1.6'
            }}>
              I am an AI representation grounded strictly on verified background data. Ask me anything about engineering skills, projects, experience, or evaluate role fit!
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
                  borderRadius: '50%',
                  background: 'var(--accent-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: 'var(--accent-glow)'
                }}>
                  <Sparkles size={18} />
                </div>
                <div style={{
                  padding: '10px 16px',
                  borderRadius: '16px',
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
