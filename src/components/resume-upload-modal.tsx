'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ResumeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (filename: string, size: string) => void;
}

export function ResumeUploadModal({ isOpen, onClose, onUploadSuccess }: ResumeUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mockSelected, setMockSelected] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mockFiles = [
    'resume_developer_2026.pdf',
    'jayanth_portfolio_cv.pdf',
    'fullstack_engineer_resume.pdf'
  ];

  const handleMockSelect = (file: string) => {
    setMockSelected(file);
    setSelectedFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setMockSelected(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setMockSelected(null);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = selectedFile ? selectedFile.name : mockSelected;
    const size = selectedFile ? `${(selectedFile.size / 1024).toFixed(0)} KB` : '242 KB';
    if (!name) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate progress bar increment
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsUploading(false);
            onUploadSuccess(name, size);
            // Reset modal states
            setSelectedFile(null);
            setMockSelected(null);
            onClose();
          }, 400);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const hasSelection = selectedFile !== null || mockSelected !== null;
  const displayName = selectedFile ? selectedFile.name : mockSelected;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/85 backdrop-blur-sm"
          />

          {/* Modal box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md rounded-2xl border border-[#333] bg-[#090909] p-6 shadow-2xl overflow-hidden z-10"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-border-strong via-muted to-border-strong" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted/70 hover:text-foreground transition-colors cursor-pointer"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="space-y-4">
              <div>
                <h3 className="text-foreground font-bold text-base tracking-tight">Upload Resume</h3>
                <p className="text-xs text-muted/70 mt-1">Select an actual file or choose a mock resume template below.</p>
              </div>

              {!isUploading ? (
                <form onSubmit={handleUploadSubmit} className="space-y-4">
                  {/* Hidden actual file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {/* Drag and Drop Zone */}
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={onButtonClick}
                    className={`border border-dashed rounded-xl p-6 bg-background/50 text-center transition-all cursor-pointer ${
                      dragActive ? 'border-foreground bg-foreground/5' : 'border-[#1c1c1c] hover:border-[#333]'
                    }`}
                  >
                    <svg className="w-6 h-6 text-muted/40 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    
                    {selectedFile ? (
                      <div className="mt-2">
                        <span className="text-xs text-green-400 font-medium block">File Selected:</span>
                        <span className="text-xs text-foreground font-bold block truncate max-w-xs mx-auto">{selectedFile.name}</span>
                        <span className="text-[10px] text-foreground/45 mt-0.5 block">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs text-foreground/70 block mt-2 font-medium">Drag & Drop your resume here</span>
                        <span className="text-[10px] text-foreground/30 block mt-1">or click to browse local files (.pdf, .doc, .docx)</span>
                      </>
                    )}
                  </div>

                  {/* Preset Mocks Choice */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-muted/80 uppercase tracking-wider font-semibold">Or pick a templates template</label>
                    <div className="grid grid-cols-1 gap-2">
                      {mockFiles.map(file => {
                        const isSelected = mockSelected === file;
                        return (
                          <button
                            key={file}
                            type="button"
                            onClick={() => handleMockSelect(file)}
                            className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex justify-between items-center cursor-pointer ${
                              isSelected 
                                ? 'bg-foreground text-black border-transparent font-medium' 
                                : 'bg-black border-[#1c1c1c] text-muted hover:bg-[#121212] hover:text-foreground hover:border-[#333]'
                            }`}
                          >
                            <span className="truncate max-w-xs">{file}</span>
                            {isSelected && (
                              <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!hasSelection}
                    className="w-full rounded-full bg-foreground text-black hover:bg-foreground/90 disabled:bg-border-strong disabled:text-neutral-500 font-semibold py-2.5 transition-colors text-xs cursor-pointer"
                  >
                    Upload Selected Resume
                  </button>
                </form>
              ) : (
                <div className="py-8 space-y-4 text-center">
                  <span className="text-xs text-foreground/70 font-semibold truncate block max-w-xs mx-auto">Uploading {displayName}...</span>
                  <div className="w-full bg-[#1c1c1c] rounded-full h-1.5 overflow-hidden">
                    <motion.div 
                      className="bg-foreground h-1.5 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                      layout
                    />
                  </div>
                  <span className="text-[10px] text-muted/70 block mt-1">{uploadProgress}% uploaded</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
