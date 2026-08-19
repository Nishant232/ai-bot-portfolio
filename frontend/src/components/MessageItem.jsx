import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // FIX #30: without this, GFM tables render as raw "|---|" text
import rehypeSanitize from 'rehype-sanitize'; // FIX #8: Sanitize markdown output
import { User, Copy, Check, Volume2, VolumeX } from 'lucide-react';

function getInitials(name) {
  const parts = (name || 'N').trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

/**
 * FIX #9: Strip markdown syntax before passing to TTS so the browser
 * doesn't read out "asterisk asterisk bold text asterisk asterisk".
 */
function stripMarkdownForSpeech(text) {
  return text
    .replace(/#{1,6}\s?/g, '')          // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')    // bold
    .replace(/\*(.+?)\*/g, '$1')        // italic
    .replace(/_(.+?)_/g, '$1')          // underscore italic
    .replace(/`{3}[\s\S]*?`{3}/g, '')   // code blocks
    .replace(/`(.+?)`/g, '$1')          // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .replace(/!\[.*?\]\(.+?\)/g, '')    // images
    .replace(/^[-*+]\s+/gm, '')         // bullet points
    .replace(/^\d+\.\s+/gm, '')         // numbered lists
    .replace(/^>\s+/gm, '')             // blockquotes
    .replace(/[-–—]{2,}/g, ', ')        // dashes
    .replace(/\n{2,}/g, '. ')           // paragraph breaks → pauses
    .trim();
}

export default function MessageItem({ message, candidateName }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel(); // Stop any active speech

    // FIX #9: Use cleaned plain text for speech — no markdown symbols
    const cleanText = stripMarkdownForSpeech(message.content);
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start',
      marginBottom: '20px',
      flexDirection: isUser ? 'row-reverse' : 'row'
    }}>
      {/* Avatar — typographic initials for the assistant instead of a generic bot
          icon; keeps the personal-brand mark consistent with the header. */}
      <div style={{
        width: '34px',
        height: '34px',
        borderRadius: 'var(--radius-md)',
        background: isUser ? 'var(--bg-card-hover)' : 'var(--bg-input)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isUser ? 'var(--text-secondary)' : 'var(--accent-primary)',
        fontFamily: isUser ? 'inherit' : 'var(--font-display)',
        fontSize: isUser ? undefined : '0.9rem',
        fontWeight: 600,
        flexShrink: 0
      }}>
        {isUser ? <User size={16} /> : getInitials(candidateName)}
      </div>

      {/* Message Bubble & Actions */}
      <div style={{
        maxWidth: '80%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start'
      }}>
        {/* Name / Role Label */}
        <span style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          marginBottom: '4px',
          padding: '0 4px'
        }}>
          {isUser ? 'Recruiter' : `${candidateName || 'AI'} — AI Representative`}
        </span>

        {/* Content Box */}
        <div style={{
          padding: '14px 18px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isUser ? 'var(--user-msg-bg)' : 'var(--assistant-msg-bg)',
          color: isUser ? 'var(--user-msg-text)' : 'var(--text-primary)',
          border: isUser ? 'none' : '1px solid var(--border-color)',
          fontSize: '0.95rem',
          lineHeight: '1.6',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
          position: 'relative'
        }}>
          {isUser ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
          ) : (
            /* FIX #8: rehype-sanitize prevents XSS from malicious LLM-generated links */
            <ReactMarkdown
              className="markdown-body"
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Message Action Controls (Copy & Speak) */}
        {!isUser && message.content && (
          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '6px',
            padding: '0 4px'
          }}>
            <button
              onClick={handleCopy}
              style={{
                background: 'none',
                border: 'none',
                color: copied ? 'var(--success-color)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem'
              }}
              title="Copy response"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>

            <button
              onClick={handleSpeak}
              style={{
                background: 'none',
                border: 'none',
                color: isSpeaking ? 'var(--accent-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem'
              }}
              title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
            >
              {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
              {isSpeaking ? 'Speaking...' : 'Listen'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
