import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';

export interface SendEmailEvent {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    // Initialize the transporter with Gmail configuration
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      secure: true,
      port: 465,
      auth: {
        user: this.configService.getOrThrow<string>('GMAIL_USER'),
        pass: this.configService.getOrThrow<string>('GMAIL_PASSWORD'),
      },
      requireTLS: true, // force STARTTLS
      family: 4, // Use IPv4, avoid IPv6 issues
      connectionTimeout: 60000, // 60s
      greetingTimeout: 90000, // 30s, avoid "greeting never received"
      socketTimeout: 60000,
    } as nodemailer.TransportOptions);
  }

  /**
   * Sends an email using the configured transporter.
   * @param to Recipient email address
   * @param subject Email subject
   * @param text Plain text content (optional)
   * @param html HTML content (optional)
   */
  async sendEmail(
    to: string,
    subject: string,
    text?: string,
    html?: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.configService.getOrThrow<string>('GMAIL_USER'),
        to,
        subject,
        text,
        html,
      });
      console.log(`Email sent to ${to}`);
    } catch (error) {
      console.error('Error sending email:', error);
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  /**
   * Handles the `send.email` event to send an email.
   * @param event The email event containing email details
   */
  @OnEvent('send.email')
  async handleSendEmailEvent(event: SendEmailEvent): Promise<void> {
    const { to, subject, text, html } = event;
    console.log(`Handling send.email event for ${to}`);
    await this.sendEmail(to, subject, text, html);
    console.log(`Email event processed for ${to}`);
  }
}
