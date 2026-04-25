import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { OrdersService } from 'src/orders/orders.service';
import { PaystackService } from './paystack.service';

@Controller()
export class PaystackController {
  constructor(
    private readonly paystackService: PaystackService,
    private readonly ordersService: OrdersService,
  ) {}

  private renderStatusPage(options: {
    title: string;
    heading: string;
    description: string;
    accentColor: string;
    state: 'cancelled' | 'success' | 'failed';
  }) {
    const { title, heading, description, accentColor, state } = options;

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      :root {
        color-scheme: light dark;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top, rgba(37, 99, 235, 0.12), transparent 40%),
          #f8fafc;
        font-family: Arial, sans-serif;
        color: #0f172a;
      }
      .card {
        width: min(92vw, 420px);
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.96);
        border: 1px solid rgba(15, 23, 42, 0.08);
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
        padding: 32px 24px;
        text-align: center;
      }
      .badge {
        width: 64px;
        height: 64px;
        border-radius: 999px;
        margin: 0 auto 20px;
        display: grid;
        place-items: center;
        background: ${accentColor}22;
        color: ${accentColor};
        font-size: 28px;
        font-weight: 700;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 28px;
      }
      p {
        margin: 0;
        color: #475569;
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <div class="badge">${state === 'success' ? '✓' : state === 'cancelled' ? '×' : '!'}</div>
      <h1>${heading}</h1>
      <p>${description}</p>
    </main>
    <script>
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(${JSON.stringify(state)});
      }
    </script>
  </body>
</html>`;
  }

  @Get('cancel')
  renderCancelPage(@Res() response: Response) {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.send(
      this.renderStatusPage({
        title: 'Checkout cancelled',
        heading: 'Checkout cancelled',
        description:
          'No payment was confirmed. You can return to the app and continue whenever you are ready.',
        accentColor: '#F59E0B',
        state: 'cancelled',
      }),
    );
  }

  @Get('success')
  renderSuccessPage(@Res() response: Response) {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.send(
      this.renderStatusPage({
        title: 'Payment successful',
        heading: 'Payment received',
        description:
          'Your payment has been confirmed and the order is now held in escrow.',
        accentColor: '#10B981',
        state: 'success',
      }),
    );
  }

  @Get('paystack/callback')
  async handleCallback(
    @Query('reference') reference: string | undefined,
    @Res() response: Response,
  ) {
    if (!reference) {
      throw new BadRequestException('Payment reference is required');
    }

    const result = await this.ordersService.verifyPayment(reference);

    if (result.verified || result.finalStatus === 'PAID_IN_ESCROW') {
      return response.redirect(`/success?orderId=${result.orderId ?? ''}`);
    }

    return response.redirect(
      `/cancel?reference=${encodeURIComponent(reference)}`,
    );
  }

  @Post('paystack/webhook')
  async handleWebhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('x-paystack-signature') signature: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const rawBody =
      request.rawBody ?? Buffer.from(JSON.stringify(body ?? {}), 'utf8');

    if (!this.paystackService.isValidWebhookSignature(rawBody, signature)) {
      throw new BadRequestException('Invalid Paystack signature');
    }

    if (body.event !== 'charge.success') {
      return { received: true, ignored: true };
    }

    const data =
      body.data && typeof body.data === 'object'
        ? (body.data as Record<string, unknown>)
        : null;
    const reference =
      typeof data?.reference === 'string' ? data.reference : undefined;

    if (!reference) {
      throw new BadRequestException('Webhook payload is missing a reference');
    }

    await this.ordersService.verifyPayment(reference);

    return { received: true };
  }
}
