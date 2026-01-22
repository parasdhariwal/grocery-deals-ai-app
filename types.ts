
export interface Offer {
  id: string;
  merchant: string;
  category: string;
  deal: string; 
  price: string;
  originalPrice?: string;
  description: string;
  code?: string;
  expiry: string;
  image: string;
  clipped: boolean;
  usageInfo?: string;
}

export interface Purchase {
  id: string;
  item: string;
  merchant: string;
  date: string;
  price: string;
  category: string;
}

export type Sender = 'user' | 'system';

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  offers?: Offer[];
  timestamp: Date;
  isGuardrail?: boolean;
  suggestedAlternatives?: string[];
}

export interface UserProfile {
  clippedOfferIds: string[];
}
