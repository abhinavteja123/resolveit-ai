import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function useQuery() {
  const { token } = useAuth();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const submitQuery = useCallback(
    async (queryText, scope = 'admin') => {
      setLoading(true);
      setStreaming(false);
      setStreamingText('');
      setError(null);
      setResult(null);
      try {
        const res = await axios.post(
          `${API_BASE}/query`,
          { query: queryText, scope },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setResult(res.data);
        return res.data;
      } catch (err) {
        const msg = err.response?.data?.detail || err.message || 'Query failed';
        setError(msg);
        throw new Error(msg);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  const submitQueryStream = useCallback(
    async (queryText, scope = 'admin', threadId = null) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setStreaming(true);
      setStreamingText('');
      setError(null);
      setResult(null);

      let sources = [];
      let accText = '';

      try {
        const response = await fetch(`${API_BASE}/query/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ query: queryText, scope, thread_id: threadId }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || `HTTP ${response.status}`);
        }

        setLoading(false);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              const raw = line.slice(6).trim();
              if (!raw) continue;
              try {
                const parsed = JSON.parse(raw);
                if (currentEvent === 'sources') {
                  sources = Array.isArray(parsed) ? parsed : [];
                } else if (currentEvent === 'token') {
                  const chunk = typeof parsed === 'string' ? parsed : String(parsed);
                  accText += chunk;
                  setStreamingText(accText);
                } else if (currentEvent === 'done') {
                  setResult({
                    answer: accText,
                    sources,
                    top_confidence: parsed.top_confidence ?? 0,
                    query_log_id: parsed.query_log_id ?? null,
                    cached: false,
                  });
                  setStreaming(false);
                } else if (currentEvent === 'error' || parsed?.error) {
                  throw new Error(parsed?.error || 'Stream error');
                }
              } catch (parseErr) {
                if (currentEvent === 'token') {
                  accText += raw;
                  setStreamingText(accText);
                }
              }
              currentEvent = '';
            }
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          const msg = err.message || 'Stream failed';
          setError(msg);
          setStreaming(false);
        }
      } finally {
        setLoading(false);
        setStreaming(false);
      }
    },
    [token]
  );

  const submitFeedback = useCallback(
    async (queryLogId, rating, comment = '') => {
      try {
        await axios.post(
          `${API_BASE}/feedback`,
          { query_log_id: queryLogId, rating, comment },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        throw new Error(err.response?.data?.detail || 'Feedback failed');
      }
    },
    [token]
  );

  return {
    result, loading, streaming, streamingText, error,
    submitQuery, submitQueryStream, submitFeedback, setResult,
  };
}
