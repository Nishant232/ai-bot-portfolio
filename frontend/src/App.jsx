import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import ChatBox from './components/ChatBox';
import InputArea from './components/InputArea';
import JDAnalyzerModal from './components/JDAnalyzerModal';
import ProfileViewerModal from './components/ProfileViewerModal';
import { fetchCandidateProfile, streamChatCompletion } from './services/api';

export default function App() {
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);   // FIX #14: loading state
  const [profileError, setProfileError] = useState(null);        // FIX #14: error state
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [theme, setTheme] = useState('dark');

  const [isJDModalOpen, setIsJDModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // FIX #6: AbortController ref — cancel previous stream when user sends new message
  const abortControllerRef = useRef(null);

  // FIX #14: Show loading/error state for profile fetch
  useEffect(() => {
    setProfileLoading(true);
    fetchCandidateProfile()
      .then((data) => {
        setProfile(data);
        setProfileError(null);
      })
      .catch((err) => {
        console.error('Failed to load profile data:', err);
        setProfileError('Could not connect to backend. Chat may have limited functionality.');
      })
      .finally(() => setProfileLoading(false));
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const handleSendMessage = async (text) => {
    if (!text.trim() || isStreaming) return;

    // FIX #6: Cancel any existing in-flight stream before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setIsStreaming(true);

    // Add empty assistant message placeholder for streaming
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    let currentResponse = '';

    await streamChatCompletion(
      updatedMessages,
      (chunk) => {
        currentResponse += chunk;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: 'assistant', content: currentResponse };
          return copy;
        });
      },
      (err) => {
        console.error('Stream error:', err);
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: 'assistant',
            content: '⚠️ I encountered a temporary connection issue. Please try asking your question again.'
          };
          return copy;
        });
        setIsStreaming(false);
      },
      () => {
        setIsStreaming(false);
      },
      controller.signal  // FIX #6: pass the abort signal
    );
  };

  const handleClearChat = () => {
    // FIX #6: Also abort any active stream when chat is cleared
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setIsStreaming(false);
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;

    const candidateName = profile?.personal_info?.name || 'Nishant';
    let md = `# Conversation History with ${candidateName} AI Agent\n\n`;
    messages.forEach((msg) => {
      const sender = msg.role === 'user' ? 'Recruiter' : `${candidateName} AI`;
      md += `### **${sender}**:\n${msg.content}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI_Portfolio_Chat_${new Date().toISOString().slice(0, 10)}.md`;

    // FIX #7: Ensure Blob URL is always revoked even if click() throws
    try {
      a.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="app-container">
      {/* FIX #14: Show backend error banner if profile failed to load */}
      {profileError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 16px',
          fontSize: '0.85rem',
          color: '#fca5a5',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ⚠️ {profileError}
        </div>
      )}

      {/* Top Banner Header */}
      <Header
        profile={profile}
        profileLoading={profileLoading}
        onOpenJDModal={() => setIsJDModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Streaming Chat Window */}
      <ChatBox
        messages={messages}
        isStreaming={isStreaming}
        profile={profile}
        onSelectPrompt={handleSendMessage}
      />

      {/* Input Area */}
      <InputArea
        onSendMessage={handleSendMessage}
        isStreaming={isStreaming}
        onClearChat={handleClearChat}
        onExportChat={handleExportChat}
      />

      {/* HR Modals */}
      <JDAnalyzerModal
        isOpen={isJDModalOpen}
        onClose={() => setIsJDModalOpen(false)}
        candidateName={profile?.personal_info?.name}
      />

      <ProfileViewerModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profile={profile}
      />
    </div>
  );
}
