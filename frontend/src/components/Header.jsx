import React from 'react';
import { 
  Bot, 
  Github, 
  Linkedin, 
  Globe, 
  FileText, 
  Sparkles, 
  Sun, 
  Moon
} from 'lucide-react';

export default function Header({ profile, onOpenJDModal, onOpenProfileModal, theme, toggleTheme }) {
  const pInfo = profile?.personal_info || {};
  const social = pInfo.social_links || {};

  return (
    <header className="glass-panel" style={{ padding: '14px 20px' }}>
      {/* Single row that wraps gracefully on mobile */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap'
      }}>

        {/* Left: Avatar + Name + Badge + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: 'var(--accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: 'var(--accent-glow)',
            flexShrink: 0
          }}>
            <Bot size={26} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, whiteSpace: 'nowrap' }}>
                {pInfo.name || 'Nishant'} AI
              </h1>
              <span className="pulse-badge" style={{ fontSize: '0.7rem' }}>
                <span className="pulse-dot"></span>
                {pInfo.status || 'Available for Hire'}
              </span>
            </div>
            {/* Title hidden on very small screens to save space */}
            <p style={{
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {pInfo.title || 'Full-Stack & AI Systems Engineer'}
            </p>
          </div>
        </div>

        {/* Right: Social Links + Action Buttons + Theme Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>

          {/* Social icons — hidden on screens < 480px via CSS class */}
          <div className="social-links-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {social.github && (
              <a href={social.github} target="_blank" rel="noreferrer" className="btn btn-icon" title="GitHub" style={{ padding: '7px' }}>
                <Github size={17} />
              </a>
            )}
            {social.linkedin && (
              <a href={social.linkedin} target="_blank" rel="noreferrer" className="btn btn-icon" title="LinkedIn" style={{ padding: '7px' }}>
                <Linkedin size={17} />
              </a>
            )}
            {social.portfolio && (
              <a href={social.portfolio} target="_blank" rel="noreferrer" className="btn btn-icon" title="Portfolio" style={{ padding: '7px' }}>
                <Globe size={17} />
              </a>
            )}
            <div style={{ width: '1px', height: '22px', background: 'var(--border-color)', margin: '0 2px' }} />
          </div>

          {/* Action Buttons */}
          <button className="btn btn-primary btn-sm" onClick={onOpenJDModal}>
            <Sparkles size={14} />
            Analyze Job Fit
          </button>

          <button className="btn btn-sm" onClick={onOpenProfileModal}>
            <FileText size={14} />
            <span className="view-data-label">View Data</span>
          </button>

          {/* Theme Toggle */}
          <button className="btn btn-icon" onClick={toggleTheme} title="Toggle Theme" style={{ padding: '7px' }}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>

      </div>
    </header>
  );
}
