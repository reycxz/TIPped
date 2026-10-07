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

// Constraint 3 & 4: Guest submission confirmation email
exports.sendGuestConfirmationEmail = async ({ to, category, campus, building }) => {
  try {
    const transporter = createTransporter();

    const htmlContent = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
        <h2 style="color:#f59e0b;margin-bottom:8px">TIPped</h2>
        <p>Hello,</p>
        <p>
          We have successfully received your report regarding
          <strong>${category}</strong> at <strong>${campus} &ndash; ${building}</strong>.
          Our team will review it shortly.
        </p>
        <p>Thank you for your submission!</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
        <p style="font-size:11px;color:#94a3b8">This is an automated message. Please do not reply.</p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"TIPped System" <noreply@tipped.edu>',
      to,
      subject: 'Report Received - TIPped',
      html: htmlContent,
    });

    console.log(`[Nodemailer] Guest confirmation email dispatched to ${to}`);
    return info;
  } catch (error) {
    console.error('[Nodemailer Error] Guest confirmation:', error.message);
  }
};
