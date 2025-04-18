# scripts/send_emails.py
import json
import os
import sys
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get email configuration from environment variables
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USER = os.getenv('EMAIL_USER')
EMAIL_PASSWORD = os.getenv('EMAIL_PASSWORD')
EMAIL_FROM = os.getenv('EMAIL_FROM', EMAIL_USER)
EMAIL_REPLY_TO = os.getenv('EMAIL_REPLY_TO', EMAIL_FROM)

def create_email_template(candidate_name, job_description):
    """
    Create email content for a candidate
    """
    subject = "Your Resume Matches Our Job Requirements"
    
    # Create HTML version of the email
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background-color: #f8f9fa; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; }}
            .footer {{ background-color: #f8f9fa; padding: 10px; text-align: center; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>Congratulations, {candidate_name}!</h2>
            </div>
            <div class="content">
                <p>We are pleased to inform you that your resume has been identified as a strong match for our current job opening.</p>
                
                <p>Our automated resume screening system has determined that your qualifications align well with the requirements for this position.</p>
                
                <h3>Job Description Summary:</h3>
                <p>{job_description[:300]}{'...' if len(job_description) > 300 else ''}</p>
                
                <p>We would like to invite you to the next stage of our recruitment process. Our hiring team will contact you shortly with more details.</p>
                
                <p>If you have any questions in the meantime, please don't hesitate to reply to this email.</p>
                
                <p>Best regards,<br>
                The Recruiting Team</p>
            </div>
            <div class="footer">
                <p>This is an automated message. Please do not reply directly to this email.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Create plain text version of the email
    text_content = f"""
    Congratulations, {candidate_name}!
    
    We are pleased to inform you that your resume has been identified as a strong match for our current job opening.
    
    Our automated resume screening system has determined that your qualifications align well with the requirements for this position.
    
    Job Description Summary:
    {job_description[:300]}{'...' if len(job_description) > 300 else ''}
    
    We would like to invite you to the next stage of our recruitment process. Our hiring team will contact you shortly with more details.
    
    If you have any questions in the meantime, please don't hesitate to reply to this email.
    
    Best regards,
    The Recruiting Team
    
    This is an automated message. Please do not reply directly to this email.
    """
    
    return subject, html_content, text_content

def send_email(to_email, to_name, job_description):
    """
    Send an email to a candidate using SMTP
    """
    try:
        # Create message container
        msg = MIMEMultipart('alternative')
        subject, html_content, text_content = create_email_template(to_name, job_description)
        
        msg['Subject'] = subject
        msg['From'] = EMAIL_FROM
        msg['To'] = to_email
        msg['Reply-to'] = EMAIL_REPLY_TO
        
        # Attach parts
        part1 = MIMEText(text_content, 'plain')
        part2 = MIMEText(html_content, 'html')
        msg.attach(part1)
        msg.attach(part2)
        
        # Send email
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASSWORD)
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"Error sending email to {to_email}: {str(e)}", file=sys.stderr)
        return False

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'success': False, 'error': 'No data file provided'}))
        sys.exit(1)
    
    data_file = sys.argv[1]
    
    try:
        with open(data_file, 'r') as f:
            data = json.load(f)
        
        candidates = data.get('candidates', [])
        job_description = data.get('jobDescription', '')
        
        if not candidates:
            print(json.dumps({'success': False, 'error': 'No candidates provided'}))
            sys.exit(1)
            
        if not EMAIL_USER or not EMAIL_PASSWORD:
            print(json.dumps({'success': False, 'error': 'Email configuration not set up properly'}))
            sys.exit(1)
            
        sent_count = 0
        failed_count = 0
        
        for candidate in candidates:
            if 'email' in candidate and 'name' in candidate:
                success = send_email(
                    candidate['email'],
                    candidate['name'],
                    job_description
                )
                if success:
                    sent_count += 1
                else:
                    failed_count += 1
        
        print(json.dumps({
            'success': True,
            'sentCount': sent_count,
            'failedCount': failed_count,
            'totalCandidates': len(candidates)
        }))
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()