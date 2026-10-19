export type ProductType = 'LOUNGE' | 'FAST_TRACK';
export type FlightScope = 'DOMESTIC' | 'INTERNATIONAL';
export type Direction = 'DEPARTURE' | 'ARRIVAL';
export type PaxType = 'ADULT' | 'CHILD' | 'INFANT';

export interface Airport {
  code: string;
  name: string;
  city: string;
}

export interface Product {
  id: string;
  type: ProductType;
  airportCode: string;
  terminal: string;
  scope: FlightScope;
  direction: Direction;
  name: string;
  shortDescription: string;
  description: string;
  amenities: string[];
  imageUrl: string | null;
  openingHours: string | null;
  maxStayHours: number | null;
  currency: string;
  priceAdult: number;
  priceChild: number;
  priceInfant: number;
  leadTimeHours: number;
  freeCancelHours: number;
  instantConfirm: boolean;
  airport: Airport;
}

export interface OrderItem {
  id: string;
  status: string;
  flightNumber: string;
  serviceTime: string;
  adults: number;
  children: number;
  infants: number;
  amount: number;
  voucherCode: string | null;
  failureReason: string | null;
  passengers: { fullName: string; type: PaxType }[];
  product: {
    id: string;
    type: ProductType;
    name: string;
    airportCode: string;
    terminal: string;
    direction: Direction;
    openingHours: string | null;
    maxStayHours: number | null;
    freeCancelHours: number;
  };
}

export interface Order {
  code: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  refundAmount: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  expiresAt: string;
  paidAt: string | null;
  createdAt: string;
  paymentUrl?: string | null;
  items: OrderItem[];
}

export interface Session {
  user: { id: string; name?: string; phone?: string; email?: string };
  partner: { code: string; name: string; primaryColor: string; logoUrl: string | null };
}
