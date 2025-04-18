'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState({ single: false, multiple: false });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-blue-700 text-white py-4 px-8 shadow-md">
        <div className="flex items-center text-2xl font-bold">
          <span className="mr-2 text-3xl">📄</span> ResuMatch
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 py-12 max-w-6xl mx-auto">
        <section className="text-center mb-12 max-w-3xl">
          <h1 className="text-4xl font-bold mb-4 text-slate-800">
            Match Your Resume to the Perfect Job
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Our AI-powered tool evaluates how well your resume aligns with job descriptions, 
            providing actionable insights to help you land your dream job.
          </p>

          <div className="flex justify-center gap-8 my-8 flex-wrap">
            <Link href="/single-resume">
              <button
                className={`flex items-center justify-center px-8 py-4 min-w-[220px] text-lg font-semibold rounded-lg transition-all duration-300 ${
                  isHovered.single
                    ? 'bg-blue-800 transform -translate-y-1 shadow-lg'
                    : 'bg-blue-700 shadow-md'
                } text-white`}
                onMouseEnter={() => setIsHovered({ ...isHovered, single: true })}
                onMouseLeave={() => setIsHovered({ ...isHovered, single: false })}
              >
                <span className="mr-2">📄</span> Single Resume
              </button>
            </Link>

            <Link href="/multiple-resumes">
              <button
                className={`flex items-center justify-center px-8 py-4 min-w-[220px] text-lg font-semibold rounded-lg transition-all duration-300 ${
                  isHovered.multiple
                    ? 'bg-blue-800 transform -translate-y-1 shadow-lg'
                    : 'bg-blue-700 shadow-md'
                } text-white`}
                onMouseEnter={() => setIsHovered({ ...isHovered, multiple: true })}
                onMouseLeave={() => setIsHovered({ ...isHovered, multiple: false })}
              >
                <span className="mr-2">📚</span> Multiple Resumes
              </button>
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
          <FeatureCard
            icon="🎯"
            title="Precision Matching"
            description="Our algorithm analyzes key requirements from job descriptions and matches them against your resume to provide a comprehensive evaluation score."
          />
          
          <FeatureCard
            icon="💡"
            title="Smart Suggestions"
            description="Get personalized recommendations on how to improve your resume for specific job positions, highlighting missing skills and experiences."
          />
          
          <FeatureCard
            icon="⚡"
            title="Time-Saving Analysis"
            description="Compare multiple resumes against a job description at once or evaluate a single resume against multiple job listings to find your best match."
          />
        </section>
      </main>

      <footer className="bg-slate-800 text-white text-center py-6 mt-12">
        <p>&copy; 2025 ResuMatch. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className={`bg-white p-8 rounded-xl transition-all duration-300 ${
        isHovered ? 'transform -translate-y-2 shadow-xl' : 'shadow-md'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="text-4xl mb-4 text-green-600">{icon}</div>
      <h3 className="text-xl font-semibold mb-3 text-slate-800">{title}</h3>
      <p className="text-slate-600">{description}</p>
    </div>
  );
}