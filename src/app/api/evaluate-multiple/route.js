import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import os from 'os';

const execPromise = promisify(exec);
const writeFilePromise = promisify(fs.writeFile);
const unlinkPromise = promisify(fs.unlink);

// Function to determine the Python command based on the OS
function getPythonCommand() {
  // On Windows, try 'python' first as it's more common
  if (os.platform() === 'win32') {
    return 'python';
  }
  // On Unix-like systems (Linux, macOS), try 'python3' first
  return 'python3';
}

// Function to process a single resume
async function processResume(pdfPath, encodedJobDescription, scriptPath, pythonCommand, index) {
  try {
    // Call the Python script for each PDF with proper paths and quotes
    const command = `${pythonCommand} "${scriptPath}" "${pdfPath}" "${encodedJobDescription}"`;
    console.log(`Executing: ${command}`);
    
    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.error(`Error processing resume ${index}:`, stderr);
    }

    // Parse the result
    const result = JSON.parse(stdout);
    
    return {
      index,
      success: true,
      data: result
    };
  } catch (error) {
    console.error(`Error processing resume ${index}:`, error);
    return {
      index,
      success: false,
      error: error.message
    };
  }
}

// Function to extract candidate info from resume data
function extractCandidateInfo(resumeResult) {
  try {
    const r = resumeResult;
    console.log(`Resume data structure for index ${r.index}:`, JSON.stringify(r.data, null, 2));
    
    let name = 'Unknown';
    let email = 'No email provided';
    
    // Handle different possible structures more robustly
    if (r.data && typeof r.data === 'object') {
      // Check for direct Personal Information object
      if (r.data['Personal Information']) {
        const personalInfo = r.data['Personal Information'];
        name = personalInfo.Name || personalInfo.name || name;
        email = personalInfo.Email || personalInfo.email || email;
      } 
      // Check for resume structure
      else if (r.data.resume && r.data.resume['Personal Information']) {
        const personalInfo = r.data.resume['Personal Information'];
        name = personalInfo.Name || personalInfo.name || name;
        email = personalInfo.Email || personalInfo.email || email;
      }
      // Try alternate key format
      else if (r.data.Personal_Information) {
        const personalInfo = r.data.Personal_Information;
        name = personalInfo.Name || personalInfo.name || name;
        email = personalInfo.Email || personalInfo.email || email;
      }
      // Direct root level properties
      else {
        name = r.data.Name || r.data.name || name;
        email = r.data.Email || r.data.email || email;
      }
    }
    
    return {
      name,
      email,
      score: r.data.overallMatch || 0
    };
  } catch (err) {
    console.error(`Error extracting candidate info for index ${r.index}:`, err);
    return {
      name: 'Error parsing resume',
      email: 'N/A',
      score: 0
    };
  }
}

export async function POST(request) {
  let tempDir = '';
  
  try {
    // Create a temporary directory to store uploaded files
    tempDir = path.join(os.tmpdir(), 'resumatch-' + Date.now());
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const formData = await request.formData();
    const files = formData.getAll('pdfFiles');
    const jobDescription = formData.get('jobDescription');
    const threshold = parseInt(formData.get('threshold') || '70');

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No PDF files provided' }, { status: 400 });
    }

    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 });
    }

    // Base64 encode the job description to safely pass it to the script
    const encodedJobDescription = Buffer.from(jobDescription).toString('base64');
    
    // Get the appropriate Python command for the OS
    const pythonCommand = getPythonCommand();
    
    // Get the absolute path to the script
    const scriptPath = path.resolve(process.cwd(), 'script.py');

    // Write all files to disk
    const pdfPaths = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const pdfPath = path.join(tempDir, `resume_${index}.pdf`);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFilePromise(pdfPath, buffer);
      pdfPaths.push(pdfPath);
    }

    // Process resumes sequentially instead of in parallel
    const results = [];
    for (let index = 0; index < pdfPaths.length; index++) {
      try {
        // Process each resume with a delay to prevent overwhelming Ollama
        const result = await processResume(
          pdfPaths[index], 
          encodedJobDescription, 
          scriptPath, 
          pythonCommand, 
          index
        );
        results.push(result);
        
        // Clean up each file after processing
        await unlinkPromise(pdfPaths[index])
          .catch(err => console.error(`Failed to delete ${pdfPaths[index]}:`, err));
          
        // Add a small delay between requests to avoid overwhelming Ollama
        if (index < pdfPaths.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Failed to process resume ${index}:`, error);
        results.push({
          index,
          success: false,
          error: error.message
        });
      }
    }

    // Filter successful results and extract candidate info
    const candidates = results
      .filter(r => r.success)
      .map(extractCandidateInfo);

    // Filter by threshold
    const qualifyingCandidates = candidates.filter(c => c.score >= threshold);

    // Sort by score descending
    qualifyingCandidates.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      qualifying: qualifyingCandidates,
      total: files.length
    });
    
  } catch (error) {
    console.error('Error in evaluate-multiple API:', error);
    return NextResponse.json(
      { error: 'Failed to process resumes: ' + error.message },
      { status: 500 }
    );
  } finally {
    // Clean up the temporary directory
    if (tempDir) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (err) {
        console.error('Error cleaning up temp directory:', err);
      }
    }
  }
}