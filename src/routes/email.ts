import express from 'express'
import nodemailer from 'nodemailer'
import rateLimit from 'express-rate-limit'

const router = express.Router()

// More restrictive rate limiting for email endpoint
const emailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 emails per 15 minutes
    message: {
        error: 'Too many emails sent from this IP, please try again later.',
        retryAfter: '15 minutes'
    }
})

// Email configuration
const createTransporter = () => {
    // For Gmail/Google Workspace
    if (process.env.EMAIL_SERVICE === 'gmail') {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS // Use App Password for Gmail
            }
        })
    }

    // For custom SMTP (like ProtonMail, Outlook, etc.)
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    })
}

interface FeedbackRequest {
    name: string
    email: string
    type: string
    subject: string
    message: string
}

// Send feedback email
router.post('/feedback', emailLimiter, async (req, res) => {
    try {
        const { name, email, type, subject, message }: FeedbackRequest =
            req.body

        // Validate required fields
        if (!name || !email || !type || !subject || !message) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            })
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email address'
            })
        }

        // Check if email configuration is available
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error('Email configuration missing')
            return res.status(500).json({
                success: false,
                error: 'Email service not configured'
            })
        }

        const transporter = createTransporter()

        // Email content
        const emailSubject = `[EV Ranger ${type}] ${subject}`
        const emailBody = `
Name: ${name}
Email: ${email}
Type: ${type}

Message:
${message}

---
Sent from EV Ranger Feedback Form
IP: ${req.ip}
User Agent: ${req.get('User-Agent')}
Timestamp: ${new Date().toISOString()}
        `.trim()

        const mailOptions = {
            from: `"EV Ranger Feedback" <${process.env.EMAIL_USER}>`,
            to: process.env.FEEDBACK_EMAIL || 'customerservice@evranger.io',
            replyTo: email,
            subject: emailSubject,
            text: emailBody,
            html: `
                <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6;">
                    <div style="background: linear-gradient(135deg, #4ECCA3, #44A08D); padding: 20px; border-radius: 8px 8px 0 0;">
                        <h2 style="color: white; margin: 0;">EV Ranger Feedback</h2>
                    </div>
                    <div style="background: white; padding: 20px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 8px 8px;">
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                            <p style="margin: 5px 0;"><strong>Name:</strong> ${name}</p>
                            <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                            <p style="margin: 5px 0;"><strong>Type:</strong> <span style="background: #4ECCA3; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${type}</span></p>
                        </div>
                        
                        <h3 style="color: #333; margin-bottom: 10px;">Subject</h3>
                        <p style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-bottom: 20px;">${subject}</p>
                        
                        <h3 style="color: #333; margin-bottom: 10px;">Message</h3>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; white-space: pre-wrap;">${message}</div>
                        
                        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e5e5;">
                        <p style="color: #666; font-size: 12px; margin: 0;">
                            Sent from EV Ranger Feedback Form<br>
                            ${new Date().toLocaleString()}
                        </p>
                    </div>
                </div>
            `
        }

        // Send email
        await transporter.sendMail(mailOptions)

        console.log(
            `Feedback email sent from ${email} (${name}) - ${type}: ${subject}`
        )

        res.json({
            success: true,
            message: 'Feedback sent successfully'
        })
    } catch (error) {
        console.error('Error sending feedback email:', error)
        res.status(500).json({
            success: false,
            error: 'Failed to send feedback'
        })
    }
})

// Test email endpoint (for development)
router.post('/test', async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Not found' })
    }

    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            return res.status(500).json({
                success: false,
                error: 'Email configuration missing'
            })
        }

        const transporter = createTransporter()

        // Verify transporter configuration
        await transporter.verify()

        res.json({
            success: true,
            message: 'Email configuration is valid'
        })
    } catch (error) {
        console.error('Email test failed:', error)
        res.status(500).json({
            success: false,
            error: 'Email configuration invalid',
            details: error instanceof Error ? error.message : 'Unknown error'
        })
    }
})

export { router as emailRouter }
