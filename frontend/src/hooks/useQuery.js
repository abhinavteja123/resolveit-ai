import { useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function useQuery() {
  const { token } = useAuth();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submitQuery = useCallback(
    async (queryText, scope = 'admin') => {
      setLoading(true);
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

  return { result, loading, error, submitQuery, submitFeedback, setResult };
}
