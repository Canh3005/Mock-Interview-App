export type PackageId = 'starter' | 'standard' | 'pro' | 'elite';
export type PaymentMethod = 'momo' | 'vnpay';

export interface CreditPackage {
  id: PackageId;
  name: string;
  credits: number;
  priceVnd: number;
  badge: 'popular' | 'save23' | 'save33' | null;
}

export const CREDIT_PACKAGES: Record<PackageId, CreditPackage> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    credits: 10,
    priceVnd: 49_000,
    badge: null,
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    credits: 30,
    priceVnd: 129_000,
    badge: 'popular',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    credits: 100,
    priceVnd: 379_000,
    badge: 'save23',
  },
  elite: {
    id: 'elite',
    name: 'Elite',
    credits: 300,
    priceVnd: 990_000,
    badge: 'save33',
  },
};

export const PACKAGE_IDS: PackageId[] = ['starter', 'standard', 'pro', 'elite'];
export const PAYMENT_METHODS: PaymentMethod[] = ['momo', 'vnpay'];
export const ORDER_EXPIRY_MINUTES = 15;

export const PAYMENT_RECOVERY_QUEUE = 'payment-recovery';

export const PaymentRecoveryJobName = {
  SCAN: 'scan-stale-orders',
} as const;
