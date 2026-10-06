import { Injectable, Logger } from '@nestjs/common';
import { IMeeshoCredentials } from '../interfaces/meesho.interfaces';

@Injectable()
export class MeeshoAuthService {
  private readonly logger = new Logger(MeeshoAuthService.name);

  validateCredentials(credentials: IMeeshoCredentials): boolean {
    if (!credentials.supplierId || !credentials.apiKey || !credentials.apiSecret) {
      this.logger.error('Invalid Meesho credentials');
      return false;
    }
    return true;
  }

  generateAuthHeaders(credentials: IMeeshoCredentials): Record<string, string> {
    const timestamp = Date.now().toString();
    const signature = this.generateSignature(
      credentials.apiKey,
      credentials.apiSecret,
      timestamp,
    );

    return {
      'X-Supplier-Id': credentials.supplierId,
      'X-Api-Key': credentials.apiKey,
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private generateSignature(
    apiKey: string,
    apiSecret: string,
    timestamp: string,
  ): string {
    const crypto = require('crypto');
    const message = `${apiKey}:${timestamp}`;
    return crypto
      .createHmac('sha256', apiSecret)
      .update(message)
      .digest('hex');
  }

  verifyWebhookSignature(
    payload: string,
    signature: string,
    apiSecret: string,
  ): boolean {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', apiSecret)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  }
}
