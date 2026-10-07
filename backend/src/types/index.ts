export interface QuoteLine {
  label: string;
  amount: number;
}

export interface ServiceQuote {
  serviceId: string;
  monthly: number;
  hourly: number;
  currency: 'USD';
  breakdown: QuoteLine[];
}

export interface RegionQuote {
  regionId: string;
  monthly: number | null;
  status: 'ok' | 'no-data';
}

export interface RegionQuotesResponse {
  currency: 'USD';
  quotes: RegionQuote[];
}