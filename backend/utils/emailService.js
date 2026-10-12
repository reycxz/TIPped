const nodemailer = require('nodemailer');

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatEmailLocation = (location) => {
  if (typeof location === 'string') {
    const text = location.trim() || 'T.I.P. Campus';
    return { text, html: escapeHtml(text) };
  }

  const values = location || {};
  const campus = String(values.campus ?? '').trim();
  const building = String(values.building ?? '').trim();
  const floor = values.floor !== undefined && values.floor !== null && String(values.floor).trim()
    ? `Floor ${String(values.floor).trim()}`
    : '';
  const rawRoom = String(values.room ?? '').trim();
  const isDefaultRoom = /^\s*common\s+area\s*$/i.test(rawRoom) ||
    /^\s*(?:(?:floor|flr)\s*)?\d+\s*[-–—:]\s*common\s+area\s*$/i.test(rawRoom);
  const room = rawRoom && !isDefaultRoom
    ? rawRoom
    : '';
  const landmark = String(values.landmark ?? '').trim();
  const normalizeLocation = (value) =>
    String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  let area = landmark;
  const campusName = campus.replace(/\s+Campus$/i, '');
  if (campusName) {
    const escapedCampus = campusName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    area = area.replace(
      new RegExp(`[,\\s]+${escapedCampus}(?:\\s+Campus)?[\\s.,;:]*$`, 'i'),
      '',
    );
  } else {
    area = area.replace(/[,\s]+(?:Casal|Arlegui)\s+Campus[\s.,;:]*$/i, '');
  }
  area = area.replace(/[,\s]+(?:Floor|Flr)\.?\s*\d+[\s.,;:]*$/i, '').replace(/[\s.,;:]+$/, '').trim();
  if (normalizeLocation(area) === normalizeLocation(building)) area = '';
  const locationDetail = area || room;
  const parts = [campus, building, floor, locationDetail].filter(Boolean);
  const text = parts.join(' · ') || 'T.I.P. Campus';
  const safeParts = parts.length ? parts.map(escapeHtml) : [escapeHtml('T.I.P. Campus')];
  const html = safeParts.join(' · ');

  return { text, html };
};

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
  location: customLocation,
}) => {
  try {
    const transporter = createTransporter();
    const resolvedLocation = formatEmailLocation(customLocation || { campus, room });
    const safeTicketId = escapeHtml(ticketId || '');
    const safeResolvedLocation = resolvedLocation.html;
    const safeCategory = escapeHtml(category || '');
    const safeNewStatus = escapeHtml(newStatus || '');
    const safeAdminNote = escapeHtml(adminNote || 'None');
    const safeTimestamp = escapeHtml(timestamp || '');

    const htmlContent = `
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 16px;">
        <tr>
          <td align="center" valign="top">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #CBD5E1; border-top: 4px solid #F59E0B; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);">
              <tr>
                <td style="padding: 32px 32px 24px 32px; text-align: center;">
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="center" style="padding-bottom: 24px;">
                        <img src="https://your-hosted-logo-url-here.png" alt="TIPped Logo" style="max-width: 120px; display: block;" />
                      </td>
                    </tr>
                  </table>
                  <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #0F172A; text-align: left;">
                    ${safeTicketId}
                  </h2>
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 20px; font-size: 14px; text-align: left;">
                    <tr>
                      <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #64748B; width: 35%; font-weight: 500;">Ticket</td>
                      <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #0F172A; font-weight: 600;">${safeTicketId}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #64748B; font-weight: 500;">Date</td>
                      <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #0F172A;">${safeTimestamp}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #64748B; font-weight: 500;">Location</td>
                      <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #0F172A;">${safeResolvedLocation}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #64748B; font-weight: 500;">Concern</td>
                      <td style="padding: 10px 14px; border-bottom: 1px solid #E2E8F0; color: #0F172A;">${safeCategory}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 14px; color: #64748B; font-weight: 500;">Status</td>
                      <td style="padding: 10px 14px; color: #F59E0B; font-weight: 700;">${safeNewStatus}</td>
                    </tr>
                  </table>
                  <div style="text-align: left; margin-bottom: 24px;">
                    <div style="font-size: 13px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
                      Admin Remarks:
                    </div>
                    <blockquote style="margin: 0; padding: 12px 16px; background-color: #F1F5F9; border-left: 4px solid #CBD5E1; border-radius: 4px; font-style: italic; color: #334155; font-size: 14px; line-height: 1.5;">
                      ${safeAdminNote}
                    </blockquote>
                  </div>
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #E2E8F0; margin-top: 24px;">
                    <tr>
                      <td align="center" style="padding-top: 16px; font-size: 12px; color: #94A3B8; text-align: center;">
                        This is an automated system message. Please do not reply.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    const textContent = `Ticket: ${ticketId} | Date: ${timestamp} | Location: ${resolvedLocation.text} | Concern: ${category}\nStatus Update: ${newStatus}\nAdmin Remarks: ${adminNote || 'None'}\nThis is an automated system message. Please do not reply.`;

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"TIPped System" <noreply@tipped.edu>',
      to,
      subject: `TIPPED Status Update: ${ticketId}`,
      html: htmlContent,
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

exports.sendGuestConfirmationEmail = async ({ to, category, campus, building, location }) => {
  try {
    const transporter = createTransporter();
    const resolvedLocation = formatEmailLocation(location || { campus, building });
    const safeCategory = escapeHtml(category || '');
    const safeResolvedLocation = resolvedLocation.html;

    const htmlContent = `
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 16px;">
        <tr>
          <td align="center" valign="top">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #CBD5E1; border-top: 4px solid #F59E0B; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);">
              <tr>
                <td style="padding: 32px 32px 24px 32px; text-align: center;">
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="center" style="padding-bottom: 24px;">
                        <img src="https://your-hosted-logo-url-here.png" alt="TIPped Logo" style="max-width: 120px; display: block;" />
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #1E293B; text-align: left;">
                    We have successfully received your report regarding <strong>${safeCategory}</strong> at <strong>${safeResolvedLocation}</strong>. Our team will review it shortly.
                  </p>
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #E2E8F0; margin-top: 24px;">
                    <tr>
                      <td align="center" style="padding-top: 16px; font-size: 12px; color: #94A3B8; text-align: center;">
                        This is an automated system message. Please do not reply.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `;

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"TIPped System" <noreply@tipped.edu>',
      to,
      subject: 'Report Received - TIPped',
      html: htmlContent,
      text: `We have successfully received your report regarding ${category} at ${resolvedLocation.text}. Our team will review it shortly.\n\nThis is an automated system message. Please do not reply.`,
    });

    console.log(`[Nodemailer] Guest confirmation email dispatched to ${to}`);
    return info;
  } catch {
    console.error('[Nodemailer Error] Guest confirmation failed');
  }
};
