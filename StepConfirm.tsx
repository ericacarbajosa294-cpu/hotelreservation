import React, { useState } from 'react';
import { useBooking } from '../BookingWizard';

declare const NHSA_PUBLIC: undefined | { ajax: string; nonce: string; settings?: any };

export default function StepConfirm() {
  const { dates, party, selection, totals, goBack, meta, guest } = useBooking() as any;
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const nights = dates.nights || 0;
  const paypalEnabled = !!(NHSA_PUBLIC as any)?.settings?.paypalEnabled;
  const paymentMethod = (NHSA_PUBLIC as any)?.settings?.paymentMethod || 'branch';
  const urlParams = new URLSearchParams((typeof window!=='undefined' ? window.location.search : ''));
  const paidNow = urlParams.get('payment') === 'success';
  const confirmDisabled = !!busy || (paypalEnabled && paymentMethod==='online' && !paidNow);

  async function confirm() {
    try {
      setBusy(true); setErr(null);
      const metaPayload = { ...(meta||{}), payment: paidNow ? 'paid' : 'unpaid' };
      const body = new URLSearchParams({
        action: 'nhsa_create_booking',
        nonce: (window as any).NHSA_PUBLIC?.nonce || '',
        booking: JSON.stringify({ dates, party, selection, totals, meta: metaPayload, guest })
      });
      const res = await fetch((window as any).NHSA_PUBLIC?.ajax || '', { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body });
      const json = await res.json();
      if (!json?.success) { throw new Error(json?.data?.message || json?.message || 'Error'); }
      const code = json.data?.booking_code || json.data?.ref || ('NH-' + json.data?.id);
      setOk(code);
      try { localStorage.removeItem('nhsa_booking_draft'); } catch {}
      // Delay reload by 60s to avoid reusing cached state
      setTimeout(() => { window.location.reload(); }, 60000);
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function startPaypal(){
    try {
      const ref = (guest?.email || 'GUEST') + '-' + Date.now();
      const amount = totals?.grandTotal || 0;
      const back = window.location.href.split('#')[0];
      const body = new URLSearchParams({ action: 'nhsa_paypal_start', nonce: (window as any).NHSA_PUBLIC?.nonce || '', amount: String(amount), ref, back });
      const res = await fetch((window as any).NHSA_PUBLIC?.ajax || '', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
      const json = await res.json();
      if (!json?.success || !json?.data?.approvalUrl) { throw new Error(json?.data?.message || json?.message || 'Could not start PayPal'); }
      window.location.href = json.data.approvalUrl;
    } catch(e:any) {
      alert(e?.message || 'Could not start PayPal');
    }
  }

  const btnSecondary = 'h-10 rounded-[5px] px-[25px] py-[10px] text-base bg-white text-[#00488a] hover:bg-[#ffd126]/10 whitespace-nowrap';
  const btnPrimary = 'h-10 rounded-[5px] px-[25px] py-[10px] text-base bg-[#ffd126] text-[#00488a] font-semibold hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#ffd126] whitespace-nowrap';

  return (
    <div className="rounded-[5px] border border-[#ffd126] p-4 bg-white">
      <div className="mb-3 text-lg font-semibold">Confirm</div>
      <div className="space-y-2 text-gray-800">
        <div className="flex justify-between"><span>Dates</span><span>{dates.checkIn ? new Date(dates.checkIn).toLocaleDateString() : '-'} → {dates.checkOut ? new Date(dates.checkOut).toLocaleDateString() : '-'}</span></div>
        <div className="flex justify-between"><span>Nights</span><span>{nights}</span></div>
        <div className="flex justify-between"><span>Party</span><span>{party.adults} adults{party.children ? `, ${party.children} children` : ''}</span></div>
        <div className="border-t my-2"></div>
        {selection.rooms.map((r) => (
          <div key={r.id} className="flex justify-between"><span>{r.name} × {r.qty}</span><span>₱{(r.price * r.qty * nights).toLocaleString()}</span></div>
        ))}
        <div className="border-t my-2"></div>
        <div className="flex justify-between"><span>Subtotal</span><span>₱{totals.subtotal.toLocaleString()}</span></div>
        <div className="flex justify-between"><span>Taxes (12%)</span><span>₱{totals.taxes.toLocaleString()}</span></div>
        <div className="flex justify-between font-semibold"><span>Total</span><span>₱{totals.grandTotal.toLocaleString()}</span></div>
        {paypalEnabled && paymentMethod==='online' && (
          <div className="mt-2">
            <button type="button" className="h-10 rounded-[5px] px-[25px] py-[10px] text-base bg-[#003087] text-white hover:opacity-90" onClick={startPaypal}>Pay with PayPal</button>
          </div>
        )}
        {paidNow && (
          <div className="mt-2 p-3 rounded-[5px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">Payment successful. Please click Confirm Booking to finalize your reservation.</div>
        )}
        {paymentMethod==='branch' && (
          <div className="mt-2 p-3 rounded-[5px] bg-slate-50 border border-slate-200 text-slate-700 text-sm">Payment will be collected at the hotel branch during check-in.</div>
        )}
        {ok && (
          <div className="mt-3 p-3 rounded-[5px] bg-emerald-50 border border-emerald-200 text-emerald-800">
            <div className="font-semibold">Booking confirmed</div>
            <div className="text-sm">Your booking code:</div>
            <div className="text-lg font-bold tracking-wider">{ok}</div>
            <div className="text-xs text-emerald-700 mt-1">Please present this code at check-in as your reference.</div>
          </div>
        )}
      </div>
      {err && <div className="mt-2 text-sm text-red-600">{err}</div>}

      {/* Bottom action bar */}
      <div className="mt-4 flex flex-wrap gap-2 justify-end">
        {ok ? (
          <>
            <button className={btnSecondary + ' w-full sm:w-auto'} onClick={() => window.print()}>Print</button>
            <button className="h-10 rounded-[5px] px-[25px] py-[10px] text-base bg-[#00488a] text-[#fefefd] hover:opacity-90 w-full sm:w-auto" onClick={() => window.location.reload()}>Start New Booking</button>
          </>
        ) : (
          <>
            <button className={btnSecondary + ' w-full sm:w-auto'} onClick={goBack}>◀ Back</button>
            <button className={btnPrimary + ' w-full sm:w-auto'} onClick={confirm} disabled={confirmDisabled} aria-disabled={confirmDisabled}>{busy ? 'Confirming…' : 'Confirm Booking'}</button>
          </>
        )}
      </div>
    </div>
  );
}