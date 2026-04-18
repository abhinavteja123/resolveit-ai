import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import RunbookUploader from '../components/RunbookUploader';
import RunbookTable from '../components/RunbookTable';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Upload, FileText } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function MyRunbooks() {
  const { token } = useAuth();
  const [runbooks, setRunbooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMyRunbooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/runbooks/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRunbooks(res.data.runbooks || []);
    } catch (err) {
      console.error('Failed to fetch runbooks:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleDelete = async (runbookId) => {
    await axios.delete(`${API_BASE}/runbooks/my/${runbookId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await fetchMyRunbooks();
  };

  useEffect(() => {
    fetchMyRunbooks();
  }, [fetchMyRunbooks]);

  return (
    <div className="min-h-screen bg-dark-950 bg-mesh">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/20">
            <Upload className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">My Runbooks</h1>
            <p className="text-sm text-dark-500">Upload and manage your runbooks</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload (left) */}
          <div className="lg:col-span-1">
            <RunbookUploader onUploadComplete={fetchMyRunbooks} />
          </div>

          {/* Runbooks table (right) */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-dark-500" />
              Your Runbooks
            </h2>
            <RunbookTable runbooks={runbooks} loading={loading} onDelete={handleDelete} />
          </div>
        </div>
      </main>
    </div>
  );
}
