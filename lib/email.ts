import nodemailer from "nodemailer";

export function getMailer() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set");
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendInvoiceEmail(opts: {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
}) {
  const transporter = getMailer();
  const from = process.env.GMAIL_USER!;
  await transporter.sendMail({
    from,
    to: opts.to.join(", "),
    cc: opts.cc?.join(", "),
    bcc: from, // always send yourself a copy of every invoice email
    subject: opts.subject,
    text: opts.body,
    attachments: [{ filename: opts.pdfFilename, content: opts.pdfBuffer }],
  });
}
