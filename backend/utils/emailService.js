const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback json transport for development/local testing
  return nodemailer.createTransport({
    jsonTransport: true,
  });
};

exports.sendStatusUpdateEmail = async ({
  to,
  ticketId,
  timestamp,
  campus,
  room,
  category,
  newStatus,
  adminNote,
}) => {
  try {
    const transporter = createTransporter();

    // Strictly formal, plain text only - no HTML fluff, no emojis
    const textContent = `Ticket: ${ticketId} Date: ${timestamp} Location: ${campus} - ${room} Concern: ${category}
Status Update: ${newStatus} Admin Remarks: ${adminNote || 'None'}
This is an automated system message. Do not reply.`;

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"TIPped System" <noreply@tipped.edu>',
      to,
      subject: `TIPPED Status Update: ${ticketId}`,
      text: textContent,
    });

    console.log(`[Nodemailer] Status update email dispatched for ${ticketId} to ${to}`);
    return info;
  } catch (error) {
    console.error('[Nodemailer Error]:', error.message);
  }
};
