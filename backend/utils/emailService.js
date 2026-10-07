const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
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

    // Strictly formal, plain text only - standardized template from specification
    const textContent = `Ticket: ${ticketId} | Date: ${timestamp} | Location: ${campus} - ${room} | Concern: ${category}
Status Update: ${newStatus}
Admin Remarks: ${adminNote || 'None'}
This is an automated system message. Do not reply.`;

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"TIPped System" <noreply@tipped.edu>',
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

exports.sendRegistrationOtpEmail = async (to, otp) => {
  try {
    const transporter = createTransporter();
    const textContent = `Your 6-digit verification code is: ${otp}\n\nPlease enter this code to complete your registration. This code will expire in 10 minutes.`;

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"TIPped System" <noreply@tipped.edu>',
      to,
      subject: 'TIPPED Registration - Verification Code',
      text: textContent,
    });

    console.log(`[Nodemailer] Registration verification OTP dispatched to ${to}`);
    return info;
  } catch (error) {
    console.error('[Nodemailer Error]:', error.message);
  }
};
