/**
 * API Service for interacting with FastAPI backend endpoints and SSE streaming.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchCandidateProfile() {
  const response = await fetch(`${API_BASE_URL}/api/profile`);
  if (!response.ok) {
    throw new Error(`Failed to fetch profile: ${response.statusText}`);
  }
  return await response.json();
}

export async function analyzeJobDescription(jobDescription) {
  const response = await fetch(`${API_BASE_URL}/api/analyze-jd`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ job_description: jobDescription }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `JD Analysis failed with status ${response.status}`);
  }

  return await response.json();
}

/**
 * FIX #6: Added AbortController signal parameter.
 * Caller can pass a signal to cancel an in-flight stream when a new message
 * is sent or the component unmounts, preventing ghost streams.
 */
export async function streamChatCompletion(messages, onChunk, onError, onComplete, signal) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
      signal, // FIX #6: AbortController integration
    });

    if (!response.ok) {
      throw new Error(`Chat API error (${response.status}): ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || ''; // Keep incomplete trailing fragment in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const rawData = trimmed.slice(6).trim();
          if (rawData === '[DONE]') {
            if (onComplete) onComplete();
            return;
          }
          try {
            const parsed = JSON.parse(rawData);
            if (parsed.content) {
              onChunk(parsed.content);
            }
          } catch (e) {
            console.error('Failed to parse SSE payload:', rawData, e);
          }
        }
      }
    }

    if (onComplete) onComplete();
  } catch (err) {
    // FIX #6: AbortError is intentional — do not surface as a UI error
    if (err.name === 'AbortError') return;
    console.error('Streaming connection error:', err);
    if (onError) onError(err);
  }
}
