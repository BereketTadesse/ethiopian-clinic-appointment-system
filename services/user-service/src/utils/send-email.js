/**
 * Core Brevo HTTP Client Engine
 * Dispatches any subject and HTML layout injected by controllers
 */
const sendEmailViaBrevo = async (userEmail, subject, htmlContent) => {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': process.env.BREVO_API_KEY, 
      },
      body: JSON.stringify({
        sender: { 
          name: "Ethiopian Clinic System", 
          email: process.env.BREVO_SENDER_EMAIL 
        },
        to: [{ email: userEmail }],
        subject: subject, // 👈 Dynamically set by controller
        htmlContent: htmlContent // 👈 Injected layout body string from controller
      })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Brevo rejection');
    
    console.log(`📧 Brevo Email Dispatched successfully! ID: ${result.messageId}`);
  } catch (error) {
    console.error(`❌ Brevo API Error: ${error.message}`);
  }
};

export default sendEmailViaBrevo;