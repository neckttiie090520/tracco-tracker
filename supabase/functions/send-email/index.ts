import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  subject: string
  template: string
  data: any
  priority?: 'high' | 'normal' | 'low'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { to, subject, template, data, priority = 'normal' } = await req.json() as EmailRequest

    // Get email template
    const emailTemplate = getEmailTemplate(template, data)
    
    // Send email using Resend API
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Workshop Tracker <noreply@workshoptracker.cmu.ac.th>',
        to: [to],
        subject: subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      }),
    })

    const emailResult = await emailResponse.json()

    if (!emailResponse.ok) {
      throw new Error(`Email sending failed: ${emailResult.message}`)
    }

    // Log email activity
    await supabaseClient
      .from('email_logs')
      .insert({
        recipient: to,
        subject: subject,
        template: template,
        status: 'sent',
        provider_id: emailResult.id,
        metadata: { data, priority }
      })

    return new Response(
      JSON.stringify({ success: true, id: emailResult.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Email sending error:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

function getEmailTemplate(template: string, data: any) {
  const templates = {
    'workshop-registration': {
      html: generateRegistrationHTML(data),
      text: generateRegistrationText(data)
    },
    'workshop-reminder': {
      html: generateReminderHTML(data),
      text: generateReminderText(data)
    },
    'task-assigned': {
      html: generateTaskAssignedHTML(data),
      text: generateTaskAssignedText(data)
    },
    'task-due-reminder': {
      html: generateTaskDueHTML(data),
      text: generateTaskDueText(data)
    },
    'workshop-cancelled': {
      html: generateCancellationHTML(data),
      text: generateCancellationText(data)
    }
  }

  return templates[template as keyof typeof templates] || { html: '', text: '' }
}

function generateRegistrationHTML(data: any) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Workshop Registration Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .footer { padding: 20px; text-align: center; font-size: 14px; color: #666; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Registration Confirmed!</h1>
        </div>
        <div class="content">
          <h2>Hello ${data.userName},</h2>
          <p>You've successfully registered for <strong>${data.workshopTitle}</strong>.</p>
          <p><strong>Workshop Details:</strong></p>
          <ul>
            <li>Date: ${data.startDate}</li>
            <li>Time: ${data.startTime} - ${data.endTime}</li>
            <li>Instructor: ${data.instructorName}</li>
          </ul>
          <p>We'll send you a reminder before the workshop begins.</p>
          <a href="${data.workshopUrl}" class="button">View Workshop Details</a>
        </div>
        <div class="footer">
          <p>Workshop Tracker - Chiang Mai University</p>
          <p><a href="${data.unsubscribeUrl}">Unsubscribe</a></p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateRegistrationText(data: any) {
  return `
    Registration Confirmed!
    
    Hello ${data.userName},
    
    You've successfully registered for ${data.workshopTitle}.
    
    Workshop Details:
    - Date: ${data.startDate}
    - Time: ${data.startTime} - ${data.endTime}
    - Instructor: ${data.instructorName}
    
    We'll send you a reminder before the workshop begins.
    
    View workshop details: ${data.workshopUrl}
    
    Workshop Tracker - Chiang Mai University
    Unsubscribe: ${data.unsubscribeUrl}
  `
}

function generateReminderHTML(data: any) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Workshop Reminder</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .footer { padding: 20px; text-align: center; font-size: 14px; color: #666; }
        .button { display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
        .urgent { background: #dc2626; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Workshop Reminder</h1>
        </div>
        <div class="content">
          <h2>Hello ${data.userName},</h2>
          <p>This is a reminder that <strong>${data.workshopTitle}</strong> ${data.timeUntil}.</p>
          <p><strong>Workshop Details:</strong></p>
          <ul>
            <li>Date: ${data.startDate}</li>
            <li>Time: ${data.startTime} - ${data.endTime}</li>
            <li>Instructor: ${data.instructorName}</li>
          </ul>
          <p>Make sure you're prepared and have all necessary materials ready.</p>
          <a href="${data.workshopUrl}" class="button">Join Workshop</a>
        </div>
        <div class="footer">
          <p>Workshop Tracker - Chiang Mai University</p>
          <p><a href="${data.unsubscribeUrl}">Unsubscribe</a></p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateReminderText(data: any) {
  return `
    Workshop Reminder
    
    Hello ${data.userName},
    
    This is a reminder that ${data.workshopTitle} ${data.timeUntil}.
    
    Workshop Details:
    - Date: ${data.startDate}
    - Time: ${data.startTime} - ${data.endTime}
    - Instructor: ${data.instructorName}
    
    Make sure you're prepared and have all necessary materials ready.
    
    Join workshop: ${data.workshopUrl}
    
    Workshop Tracker - Chiang Mai University
    Unsubscribe: ${data.unsubscribeUrl}
  `
}

function generateTaskAssignedHTML(data: any) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Task Assigned</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #7c3aed; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .footer { padding: 20px; text-align: center; font-size: 14px; color: #666; }
        .button { display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Task Assigned</h1>
        </div>
        <div class="content">
          <h2>Hello ${data.userName},</h2>
          <p>A new task has been assigned for <strong>${data.workshopTitle}</strong>.</p>
          <p><strong>Task: ${data.taskTitle}</strong></p>
          <p>${data.taskDescription}</p>
          ${data.dueDate ? `<p><strong>Due Date:</strong> ${data.dueDate}</p>` : ''}
          <a href="${data.taskUrl}" class="button">View Task</a>
        </div>
        <div class="footer">
          <p>Workshop Tracker - Chiang Mai University</p>
          <p><a href="${data.unsubscribeUrl}">Unsubscribe</a></p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateTaskAssignedText(data: any) {
  return `
    New Task Assigned
    
    Hello ${data.userName},
    
    A new task has been assigned for ${data.workshopTitle}.
    
    Task: ${data.taskTitle}
    ${data.taskDescription}
    ${data.dueDate ? `Due Date: ${data.dueDate}` : ''}
    
    View task: ${data.taskUrl}
    
    Workshop Tracker - Chiang Mai University
    Unsubscribe: ${data.unsubscribeUrl}
  `
}

function generateTaskDueHTML(data: any) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Task Due Reminder</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .footer { padding: 20px; text-align: center; font-size: 14px; color: #666; }
        .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Task Due Soon!</h1>
        </div>
        <div class="content">
          <h2>Hello ${data.userName},</h2>
          <p><strong>${data.taskTitle}</strong> is due ${data.timeUntilDue}.</p>
          <p><strong>Workshop:</strong> ${data.workshopTitle}</p>
          <p><strong>Due Date:</strong> ${data.dueDate}</p>
          ${data.submissionStatus === 'not_submitted' ? 
            '<p style="color: #dc2626;"><strong>Status:</strong> Not yet submitted</p>' : 
            '<p style="color: #059669;"><strong>Status:</strong> Submitted</p>'
          }
          <a href="${data.taskUrl}" class="button">Submit Task</a>
        </div>
        <div class="footer">
          <p>Workshop Tracker - Chiang Mai University</p>
          <p><a href="${data.unsubscribeUrl}">Unsubscribe</a></p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateTaskDueText(data: any) {
  return `
    Task Due Soon!
    
    Hello ${data.userName},
    
    ${data.taskTitle} is due ${data.timeUntilDue}.
    
    Workshop: ${data.workshopTitle}
    Due Date: ${data.dueDate}
    Status: ${data.submissionStatus === 'not_submitted' ? 'Not yet submitted' : 'Submitted'}
    
    Submit task: ${data.taskUrl}
    
    Workshop Tracker - Chiang Mai University
    Unsubscribe: ${data.unsubscribeUrl}
  `
}

function generateCancellationHTML(data: any) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Workshop Cancelled</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .footer { padding: 20px; text-align: center; font-size: 14px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Workshop Cancelled</h1>
        </div>
        <div class="content">
          <h2>Hello ${data.userName},</h2>
          <p>We regret to inform you that <strong>${data.workshopTitle}</strong> has been cancelled.</p>
          ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
          ${data.rescheduleDate ? `<p><strong>Rescheduled to:</strong> ${data.rescheduleDate}</p>` : ''}
          <p>We apologize for any inconvenience this may cause.</p>
        </div>
        <div class="footer">
          <p>Workshop Tracker - Chiang Mai University</p>
          <p><a href="${data.unsubscribeUrl}">Unsubscribe</a></p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateCancellationText(data: any) {
  return `
    Workshop Cancelled
    
    Hello ${data.userName},
    
    We regret to inform you that ${data.workshopTitle} has been cancelled.
    
    ${data.reason ? `Reason: ${data.reason}` : ''}
    ${data.rescheduleDate ? `Rescheduled to: ${data.rescheduleDate}` : ''}
    
    We apologize for any inconvenience this may cause.
    
    Workshop Tracker - Chiang Mai University
    Unsubscribe: ${data.unsubscribeUrl}
  `
}