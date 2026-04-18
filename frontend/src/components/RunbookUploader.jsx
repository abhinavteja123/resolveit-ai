import { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const CATEGORIES = [
  { value: 'server', label: 'Server' },
  { value: 'network', label: 'Network' },
  { value: 'application', label: 'Application' },
  { value: 'other', label: 'Other' },
];

export default function RunbookUploader({ onUploadComplete, uploadUrl = `${API_BASE}/runbooks/upload` }) {
  const { token } = useAuth();
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('other');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      const ext = selected.name.split('.').pop().toLowerCase();
      if (!['pdf', 'docx', 'txt'].includes(ext)) {
        toast.error('Only PDF, DOCX, and TXT files are supported');
        return;
      }
      setFile(selected);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file || uploading) return;

    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);

      const res = await axios.post(uploadUrl, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadResult({ success: true, data: res.data });
      toast.success(`Indexed "${file.name}" — ${res.data.chunk_count} chunks`);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadComplete?.();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Upload failed';
      setUploadResult({ success: false, error: msg });
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="glass-card p-6 space-y-5">
      <h3 className="text-lg font-semibold text-dark-100 flex items-center gap-2">
        <Upload className="w-5 h-5 text-primary-400" />
        Upload Runbook
      </h3>

      {/* File drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-dark-600/50 rounded-xl p-8 text-center 
                   cursor-pointer hover:border-primary-500/40 hover:bg-primary-500/[0.03]
                   transition-all duration-300"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleFileChange}
          className="hidden"
        />
        {file ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="w-8 h-8 text-primary-400" />
            <div className="text-left">
              <p className="text-sm font-medium text-dark-200">{file.name}</p>
              <p className="text-xs text-dark-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-10 h-10 text-dark-600 mx-auto" />
            <p className="text-sm text-dark-400">
              Click to select a file
            </p>
            <p className="text-xs text-dark-600">PDF, DOCX, or TXT</p>
          </div>
        )}
      </div>

      {/* Category selector */}
      <div>
        <label className="text-sm text-dark-400 mb-2 block">Category</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                category === cat.value
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'bg-dark-800/50 text-dark-400 border border-dark-700/50 hover:border-dark-600/70'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Indexing...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Upload & Index
          </>
        )}
      </button>

      {/* Result feedback */}
      {uploadResult && (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
            uploadResult.success
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          {uploadResult.success ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {uploadResult.success
            ? `Indexed ${uploadResult.data.chunk_count} chunks from "${uploadResult.data.filename}"`
            : uploadResult.error}
        </div>
      )}
    </div>
  );
}
