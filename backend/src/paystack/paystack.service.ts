import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { createHmac, timingSafeEqual } from 'node:crypto';

type InitializeTransactionParams = {
  amount: number;
  email: string;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
};

export type PaystackVerifiedTransaction = {
  id: number;
  status: string;
  reference: string;
  amount: number;
  paid_at?: string | null;
  paidAt?: string | null;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class PaystackService {
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';
  private readonly axiosInstance: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.getOrThrow<string>(
      'PAYSTACK_SECRET_KEY',
    );
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async initializeTransaction({
    amount,
    email,
    reference,
    callbackUrl,
    metadata,
  }: InitializeTransactionParams): Promise<{
    authorizationUrl: string;
    reference: string;
  }> {
    const response = await this.axiosInstance.post('/transaction/initialize', {
      email,
      amount: Math.round(amount * 100),
      reference,
      callback_url: callbackUrl,
			metadata,
			currency: 'NGN',
    });

    const { authorization_url, reference: initializedReference } =
      response.data.data;

    return {
      authorizationUrl: authorization_url,
      reference: initializedReference,
    };
  }

  async verifyTransaction(
    reference: string,
  ): Promise<PaystackVerifiedTransaction> {
    const response = await this.axiosInstance.get(
      `/transaction/verify/${reference}`,
    );

    return response.data.data;
  }

  isValidWebhookSignature(
    rawBody: Buffer | string,
    signature?: string | string[],
  ) {
    if (!signature || Array.isArray(signature)) {
      return false;
    }

    const digest = createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex');

    try {
      return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
    } catch {
      return false;
    }
  }
}
