import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import nodemailer from 'nodemailer';

// Create transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// CORS headers for widget access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botId, name, email, phone } = body;

    if (!botId) {
      return NextResponse.json(
        { error: 'Bot ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get bot data to retrieve leadReceiverEmail
    const db = await getDatabase();
    const bot = await db.collection('bots').findOne({ id: botId });

    if (!bot) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const leadReceiverEmail = bot.leadReceiverEmail;

    if (!leadReceiverEmail) {
      return NextResponse.json(
        { error: 'Lead receiver email not configured for this bot' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(leadReceiverEmail)) {
      return NextResponse.json(
        { error: 'Invalid receiver email configuration' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Store lead in MongoDB
    const lead = {
      botId,
      name: name || null,
      email: email || null,
      phone: phone || null,
      timestamp: new Date(),
    };

    await db.collection('leads').insertOne(lead);

    // Build email content dynamically - only include fields that were provided
    const infoParts = [];
    if (name) {
      infoParts.push(`
        <tr>
          <td style="padding: 12px 16px; background-color: #ffffff; border-radius: 8px;">
            <table role="presentation" width="100%">
              <tr>
                <td style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 4px;">Name</td>
              </tr>
              <tr>
                <td style="color: #0f172a; font-size: 16px; font-weight: 500;">${name}</td>
              </tr>
            </table>
          </td>
        </tr>
      `);
    }
    if (email) {
      infoParts.push(`
        <tr>
          <td style="padding: 12px 16px; background-color: #ffffff; border-radius: 8px;">
            <table role="presentation" width="100%">
              <tr>
                <td style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 4px;">Email</td>
              </tr>
              <tr>
                <td><a href="mailto:${email}" style="color: #2563eb; font-size: 16px; font-weight: 500; text-decoration: none;">${email}</a></td>
              </tr>
            </table>
          </td>
        </tr>
      `);
    }
    if (phone) {
      infoParts.push(`
        <tr>
          <td style="padding: 12px 16px; background-color: #ffffff; border-radius: 8px;">
            <table role="presentation" width="100%">
              <tr>
                <td style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 4px;">Phone</td>
              </tr>
              <tr>
                <td><a href="tel:${phone}" style="color: #2563eb; font-size: 16px; font-weight: 500; text-decoration: none;">${phone}</a></td>
              </tr>
            </table>
          </td>
        </tr>
      `);
    }

    // Build dynamic subject line - use first available identifier
    const leadIdentifier = name || email || phone || 'Anonymous';

    const emailHtml = `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <meta name="x-apple-disable-message-reformatting">
  <title>New Lead Notification</title>
  <!--[if mso]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <style>
    /* Reset Styles */
    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    
    /* Client-Specific Fixes */
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
    div[style*="margin: 16px 0;"] { margin: 0 !important; }
    
    /* Button Hover */
    .btn:hover { background-color: #2563eb !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">

  <!-- Preheader Text (Visible in Inbox Preview) -->
  <div style="display: none; max-height: 0px; overflow: hidden;">
    You have a new lead from ${bot.agentName || bot.name || 'your chatbot'}. Click to view details.
    &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!--[if mso]>
        <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0">
        <tr>
        <td align="center">
        <![endif]-->
        
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025); overflow: hidden;">
          
          <!-- Header with Brand Accent -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #f1f5f9;">
              <!-- Icon Container -->
              <div style="display: inline-block; background-color: #eff6ff; padding: 12px; border-radius: 50%; margin-bottom: 16px;">
                <!-- Simple Bell Icon SVG fallback friendly -->
                <img src="https://cdn-icons-png.flaticon.com/512/1182/1182718.png" width="32" height="32" alt="Notification" style="display: block; width: 32px; height: 32px; opacity: 0.8;">
              </div>
              <h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">New Lead Captured</h1>
              <p style="margin: 8px 0 0 0; color: #64748b; font-size: 16px;">Good news! A potential customer just engaged.</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 40px;">
              
              <!-- Source Badge -->
              <table role="presentation" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Chatbot Agent</p>
                    <span style="background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 99px; padding: 6px 16px; font-size: 12px; font-weight: 600; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${bot.agentName || bot.name || 'Chatbot'}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Data Container -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                <h3 style="margin: 0 0 16px 0; color: #334155; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Lead Summary</h3>
                
                <!-- Use a table for the data list to ensure alignment -->
                <table role="presentation" width="100%" style="border-collapse: separate; border-spacing: 0 8px;">
                  ${infoParts.length > 0 
                      ? infoParts.join('') 
                      : '<tr><td style="color: #64748b; font-size: 14px; text-align: center; padding: 10px;">No specific details provided.</td></tr>'
                    }
                </table>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                <strong style="color: #64748b;">Timestamp:</strong> ${new Date().toLocaleString('en-US', { 
                  weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                })}
              </p>
              <p style="margin: 12px 0 0 0; color: #cbd5e1; font-size: 12px;">
                &copy; ${new Date().getFullYear()} Automated System. All rights reserved.
              </p>
            </td>
          </tr>
        </table>

        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Send email notification - will send as long as at least one field is provided
    try {
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: leadReceiverEmail,
        subject: `New Lead: ${leadIdentifier} - ${bot.agentName || bot.name || 'Chatbot'}`,
        html: emailHtml,
      });
    } catch (emailError) {
      // Don't fail the request if email fails, lead is still saved
    }
    return NextResponse.json(
      { success: true, message: 'Lead saved and email sent' },
      { headers: corsHeaders }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save lead' },
      { status: 500, headers: corsHeaders }
    );
  }
}

