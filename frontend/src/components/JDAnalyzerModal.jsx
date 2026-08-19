import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { analyzeJobDescription } from '../services/api';

export default function JDAnalyzerModal({ isOpen, onClose, candidateName }) {
  const [jdText, setJdText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // FIX #17: Close modal on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // FIX #17: Auto-focus textarea when modal opens
  const textareaRef = useRef(null);
  useEffect(() => {
    if (isOpen && !result) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen, result]);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!jdText.trim()) {
      setError('Please paste a Job Description before analyzing.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await analyzeJobDescription(jdText.trim());
      setResult(res);
    } catch (err) {
      setError(err.message || 'Failed to analyze Job Description.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setJdText('');
    setError('');
  };

  // FIX #17: Close on overlay background click (outside modal)
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="glass-panel modal-content" role="dialog" aria-modal="true" aria-labelledby="jd-modal-title">

        {/* Modal Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)'
            }}>
              <Sparkles size={18} />
            </div>
            <div>
              <h3 id="jd-modal-title" style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Job Description Suitability Analyzer
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Evaluate {candidateName || 'Candidate'}'s fit against your role requirements
              </p>
            </div>
          </div>

          <button onClick={onClose} className="btn btn-icon" style={{ padding: '6px' }} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        {!result ? (
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '8px',
              color: 'var(--text-primary)'
            }}>
              Paste Job Description (JD) text below:
            </label>

            <textarea
              ref={textareaRef}
              rows={8}
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="e.g. Seeking a Senior Full-Stack Engineer with 3+ years of experience in Python, FastAPI, React, PostgreSQL, LLM integration, and Docker..."
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                outline: 'none',
                resize: 'vertical',
                marginBottom: '16px'
              }}
            />

            {error && (
              <div style={{
                color: 'var(--danger-color)',
                fontSize: '0.85rem',
                marginBottom: '12px'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={onClose} className="btn">Cancel</button>
              <button
                onClick={handleAnalyze}
                disabled={loading || !jdText.trim()}
                className="btn btn-primary"
                style={{ opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Evaluating Fit...' : 'Calculate Suitability Score'}
              </button>
            </div>
          </div>
        ) : (
          /* Results View */
          <div>
            {/* Score & Recommendation Card */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              gap: '20px',
              background: 'var(--bg-input)',
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '20px',
              border: '1px solid var(--border-glow)'
            }}>
              {/* Score Gauge */}
              <div className="score-circle" style={{ '--score': result.suitability_score }}>
                <div className="score-inner">
                  <span className="score-number">{result.suitability_score}%</span>
                  <span className="score-label">MATCH</span>
                </div>
              </div>

              {/* Recommendation Details */}
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  AI Hiring Decision
                </span>
                <h4 style={{
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  color: result.suitability_score >= 80
                    ? 'var(--success-color)'
                    : result.suitability_score >= 50
                      ? 'var(--warning-color)'
                      : 'var(--danger-color)',
                  margin: '4px 0'
                }}>
                  {result.interview_recommendation}
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {result.summary}
                </p>
              </div>
            </div>

            {/* Strengths List */}
            <div style={{ marginBottom: '16px' }}>
              <h5 style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--success-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px'
              }}>
                <CheckCircle2 size={16} /> Key Qualifications & Strengths
              </h5>
              <ul style={{ paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                {result.key_strengths.map((str, idx) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{str}</li>
                ))}
              </ul>
            </div>

            {/* Missing Competencies */}
            {result.missing_skills?.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h5 style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--warning-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '8px'
                }}>
                  <AlertCircle size={16} /> Missing / Growth Skill Gaps
                </h5>
                <ul style={{ paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {result.missing_skills.map((skill, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>{skill}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={handleReset} className="btn">Test Another JD</button>
              <button onClick={onClose} className="btn btn-primary">Close</button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
