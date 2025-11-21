import pLimit from "p-limit";
import { sendMail } from "../utils/email.js";

export const sendBulkEmails = async (req, res) => {
  try {
    const { emails, subject, html } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: "Emails array is required",
      });
    }

    // Limit concurrency to avoid SendGrid rate limiting
    const limit = pLimit(5); // send 10 emails at a time

    const jobs = emails.map(email =>
      limit(() =>
        sendMail({
          to: email,
          subject,
          html,
        })
      )
    );

    // Wait for all emails to finish
    await Promise.allSettled(jobs);

    return res.json({
      statusCode: 200,
      message: "Bulk emails processed successfully",
    });

  } catch (err) {
    console.error("Bulk email error:", err);
    return res.status(500).json({
      statusCode: 500,
      message: "Internal Server Error",
    });
  }
};
