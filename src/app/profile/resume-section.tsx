'use client';

import { useState, useEffect, ChangeEvent, DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ResumeSectionProps {
  onProfileUpdated: (updatedProfile: { domains: string[]; skills: string[]; locationPref: string | null }) => void;
}

export function ResumeSection({ onProfileUpdated }: ResumeSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hasResume, setHasResume] = useState(false);
  const [experienceLevel, setExperienceLevel] = useState<string | null>(null);
  const [missingKeywords, setMissingKeywords] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Delete confirm state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load existing resume status on mount
  useEffect(() => {
    async function loadResumeStatus() {
      try {
        const res = await fetch('/api/resume');
        if (res.ok) {
          const data = await res.json();
          setHasResume(data.hasResume);
          setExperienceLevel(data.experienceLevel);
          setMissingKeywords(data.missingKeywords || []);
        }
      } catch (err) {
        console.error('Failed to load resume status:', err);
      }
    }
    loadResumeStatus();
  }, []);

  const handleFileUpload = async (file: File) => {
    setUploadError(null);

    // Client-side quick check
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      setUploadError('Only PDF (.pdf) and DOCX (.docx) files are supported.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be under 5MB.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/resume/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze resume');
      }

      setHasResume(true);
      setExperienceLevel(data.extracted.experienceLevel);
      setMissingKeywords(data.extracted.missingKeywords || []);
      
      // Update parent profile skills/domains
      if (data.profile) {
        onProfileUpdated(data.profile);
      }

      setToastMessage('Resume analyzed & profile skills updated!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setUploadError(err.message || 'An error occurred during upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDeleteResume = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/resume', {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete resume data');
      }

      setHasResume(false);
      setExperienceLevel(null);
      setMissingKeywords([]);
      setShowDeleteConfirm(false);
      setToastMessage('Stored resume data deleted successfully.');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to delete resume data');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-foreground/8 bg-foreground/[0.02] p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span>Resume Analyser</span>
            {hasResume && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                Active
              </span>
            )}
          </h2>
          <p className="text-xs text-muted/70 mt-0.5">
            Upload your resume (PDF or DOCX) to extract skills, detect experience level, and get match recommendations.
          </p>
        </div>

        {hasResume && !showDeleteConfirm && (
          <button
            id="delete-resume-btn"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 transition-colors"
          >
            Delete Resume Data
          </button>
        )}
      </div>

      {/* Delete Confirmation Step */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 space-y-3"
          >
            <div className="text-xs text-red-200">
              <strong className="font-semibold">Confirm Deletion:</strong> This will clear your stored resume text, experience level badge, and missing keyword suggestions. Your applications will not be deleted.
            </div>
            <div className="flex items-center gap-2">
              <button
                id="confirm-delete-resume-btn"
                onClick={handleDeleteResume}
                disabled={deleting}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-foreground hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete Stored Resume Data'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-foreground/10 text-foreground/70 hover:bg-foreground/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Message */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-xs font-medium flex items-center justify-between"
          >
            <span>✓ {toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
          isDragging
            ? 'border-blue-400 bg-blue-500/10'
            : 'border-foreground/15 bg-foreground/[0.01] hover:border-foreground/25 hover:bg-foreground/[0.02]'
        }`}
      >
        <input
          id="resume-file-input"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        {uploading ? (
          <div className="flex flex-col items-center justify-center py-2 space-y-2">
            <div className="w-6 h-6 rounded-full border-2 border-foreground/20 border-t-white animate-spin" />
            <p className="text-xs text-foreground/70 font-medium">Extracting text & analyzing resume with AI…</p>
            <p className="text-[11px] text-muted/70">Raw files are parsed in-memory and never saved to disk.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-foreground/5 border border-foreground/10 flex items-center justify-center mx-auto text-muted">
              📄
            </div>
            <div>
              <p className="text-xs font-medium text-foreground/80">
                <span className="text-blue-400 font-semibold underline">Click to upload</span> or drag and drop
              </p>
              <p className="text-[11px] text-muted/70 mt-0.5">PDF or DOCX files only (max 5MB)</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Error Display */}
      {uploadError && (
        <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/25 text-red-300 text-xs font-medium">
          ⚠️ {uploadError}
        </div>
      )}

      {/* Extracted Metadata Insights Display */}
      {hasResume && (
        <div className="rounded-xl bg-foreground/[0.03] border border-foreground/8 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted">AI Experience Level Detection</span>
            {experienceLevel && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {experienceLevel}
              </span>
            )}
          </div>

          {missingKeywords.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted">Recommended Keywords to Boost Match Score:</span>
              <div className="flex flex-wrap gap-1.5">
                {missingKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="px-2.5 py-0.5 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs font-mono"
                  >
                    + {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
