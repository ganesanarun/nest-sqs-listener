export interface CustomerConfig {
  customerId: string;
  tier: 'premium' | 'standard' | 'trial';
  rateLimit: number;
  features: string[];
  priority: 'high' | 'normal' | 'low';
}
