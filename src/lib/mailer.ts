import "server-only";
import nodemailer from "nodemailer";

type Mail = { to: string; subject: string; text: string; replyTo?: string };
export type MailResult = "SENT" | "FAILED" | "SKIPPED";

/**
 * Sends through Resend when RESEND_API_KEY is set, otherwise SMTP when
 * SMTP_HOST is set. With neither, the message is written to the server log
 * and reported as SKIPPED so the admin can see notifications are not live.
 */
export async function sendMail(mail: Mail): Promise<MailResult> {
  const from = process.env.MAIL_FROM || "MEILLEUR Website <onboarding@resend.dev>";
  try {
    if (process.env.RESEND_API_KEY) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text, reply_to: mail.replyTo }),
      });
      if (!res.ok) throw new Error(`Resend responded ${res.status}`);
      return "SENT";
    }
    if (process.env.SMTP_HOST) {
      const port = Number(process.env.SMTP_PORT || 587);
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
      });
      await transport.sendMail({ from, to: mail.to, subject: mail.subject, text: mail.text, replyTo: mail.replyTo });
      return "SENT";
    }
    console.info(`[mail:not-configured] to=${mail.to} subject="${mail.subject}"\n${mail.text}`);
    return "SKIPPED";
  } catch (error) {
    console.error("[mail:failed]", mail.subject, error instanceof Error ? error.message : error);
    return "FAILED";
  }
}

export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST);
}
