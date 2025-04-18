import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

// Convert exec to promise-based
const execPromise = promisify(exec);

export async function POST(request) {
  try {
    // Get the FormData from the request
    const formData = await request.formData();
    const pdfFile = formData.get('pdfFile');
    const jobDescription = formData.get('jobDescription');
    
    if (!pdfFile) {
      return NextResponse.json(
        { error: 'No PDF file provided' },
        { status: 400 }
      );
    }

    if (!jobDescription) {
      return NextResponse.json(
        { error: 'No job description provided' },
        { status: 400 }
      );
    }

    // Convert the file to a Buffer
    const buffer = Buffer.from(await pdfFile.arrayBuffer());
    
    // Create a temp directory if it doesn't exist
    const tempDir = join(process.cwd(), 'temp');
    try {
      await writeFile(join(tempDir, 'resume.pdf'), buffer);
    } catch (error) {
      console.error('Error saving file:', error);
      // If directory doesn't exist, create it
      if (error.code === 'ENOENT') {
        const fs = require('fs');
        fs.mkdirSync(tempDir, { recursive: true });
        await writeFile(join(tempDir, 'resume.pdf'), buffer);
      } else {
        throw error;
      }
    }

    // Execute the Python script to process the PDF with the job description
    const result = await processPdf(join(tempDir, 'resume.pdf'), jobDescription);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF' },
      { status: 500 }
    );
  }
}

async function processPdf(pdfPath, jobDescription) {
  // Path to the Python script
  const scriptPath = join(process.cwd(), 'scripts', 'evaluate_resume.py');
  
  try {
    // Run the Python script with job description as an additional parameter
    // Escape the job description for command line
    const encodedJobDescription = Buffer.from(jobDescription).toString('base64');
    const { stdout, stderr } = await execPromise(
      `python ${scriptPath} "${pdfPath}" "${encodedJobDescription}"`
    );
    
    if (stderr) {
      console.error('Python script error:', stderr);
    }
    
    // Parse the JSON output from the Python script
    return JSON.parse(stdout);
  } catch (error) {
    console.error('Error executing Python script:', error);
    throw error;
  }
}