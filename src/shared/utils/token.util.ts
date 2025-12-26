import { randomBytes } from 'crypto';

export class TokenUtil {
  static generateInviteToken(): string {
    return randomBytes(32).toString('hex');
  }
}

