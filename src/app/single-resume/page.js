'use client';

import { useState } from 'react';
import Link from 'next/link';
import FileUpload from '../../components/FileUpload';
import Results from '../../components/Results';

export default function Home() {
  const [results, setResults] = useState(null);

  const handleFileProcessed = (data) => {
    setResults(data);
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
            <Link href="/single-resume" className="font-semibold underline">Single Resume</Link>
            <Link href="/multiple-resumes" className="ml-4 hover:underline">Multiple Resumes</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6 text-slate-800 text-center">
          Resume Job Match Evaluator
        </h1>
        <p className="text-center mb-8 text-slate-600">
          Upload a resume PDF and let AI evaluate how well it matches the job description.
        </p>

        <FileUpload onFileUpload={handleFileProcessed} />

        {results && <Results data={results} />}
      </main>

      <footer className="bg-slate-800 text-white text-center py-6 mt-12">
        <p>&copy; 2025 ResuMatch. All rights reserved.</p>
      </footer>
    </div>
  );
}
