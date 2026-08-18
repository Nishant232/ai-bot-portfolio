import React from 'react';
import { MessageSquarePlus, Code, Award, HelpCircle } from 'lucide-react';

const SUGGESTED_PROMPTS = [
  {
    icon: MessageSquarePlus,
    label: 'Tell me about yourself',
    prompt: 'Tell me about yourself and your engineering experience.'
  },
  {
    icon: Code,
    label: 'Hardest Project Challenge',
    prompt: 'What was your hardest technical project challenge and how did you solve it?'
  },
  {
    icon: Award,
    label: 'Why should we hire you?',
    prompt: 'Why should our hiring team consider you for a Full-Stack / AI role?'
  },
  {
    icon: HelpCircle,
    label: 'Top Technical Skills',
    prompt: 'What are your top technical skills, frameworks, and education background?'
  }
];

export default function QuickPrompts({ onSelectPrompt }) {
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      overflowX: 'auto',
      paddingBottom: '8px',
      marginBottom: '12px'
    }}>
      {SUGGESTED_PROMPTS.map((item, index) => {
        const IconComponent = item.icon;
        return (
          <button
            key={index}
            onClick={() => onSelectPrompt(item.prompt)}
            className="btn btn-sm"
            style={{
              whiteSpace: 'nowrap',
              borderRadius: '999px',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)'
            }}
          >
            <IconComponent size={14} color="var(--accent-primary)" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
