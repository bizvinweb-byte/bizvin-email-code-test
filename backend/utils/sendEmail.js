import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Smart Universal Email Sender
 * ✅ Gmail inbox friendly
 * ✅ Outlook inbox/header friendly
 * ✅ Auto detect recipient domain
 * ✅ Different config for Gmail / Outlook
 */

// Transporter Cache to reuse connections for bulk sending
const transporterCache = new Map();

const getTransporter = (config) => {
    const cacheKey = `${config.email}-${config.host}-${config.port}`;
    if (transporterCache.has(cacheKey)) {
        return transporterCache.get(cacheKey);
    }

    const transporter = nodemailer.createTransport({
        host: config.host || "smtp.gmail.com",
        port: config.port || 465,
        secure: true,
        pool: true, // Use pooling for bulk sending
        maxConnections: 5,
        maxMessages: 100,
        auth: {
            user: config.email,
            pass: config.appPassword
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 60000
    });

    transporterCache.set(cacheKey, transporter);
    return transporter;
};

const sendEmail = async ({
    to,
    subject,
    html,
    text,
    replyTo,
    fromName,
    fromEmail,
    attachments = [],
    emailConfig
}) => {
    if (!emailConfig || !emailConfig.email || !emailConfig.appPassword) {
        throw new Error("Email configuration required.");
    }

    try {
        const smtpEmail = emailConfig.email;
        const smtpHost = emailConfig.host || "smtp.gmail.com";

        const transporter = getTransporter(emailConfig);

        // Extract recipient email
        const cleanToEmail =
            typeof to === "string" && to.includes("<")
                ? to.match(/<([^>]+)>/)?.[1]
                : to;

        const recipient = cleanToEmail.toLowerCase();

        const isOutlook =
            recipient.includes("outlook.") ||
            recipient.includes("hotmail.") ||
            recipient.includes("live.") ||
            recipient.includes("msn.");

        const displayName = fromName || "Shashi";

        const plainText =
            text ||
            html
                .replace(/<[^>]*>?/gm, " ")
                .replace(/\s+/g, " ")
                .trim()
                .substring(0, 1200);

        const domain = smtpHost.split(".").slice(-2).join(".");
        const randomHex = Math.floor(Math.random() * 0xffffffff)
            .toString(16)
            .toUpperCase();

        const messageId = `<${randomHex}.${Date.now()}@mail.${domain}>`;

        let mailOptions = {};

        /**
         * ===============================
         * OUTLOOK USERS
         * ===============================
         * Better header rendering
         */
        if (isOutlook) {
            mailOptions = {
                from: `"${displayName}" <${fromEmail}>`,
                to,
                subject,
                html,
                text: plainText,
                replyTo: replyTo || fromEmail,
                attachments,

                envelope: {
                    from: smtpEmail,
                    to: cleanToEmail
                },

                headers: {
                    "X-Mailer": "Microsoft Outlook 16.0",
                    "X-Priority": "3",
                    Importance: "Normal",
                    "List-Unsubscribe": `<mailto:${smtpEmail}?subject=unsubscribe>`
                }
            };
        }

        /**
         * ===============================
         * GMAIL USERS
         * ===============================
         * Better inbox delivery
         */
        else {
            mailOptions = {
                from:
                    fromEmail && fromEmail !== smtpEmail
                        ? `"${displayName}" <${fromEmail}>`
                        : `"${displayName}" <${smtpEmail}>`,

                sender: smtpEmail,
                to,
                subject,
                html,
                text: plainText,
                replyTo: replyTo || fromEmail || smtpEmail,
                attachments,
                messageId,
                date: new Date(),

                envelope: {
                    from: smtpEmail,
                    to: cleanToEmail
                },

                headers: {
                    "X-Mailer": "Microsoft Outlook 16.0",
                    "X-Priority": "3",
                    Priority: "normal",
                    Importance: "Normal",
                    Precedence: "bulk",
                    "List-Unsubscribe": `<mailto:${smtpEmail}?subject=unsubscribe>`,
                    "X-Auto-Response-Suppress": "All",
                    "Auto-Submitted": "auto-generated",
                    "X-Sender": smtpEmail,
                    "MIME-Version": "1.0"
                }
            };
        }

        const result = await transporter.sendMail(mailOptions);
        
        // Note: In pooled mode, we don't close the transporter after every mail
        // transporter.close(); 

        console.log(`✅ Email Sent to ${cleanToEmail}:`, result.messageId);
        return result;
    } catch (error) {
        console.error(`❌ Email Error for ${cleanToEmail || to}:`, error);
        throw new Error(`Email to ${cleanToEmail || to} failed: ${error.message}`);
    }
};

export default sendEmail;