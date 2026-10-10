/**
 * Core Brevo HTTP Client Engine
 * Dispatches verification, password reset, and notification emails via Brevo API
 */
const sendEmailViaBrevo = async (userEmail, subject, htmlContent) => {
  try {
    const apiKey = process.env.BREVO_API_KEY;

    // Helper: Print any verification/reset URL in the console for instant 1-click testing
    const urlMatch = htmlContent.match(/href="([^"]+)"/i);
    if (urlMatch && urlMatch[1]) {
      console.log(`🔗 [DEV ACTION LINK]: ${urlMatch[1]}`);
    }

    if (!apiKey) {
      console.warn('⚠️ BREVO_API_KEY is not set in environment. Email dispatch skipped.');
      return null;
    }

    const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@clinic.et';
    const senderName = process.env.BREVO_SENDER_NAME || 'Ethiopian Clinic System';

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        sender: { 
          name: senderName, 
          email: senderEmail 
        },
        to: [{ email: userEmail }],
        subject: subject,
        htmlContent: htmlContent
      })
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('❌ Brevo API Error:', result.message || result);
      return null;
    }
    
    console.log(`📧 Brevo Email Dispatched successfully! ID: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`❌ Brevo API Error: ${error.message}`);
    return null;
  }
};

export default sendEmailViaBrevo;