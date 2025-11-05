import nodemailer from "nodemailer";

export const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export const NO_REPLY_ADDRESS = `"Editframe 🎞️" <${process.env.EMAIL_SENDER}>`;
