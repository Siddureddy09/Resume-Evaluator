'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function MultipleResumes() {
  const [jobDescription, setJobDescription] = useState('');
  const [threshold, setThreshold] = useState(70);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [directoryHandle, setDirectoryHandle] = useState(null);
  const [selectedDirName, setSelectedDirName] = useState('');

  const handleDirectorySelect = async () => {
    try {
      // Use the File System Access API to select a directory
      const dirHandle = await window.showDirectoryPicker();
      setDirectoryHandle(dirHandle);
      setSelectedDirName(dirHandle.name);
      setError('');
    } catch (err) {
      if (err.name !== 'AbortError') { // Ignore if user cancels
        setError('Failed to select directory. Make sure your browser supports this feature.');
        console.error(err);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!directoryHandle) {
      setError('Please select a directory containing resumes first');
      return;
    }

    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Gather all PDF files from the directory
      const pdfFiles = [];
      for await (const entry of directoryHandle.values()) {
        if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.pdf')) {
          const file = await entry.getFile();
          pdfFiles.push(file);
        }
      }

      if (pdfFiles.length === 0) {
        throw new Error('No PDF files found in the selected directory');
      }

      // Create form data with all files and job description
      const formData = new FormData();
      pdfFiles.forEach(file => {
        formData.append('pdfFiles', file);
      });
      formData.append('jobDescription', jobDescription);
      formData.append('threshold', threshold.toString());

      // Send to the backend
      const response = await fetch('/api/evaluate-multiple', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(`Processing failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-blue-700 text-white py-4 px-8 shadow-md">
        <div className="flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center text-2xl font-bold cursor-pointer">
              <span className="mr-2 text-3xl">📄</span> ResuMatch
            </div>
          </Link>
          <nav>
            <Link href="/single-resume" className="mr-4 hover:underline">Single Resume</Link>
            <Link href="/multiple-resumes" className="font-semibold underline">Multiple Resumes</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 text-slate-800">
          Batch Resume Processing
        </h1>

        {!results ? (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="directory-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Directory with Resumes (PDF files only)
                </label>
                <div 
                  onClick={handleDirectorySelect}
                  className="cursor-pointer w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-blue-500 transition-colors"
                >
                  {selectedDirName ? (
                    <span className="text-slate-700">Selected: {selectedDirName}</span>
                  ) : (
                    <span className="text-slate-500">Click to select a directory containing PDFs</span>
                  )}
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="threshold" className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Match Score Threshold (%)
                </label>
                <input
                  type="number"
                  id="threshold"
                  min="0"
                  max="100"
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="job-description" className="block text-sm font-medium text-gray-700 mb-2">
                  Job Description
                </label>
                <textarea
                  id="job-description"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description here..."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  rows="6"
                  required
                ></textarea>
              </div>
              
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              
              <button
                type="submit"
                disabled={!directoryHandle || !jobDescription.trim() || isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:bg-blue-300"
              >
                {isProcessing ? 'Processing Resumes...' : 'Process Resumes'}
              </button>
            </form>
          </div>
        ) : (
          <ResultsList 
            results={results} 
            threshold={threshold} 
            onReset={() => setResults(null)} 
            jobDescription={jobDescription}
          />
        )}
      </main>

      <footer className="bg-slate-800 text-white text-center py-6 mt-12">
        <p>&copy; 2025 ResuMatch. All rights reserved.</p>
      </footer>
    </div>
  );
}

function ResultsList({ results, threshold, onReset, jobDescription }) {
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');

  const handleSendEmails = async () => {
    if (results.qualifying.length === 0) return;
    
    setIsSendingEmails(true);
    setEmailStatus('');
    
    try {
      const response = await fetch('/api/send-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidates: results.qualifying,
          jobDescription: jobDescription
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setEmailStatus(`Successfully sent ${data.sentCount} emails to qualified candidates.`);
    } catch (err) {
      setEmailStatus(`Failed to send emails: ${err.message}`);
    } finally {
      setIsSendingEmails(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">
          Candidates Above {threshold}% Match Score
        </h2>
        <button
          onClick={onReset}
          className="bg-blue-600 hover:bg-blue-700 text-slate-700 px-4 py-2 rounded mr-2"
        >
          Process New Batch
        </button>
      </div>

      {results.qualifying.length > 0 ? (
        <div>
          <p className="mb-4 text-slate-600">
            Found {results.qualifying.length} candidate{results.qualifying.length !== 1 ? 's' : ''} out of {results.total} resumes that match{results.qualifying.length !== 1 ? '' : 'es'} your criteria.
          </p>
          
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full bg-white border border-slate-200">
              <thead>
                <tr className="bg-slate-100">
                  <th className="py-3 px-4 text-left border-b">Name</th>
                  <th className="py-3 px-4 text-left border-b">Email</th>
                  <th className="py-3 px-4 text-left border-b">Match Score</th>
                </tr>
              </thead>
              <tbody>
                {results.qualifying.map((candidate, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="py-3 px-4 border-b">{candidate.name}</td>
                    <td className="py-3 px-4 border-b">{candidate.email}</td>
                    <td className="py-3 px-4 border-b">
                      <div className="flex items-center">
                        <div className="w-24 bg-slate-200 rounded-full h-2 mr-2">
                          <div 
                            className="h-2 rounded-full bg-teal-500" 
                            style={{ width: `${candidate.score}%` }}
                          ></div>
                        </div>
                        <span>{candidate.score}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 border-t pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between">
              <button
                onClick={handleSendEmails}
                disabled={isSendingEmails}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded flex items-center mb-3 sm:mb-0"
              >
                {isSendingEmails ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending Emails...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                    Send Emails to Qualified Candidates
                  </>
                )}
              </button>
              {emailStatus && (
                <span className={`text-sm ${emailStatus.includes('Failed') ? 'text-red-500' : 'text-green-600'}`}>
                  {emailStatus}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-slate-700 mb-3">No candidates met the {threshold}% threshold.</p>
          <p className="text-slate-500">Total resumes processed: {results.total}</p>
        </div>
      )}
    </div>
  );
}