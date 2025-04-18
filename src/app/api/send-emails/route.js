// src/app/api/send-emails/route.js
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execPromise = promisify(exec);

export async function POST(request) {
  try {
    const body = await request.json();
    const { candidates, jobDescription } = body;
    
    if (!candidates || candidates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No candidates provided' },
        { status: 400 }
      );
    }
    
    // Create a temporary JSON file to pass data to the Python script
    const tempDataPath = path.join(process.cwd(), 'temp', 'email_data.json');
    await fs.writeFile(tempDataPath, JSON.stringify({ candidates, jobDescription }));
    
    // Path to your Python script
    const scriptPath = path.join(process.cwd(), 'scripts', 'send_emails.py');
    
    // Execute the Python script
    const { stdout, stderr } = await execPromise(`python ${scriptPath} ${tempDataPath}`);
    
    if (stderr) {
      console.error('Python script error:', stderr);
      return NextResponse.json(
        { success: false, error: stderr },
        { status: 500 }
      );
    }
    
    // Parse the results from Python
    const results = JSON.parse(stdout);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error sending emails:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}