import type { Offer } from '../modules/offers/offers.entity';
import type { UserRole } from '../shared/constants/work-offer-values';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
      offer?: Offer;
    }
  }
}

export {};
