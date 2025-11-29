import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import StepIndicator from './StepIndicator';
import StepDates from './steps/StepDates';
import StepRoomsRates from './steps/StepRoomsRates';
import StepGuestInfo from './steps/StepGuestInfo';
import StepConfirm from './steps/StepConfirm';
import type { BookingContextValue, BookingState } from '../types';

declare const NHSA_PUBLIC: undefined | { ajax: string; nonce: string; settings?: any };

const DRAFT_KEY = 'nhsa_booking_draft';

const defaultState: BookingState = {
  step: 0,
  dates: { checkIn: null, checkOut: null, nights: 0 },
  party: { adults: 2, children: 0 },
  selection: { rooms: [] },
  guest: { firstName: '', lastName: '', email: '', phone: '', notes: '', acceptTerms: false },
  totals: { subtotal: 0, taxes: 0, grandTotal: 0 },
  meta: { branchId: '', promoCode: '' },
};

const Ctx = createContext<BookingContextValue | null>(null);
export const useBooking = () => { const ctx = useContext(Ctx); if (!ctx) throw new Error('useBooking must be used within BookingWizard'); return ctx; };

export default function BookingWizard() {
  const s = (typeof NHSA_PUBLIC !== 'undefined' && NHSA_PUBLIC?.settings) ? NHSA_PUBLIC.settings : undefined;
  const taxRate = typeof s?.taxRate === 'number' ? s.taxRate : 12;
  const defaultBranch = typeof s?.defaultBranch === 'string' ? s.defaultBranch : '';

  const [state, setState] = useState<BookingState>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const base = raw ? { ...defaultState, ...JSON.parse(raw) } : defaultState;
      if (!base.meta?.branchId && defaultBranch) base.meta = { ...(base.meta||{}), branchId: defaultBranch };
      return base;
    } catch { return defaultState; }
  });

  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state)); } catch {} }, [state]);

  useEffect(() => {
		const hotels = (window as any).NHSA_PUBLIC?.hotels || [];
		if (Array.isArray(hotels) && hotels.length === 1) {
			const onlyId = String(hotels[0]?.id || '');
			if (onlyId && state.meta.branchId !== onlyId) {
				setState((s) => ({ ...s, meta: { ...(s.meta||{}), branchId: onlyId }, selection: { rooms: [] } }));
				return;
			}
		}
		if (defaultBranch && state.meta.branchId !== String(defaultBranch)) {
			setState((s) => ({
				...s,
				meta: { ...(s.meta || {}), branchId: String(defaultBranch) },
				selection: { rooms: [] },
			}));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [defaultBranch]);

  const updateTotals = (draft: BookingState) => {
    const nights = draft.dates.nights || 0;
    const subtotal = draft.selection.rooms.reduce((sum, r) => sum + r.price * r.qty * nights, 0);
    const taxes = Math.round(subtotal * (taxRate/100));
    draft.totals = { subtotal, taxes, grandTotal: subtotal + taxes };
  };

  const ctx = useMemo<BookingContextValue>(() => ({
    ...state,
    goNext: () => setState((s) => ({ ...s, step: Math.min(3, s.step + 1) })),
    goBack: () => setState((s) => ({ ...s, step: Math.max(0, s.step - 1) })),
    goTo: (step: number) => setState((s) => ({ ...s, step: Math.max(0, Math.min(3, step)) })),
    update: (partial: Partial<BookingState>) => setState((s) => { const merged = { ...s, ...partial } as BookingState; updateTotals(merged); return merged; }),
  }), [state, taxRate]);

  return (
    <Ctx.Provider value={ctx}>
      <div className="bg-white text-gray-900">
        <div className="max-w-3xl mx-auto p-4 md:p-6">
          <div className="rounded-[5px] border border-[#ffd126] bg-white text-gray-800 shadow">
            <div className="bg-white text-gray-900 rounded-t-[5px]">
              <StepIndicator />
            </div>
            <div className="p-4 md:p-6 space-y-4">
              {state.step === 0 && <StepDates />}
              {state.step === 1 && <StepRoomsRates />}
              {state.step === 2 && <StepGuestInfo />}
              {state.step === 3 && <StepConfirm />}
            </div>
          </div>
        </div>
      </div>
    </Ctx.Provider>
  );
}