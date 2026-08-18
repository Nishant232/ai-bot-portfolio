import React, { useState, useEffect } from 'react';
import { X, FileText, Code, ExternalLink, Github } from 'lucide-react';

export default function ProfileViewerModal({ isOpen, onClose, profile }) {
  const [activeTab, setActiveTab] = useState('skills');
  const [showRawJson, setShowRawJson] = useState(false);

  // FIX #17: Close modal on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !profile) return null;

  const pInfo = profile.personal_info || {};
  const skills = profile.skills || {};
  const projects = profile.projects || [];
  const experience = profile.experience || [];
  const education = profile.education || [];

  // FIX #17: Close on overlay background click
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className="glass-panel modal-content"
        style={{ maxWidth: '750px' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >

        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={22} color="var(--accent-primary)" />
            <div>
              <h3 id="profile-modal-title" style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Verified Candidate Profile Data
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Grounding dataset powering AI Representative answers
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="btn btn-sm"
              style={{ fontSize: '0.75rem' }}
            >
              <Code size={14} />
              {showRawJson ? 'Tabbed View' : 'Raw JSON'}
            </button>

            <button onClick={onClose} className="btn btn-icon" style={{ padding: '6px' }} aria-label="Close modal">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {showRawJson ? (
          <pre style={{
            background: 'var(--bg-input)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            overflowX: 'auto',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)',
            maxHeight: '450px',
            color: 'var(--text-primary)'
          }}>
            {JSON.stringify(profile, null, 2)}
          </pre>
        ) : (
          <div>
            {/* Tabs */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '8px',
              flexWrap: 'wrap'
            }}>
              {['skills', 'projects', 'experience', 'education'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : ''}`}
                  style={{ textTransform: 'capitalize', fontSize: '0.8rem' }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>

              {/* SKILLS TAB */}
              {activeTab === 'skills' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {Object.entries(skills).map(([category, skillList]) => (
                    <div key={category}>
                      <h4 style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '8px'
                      }}>
                        {category.replace(/_/g, ' ')}
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {skillList.map((s, idx) => (
                          <span key={idx} style={{
                            padding: '4px 10px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '999px',
                            fontSize: '0.8rem'
                          }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PROJECTS TAB — FIX #16: Now shows tech stack chips + GitHub/Live links */}
              {activeTab === 'projects' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {projects.map((p, idx) => (
                    <div key={idx} style={{
                      background: 'var(--bg-input)',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 4px 0' }}>{p.title}</h4>
                          <p style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', marginBottom: '6px' }}>{p.tagline}</p>
                        </div>
                        {/* FIX #16: GitHub + Live URL links */}
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          {p.github_url && (
                            <a
                              href={p.github_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-icon btn-sm"
                              title="View on GitHub"
                              style={{ padding: '5px' }}
                            >
                              <Github size={14} />
                            </a>
                          )}
                          {p.live_url && p.live_url.startsWith('http') && (
                            <a
                              href={p.live_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-icon btn-sm"
                              title="View Live Demo"
                              style={{ padding: '5px' }}
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </div>

                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>{p.description}</p>

                      {/* FIX #16: Tech stack chips */}
                      {p.tech_stack?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                          {p.tech_stack.map((tech, i) => (
                            <span key={i} style={{
                              padding: '2px 8px',
                              background: 'rgba(99, 102, 241, 0.15)',
                              border: '1px solid rgba(99, 102, 241, 0.3)',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              color: 'var(--accent-primary)'
                            }}>
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}

                      {p.hardest_challenge && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <strong>Hardest Challenge:</strong> {p.hardest_challenge}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* EXPERIENCE TAB */}
              {activeTab === 'experience' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {experience.map((exp, idx) => (
                    <div key={idx} style={{
                      background: 'var(--bg-input)',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{exp.role}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>{exp.period}</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 10px 0' }}>{exp.company} • {exp.location}</p>
                      <ul style={{ paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                        {exp.responsibilities.map((resp, i) => (
                          <li key={i} style={{ marginBottom: '4px' }}>{resp}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* EDUCATION TAB */}
              {activeTab === 'education' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {education.map((edu, idx) => (
                    <div key={idx} style={{
                      background: 'var(--bg-input)',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)'
                    }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>{edu.degree}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 8px 0' }}>
                        {edu.institution} ({edu.period}) — CGPA: <strong>{edu.cgpa}</strong>
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Relevant Coursework: {edu.coursework?.join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
