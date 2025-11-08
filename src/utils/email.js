import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  secure: false,
  auth: {
    user: 'apikey', // literally this
    pass: process.env.SENDGRID_API_KEY, // from your .env
  },
});

export const sendMail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from:'"Machine Tower" <machinetowerbnb@gmail.com>',
      to,
      subject,
      html,
    });
    console.log(`✅ Email sent successfully to ${to}`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};
