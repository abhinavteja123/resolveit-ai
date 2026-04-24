import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../components/AppLayout';
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
      const res = await axios.get(`${API_BASE}/runbooks/my`, { headers: { Authorization: `Bearer ${token}` } });
      setRunbooks(res.data.runbooks || []);
    } catch {}
    finally { setLoading(false); }
  }, [token]);

  const handleDelete = async (runbookId) => {
    await axios.delete(`${API_BASE}/runbooks/my/${runbookId}`, { headers: { Authorization: `Bearer ${token}` } });
    await fetchMyRunbooks();
  };

  useEffect(() => { fetchMyRunbooks(); }, [fetchMyRunbooks]);

  return (
    <AppLayout>
      <main className="max-w-6xl mx-auto px-4 py-8">

        <div className="flex items-center gap-3 mb-8">
          <div className="page-header-icon bg-primary-600/15 border border-primary-600/20">
            <Upload className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-100">My Runbooks</h1>
            <p className="text-sm text-dark-600">Upload and manage your personal runbooks</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <RunbookUploader onUploadComplete={fetchMyRunbooks} />
          </div>
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-dark-600" />
              <h2 className="text-base font-semibold text-dark-200">Your Runbooks</h2>
            </div>
            <RunbookTable runbooks={runbooks} loading={loading} onDelete={handleDelete} />
          </div>
        </div>
      </main>
    </AppLayout>
  );
}
