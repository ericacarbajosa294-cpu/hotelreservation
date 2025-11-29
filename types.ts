export type RoomSel = { id: string; name: string; qty: number; price: number };
export type Dates = { checkIn: string | null; checkOut: string | null; nights: number };
export type Party = { adults: number; children: number };
export type Guest = { firstName: string; lastName: string; email: string; phone?: string; notes?: string; acceptTerms: boolean };
export type Totals = { subtotal: number; taxes: number; grandTotal: number };
export type BookingMeta = { branchId?: string; promoCode?: string };

export type BookingState = {
  step: 0 | 1 | 2 | 3;
  dates: Dates;
  party: Party;
  selection: { rooms: RoomSel[] };
  guest: Guest;
  totals: Totals;
  meta?: BookingMeta;
};

export type BookingContextValue = BookingState & {
  goNext: () => void;
  goBack: () => void;
  goTo: (step: number) => void;
  update: (partial: Partial<BookingState>) => void;
};