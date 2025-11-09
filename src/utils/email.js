import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
export const sendMail = async ({ to, subject, html }) => {
  const msg = {
    to,
    from: 'machinetowerbnb@gmail.com', // Must be a verified sender in SendGrid
    subject,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Email sent successfully to ${to}`);
  } catch (error) {
    console.error('❌ SendGrid API Email Error:', error);
    throw error;
  }
};

