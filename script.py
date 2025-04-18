import sys
import json
import fitz  # PyMuPDF
import requests
import base64
import re
from pymongo import MongoClient  # Add this import

# Add MongoDB connection function
def get_mongo_connection():
    # Use environment variables in production
    mongodb_uri = "mongodb://localhost:27017/"  # Replace with your connection string
    client = MongoClient(mongodb_uri)
    db = client["resumatch"]
    return db

def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    text = "\n".join(page.get_text() for page in doc)
    return text

def clean_json_response(response):
    """Clean the response from Ollama to ensure it's valid JSON"""
    # Remove any markdown code blocks
    response = re.sub(r'```(?:json)?\s*', '', response)
    response = re.sub(r'```\s*$', '', response)
    
    # Try to extract just the JSON part if there's any text before or after
    json_match = re.search(r'(\{.*\})', response, re.DOTALL)
    if json_match:
        response = json_match.group(1)
    
    return response.strip()

def main():
    # Check if PDF path is provided
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Invalid arguments. Need PDF path and job description"}))
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    # Decode the base64 encoded job description
    encoded_job_description = sys.argv[2]
    job_description = base64.b64decode(encoded_job_description).decode('utf-8')
    
    try:
        # Extract text from PDF
        pdf_text = extract_text_from_pdf(pdf_path)
        
        # Create prompt for Ollama
        prompt = f'''
        text: `{pdf_text}`
        The given text is extracted from a PDF document, which is a resume. Your task is to identify the different sections present in the resume and structure the information in a JSON format.

        - The **keys** of the JSON object should be the section names (e.g., "Personal Information", "Education", "Work Experience", "Skills", "Projects", etc.).
        - The **values** should be the corresponding content of each section.
        - If a section contains multiple entries (e.g., multiple jobs in "Work Experience" or multiple degrees in "Education"), store the values as an array.
        - Ensure that all relevant sections are captured.
        - **Do not** include any additional text, explanations, or comments—only return a valid JSON object.
        '''
        
        # Get structured resume data from Ollama
        resume_response = query_ollama("llama3.2", prompt)
        resume_data = clean_json_response(resume_response)
        
        # Use the job description from user input
        
        # Get evaluation from Ollama
        evaluation_prompt = f"""
        You are given a job description and a candidate's resume in structured JSON format.

        Job Description:
        {job_description}

        Resume JSON:
        {resume_data}

        Evaluate how suitable this candidate is for the job and provide a JSON response with the following structure:
        {{
            "overallMatch": <percentage_match>,
            "summary": "<brief_evaluation>",
            "skillMatch": {{
                "<skill1>": <percentage_match>,
                "<skill2>": <percentage_match>,
                ...
            }},
            "strengths": ["<strength1>", "<strength2>", ...],
            "weaknesses": ["<weakness1>", "<weakness2>", ...],
            "recommendations": ["<recommendation1>", "<recommendation2>", ...]
        }}

        Your response should contain ONLY the JSON object without any markdown formatting, code blocks, backticks, or additional text.
        First key of the json object should be "Personal Information" which contains an object of 2 keys "Name" and "Email".
        values of these keys should be name and email from that particular Resume JSON. Start the json object with "Personal Information"
        only, you just cannot miss out "Personal Information" in the json object. because the json object that you are generating is direcly
        given to another program to send mails with their name. for this process name and email is very important. if you dont include name
        and email then all the work that you are doing will be wasted.
        """
        
        evaluation_response = query_ollama("evaluator", evaluation_prompt)
        cleaned_evaluation = clean_json_response(evaluation_response)
        
        # Parse the evaluation to JSON
        evaluation_json = json.loads(cleaned_evaluation)
        
        # Store resume data in MongoDB
        try:
            store_resume_data(evaluation_json, job_description, pdf_path)
        except Exception as db_error:
            # Log the error but continue with the normal flow
            print(f"DB storage error: {str(db_error)}", file=sys.stderr)
        
        # Print the evaluation result to stdout - this maintains existing functionality
        print(cleaned_evaluation)
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

def store_resume_data(evaluation_data, job_description, pdf_path):
    """Store the resume evaluation data in MongoDB"""
    try:
        db = get_mongo_connection()
        resume_collection = db["resume_evaluations"]
        
        # Extract name and email for easier querying
        personal_info = evaluation_data.get("Personal Information", {})
        name = personal_info.get("Name", "Unknown")
        email = personal_info.get("Email", "Unknown")
        
        # Extract overall match score
        overall_match = evaluation_data.get("overallMatch", 0)
        
        # Create document to store
        document = {
            "name": name,
            "email": email,
            "overall_match": overall_match,
            "job_description": job_description,
            "pdf_filename": pdf_path.split("/")[-1],  # Just the filename
            "full_evaluation": evaluation_data  # Store the complete evaluation
        }
        
        # Insert document
        resume_collection.insert_one(document)
        
    except Exception as e:
        # Raise the exception but it will be caught in the main function
        # and won't disrupt the normal flow
        raise Exception(f"Failed to store in MongoDB: {str(e)}")

def query_ollama(model, prompt):
    url = "http://localhost:11434/api/generate"
    
    data = {
        "model": model,
        "prompt": prompt,
        "stream": False
    }
    
    response = requests.post(url, json=data)
    
    if response.status_code == 200:
        response_text = response.json()["response"]
        # Debug output removed from final version
        return response_text
    else:
        raise Exception(f"Ollama API error: {response.status_code}, {response.text}")

if __name__ == "__main__":
    main()