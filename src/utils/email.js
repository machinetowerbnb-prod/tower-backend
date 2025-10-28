import axios from "axios";

export async function sendMail({ to, subject, html }) {
  try {
    console.log("📤 Sending via Resend API...");
    console.log("FROM:", process.env.EMAIL_FROM);
    console.log("TO:", to);

    const response = await axios.post(
      "https://api.resend.com/emails",
      {
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.SMTP_PASS}`,
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10s safety
      }
    );

    console.log("✅ Email sent:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Resend API error:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else if (error.request) {
      console.error("No response from server.");
    } else {
      console.error("Message:", error.message);
    }
    throw error;
  }
}
