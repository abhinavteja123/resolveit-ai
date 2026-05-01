import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const CATEGORIES = [
  { value: 'server',      label: 'Server' },
  { value: 'network',     label: 'Network' },
  { value: 'application', label: 'Application' },
  { value: 'other',       label: 'Other' },
];

export default function RunbookUploader({ onUploadComplete, uploadUrl = `${API_BASE}/runbooks/upload` }) {
  const { token } = useAuth();
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('other');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const dropzoneRef = useRef(null);

  // 3D Parallax effect state
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7.5deg", "-7.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7.5deg", "7.5deg"]);

  const handleMouseMove = (e) => {
    if (!dropzoneRef.current) return;
    const rect = dropzoneRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const processFile = (selected) => {
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

  const handleFileChange = (e) => processFile(e.target.files[0]);

  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(false); };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragActive(true); };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
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
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
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
    <div className="glass-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Upload className="w-4 h-4 text-primary-400" />
        <h3 className="text-base font-semibold text-dark-200">Upload Playbook</h3>
      </div>

      {/* Physics 3D Drop zone */}
      <div className="h-64" style={{ perspective: 1000 }}>
        <motion.div
          ref={dropzoneRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          animate={{ scale: isDragActive ? 1.05 : 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={cn(
            "h-full w-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-colors duration-300 relative overflow-hidden",
            isDragActive ? "border-primary-400 bg-primary-500/10 shadow-[0_0_30px_rgba(var(--primary-500),0.2)]" : "border-dark-800/70 hover:border-primary-600/50 bg-dark-900/40 hover:bg-dark-900/60"
          )}
        >
          {/* Animated glow on drag */}
          <AnimatePresence>
            {isDragActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary-500),0.15)_0%,transparent_70%)] pointer-events-none"
              />
            )}
          </AnimatePresence>

          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" onChange={handleFileChange} className="hidden" />
          
          <motion.div style={{ translateZ: "40px" }} className="pointer-events-none flex flex-col items-center justify-center w-full">
            {file ? (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-primary-500/20 flex items-center justify-center border border-primary-500/30 shadow-inner">
                  <FileText className="w-7 h-7 text-primary-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white max-w-[200px] truncate">{file.name}</p>
                  <p className="text-xs font-mono text-primary-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <motion.div 
                  animate={{ y: isDragActive ? -10 : 0 }}
                  className="w-14 h-14 rounded-full bg-dark-800 flex items-center justify-center mx-auto border border-dark-700 shadow-inner"
                >
                  <Upload className={cn("w-6 h-6 transition-colors", isDragActive ? "text-primary-400" : "text-dark-500")} />
                </motion.div>
                <div>
                  <p className="text-sm font-medium text-dark-300">
                    {isDragActive ? "Drop to upload" : "Drag & drop file here"}
                  </p>
                  <p className="text-[11px] text-dark-600 mt-1 uppercase tracking-widest font-semibold">PDF, DOCX, TXT</p>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* Category */}
      <div className="pt-2">
        <p className="text-[11px] font-semibold text-dark-600 uppercase tracking-widest mb-2">Category Tag</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border ${
                category === cat.value
                  ? 'bg-primary-600/15 text-primary-400 border-primary-500/30 shadow-[0_0_15px_rgba(var(--primary-500),0.15)]'
                  : 'bg-dark-900/50 text-dark-500 border-dark-800/60 hover:border-dark-700/60 hover:text-dark-300'
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
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white text-black hover:bg-dark-100 mt-2"
      >
        {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Extracting Knowledge…</> : <><SparklesIcon /> Ingest to Playbook</>}
      </button>

      {uploadResult && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2 p-3 rounded-xl text-xs font-medium ${
            uploadResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          {uploadResult.success ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
          {uploadResult.success
            ? `Extracted ${uploadResult.data.chunk_count} logic steps from "${uploadResult.data.filename}"`
            : uploadResult.error}
        </motion.div>
      )}
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}
