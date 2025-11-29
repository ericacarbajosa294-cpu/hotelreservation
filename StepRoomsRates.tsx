import React, { useEffect, useMemo, useState } from 'react';
import { useBooking } from '../BookingWizard';

type ApiRoom = { id:number; number:string; room_type:string; status:string; price?:number; description?:string };

type UiRoomType = { id:string; name:string; description:string; price:number };

export default function StepRoomsRates() {
  const { selection, update, goNext, goBack, dates, meta } = useBooking() as any;
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState<UiRoomType[]>([]);
	const [stockByType, setStockByType] = useState<Record<string, number>>({});
  const [showDetails, setShowDetails] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const body = new URLSearchParams({ action: 'nhsa_rooms_for', nonce: (window as any).NHSA_PUBLIC?.nonce || '', hotel_id: String(meta?.branchId||'') });
        const res = await fetch((window as any).NHSA_PUBLIC?.ajax || '', { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body });
        const json = await res.json();
        const rooms: ApiRoom[] = json?.data?.rooms || [];
        // Group by room_type -> choose first non-empty description and average or first price
        const byType: Record<string, { name:string; description:string; price:number }>= {} as any;
        const stock: Record<string, number> = {};
        rooms.forEach(r => {
          const key = String(r.room_type||'').toLowerCase();
          const name = key ? key.charAt(0).toUpperCase()+key.slice(1) : 'Room';
          const prev = byType[key];
          const price = typeof r.price === 'number' && !isNaN(r.price) ? r.price : 0;
          const desc = (r.description || '').trim();
          if (!prev) {
            byType[key] = { name, description: desc, price };
          } else {
            if (!prev.description && desc) prev.description = desc;
            if (!prev.price && price) prev.price = price;
          }
          if ((r.status||'available') === 'available') { stock[key] = (stock[key]||0) + 1; }
        });
        const ui: UiRoomType[] = Object.entries(byType)
			.filter(([k]) => (stock[k]||0) > 0)
			.map(([k,v]) => ({ id:k||'room', name:v.name, description:v.description||'', price: v.price||0 }));
        if (!cancelled) { setAvailable(ui); setStockByType(stock); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [meta?.branchId, dates.checkIn, dates.checkOut, dates.nights]);

  const rooms = selection.rooms.length ? selection.rooms : available.map((r) => ({ id: r.id, name: r.name, qty: 0, price: r.price }));
  const nights = dates.nights || 0;
  const canNext = useMemo(() => rooms.some((r) => r.qty > 0), [rooms]);

  function setQty(id: string, qty: number) {
		const max = Object.prototype.hasOwnProperty.call(stockByType, id) ? (stockByType[id] ?? 0) : Number.POSITIVE_INFINITY;
		const clamped = Math.max(0, Math.min(max, qty));
		const next = rooms.map((r) => (r.id === id ? { ...r, qty: clamped } : r));
		update({ selection: { rooms: next } });
	}

  const btnCtl = 'h-10 rounded-[5px] px-[25px] py-[10px] text-base bg-white text-gray-800';

	const hotels = (window as any).NHSA_PUBLIC?.hotels || [];
	const multiHotels = Array.isArray(hotels) && hotels.length > 1;
	const hotelName = useMemo(() => {
		const id = String((meta?.branchId||''));
		const h = hotels.find((x: any) => String(x.id) === id);
		return h ? h.name : '';
	}, [hotels, meta?.branchId]);

  return (
    <div className="rounded-[5px] border border-[#ffd126] p-4 space-y-3 bg-white">
      <h3 className="text-lg font-semibold">Availability</h3>
      {multiHotels ? (
			<div className="flex items-end gap-2">
				<div className="min-w-[220px]">
					<label className="block text-sm text-gray-700 mb-1">Hotel Branch</label>
					<select className="w-full bg-white text-gray-800 rounded-[5px] text-base px-[25px] py-[10px] border border-gray-300 focus:ring-2 focus:ring-[#ffd126]" value={String(meta?.branchId||'')} onChange={(e)=>update({ meta: { ...(meta||{}), branchId: e.target.value }, selection: { rooms: [] } })}>
						<option value="">Select a hotel</option>
						{hotels.map((h: any)=> (<option key={h.id} value={String(h.id)}>{h.name}</option>))}
					</select>
				</div>
			</div>
		) : (
			(hotelName && <div className="text-sm text-gray-600">Hotel: {hotelName}</div>)
		)}
      {loading ? (
        <div className="p-3 rounded-[5px] bg-white border border-gray-200 text-gray-700">Checking availability…</div>
      ) : (
        <>
          {available.length === 0 ? (
            <div className="p-3 rounded-[5px] bg-white border border-gray-200 text-gray-700">No rooms available for the selected dates.</div>
          ) : (
            <div className="grid gap-3">
              {available.map((r) => {
                const qty = rooms.find((x: any) => x.id === r.id)?.qty || 0;
                return (
                  <section key={r.id} aria-labelledby={`room-${r.id}`} className="rounded-[5px] border border-[#ffd126] p-3 transition hover:shadow-md bg-white">
                    <div id={`room-${r.id}`} className="font-medium text-gray-900">{r.name}</div>
                    <div className="text-sm text-gray-600">{r.description}</div>
                    <div className="text-xs text-gray-500 mt-1">{Object.prototype.hasOwnProperty.call(stockByType, r.id) ? `${r.name}: ${Math.max(0, stockByType[r.id] || 0)} rooms left` : ''}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-gray-800">₱{(r.price||0).toLocaleString()} / night</div>
                      <div className="flex items-center gap-2" aria-label={`Select quantity for ${r.name}`}>
                        <button className="h-10 rounded-[5px] px-[12px] py-[8px] text-sm bg-white text-gray-800 border border-gray-300" onClick={async()=>{
                          setShowDetails(true);
                          setDetails(null);
                          setDetailsLoading(true);
                          try {
                            const body = new URLSearchParams({ action: 'nhsa_room_type_details', nonce: (window as any).NHSA_PUBLIC?.nonce || '', slug: r.id });
                            const res = await fetch((window as any).NHSA_PUBLIC?.ajax || '', { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded' }, body });
                            const json = await res.json();
                            if (json?.success) { setDetails(json.data?.room_type||null); }
                          } finally { setDetailsLoading(false); }
                        }}>See Details</button>
                        <button className={btnCtl} onClick={() => setQty(r.id, Math.max(0, qty - 1))} aria-label={`Decrease ${r.name}`}>−</button>
                        <span className="min-w-[2rem] text-center text-gray-800">{qty}</span>
                        <button className={btnCtl + (Object.prototype.hasOwnProperty.call(stockByType, r.id) && qty >= (stockByType[r.id]||0) ? ' opacity-50 cursor-not-allowed' : '')} onClick={() => setQty(r.id, qty + 1)} aria-label={`Increase ${r.name}`} disabled={Object.prototype.hasOwnProperty.call(stockByType, r.id) && qty >= (stockByType[r.id]||0)}>＋</button>
                      </div>
                    </div>
                    {qty > 0 && (
                      <div className="mt-1 text-sm text-gray-700">Line: ₱{((r.price||0) * qty * nights).toLocaleString()}</div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap justify-between gap-2 mt-2">
            <button className="h-10 rounded-[5px] px-[25px] py-[10px] text-base bg-white text-[#00488a] hover:bg-[#ffd126]/10 w-full sm:w-auto" onClick={goBack}>◀ Back</button>
            <button className="h-10 rounded-[5px] px-[25px] py-[10px] text-base bg-[#ffd126] text-[#00488a] font-semibold hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#ffd126] w-full sm:w-auto" onClick={goNext} disabled={!canNext} aria-disabled={!canNext}>Next ➜</button>
          </div>

          {showDetails && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-[5px] shadow p-4 w-full max-w-2xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">Room Details</h3>
                  <button className="text-slate-500" onClick={()=>setShowDetails(false)}>✕</button>
                </div>
                {detailsLoading ? (
                  <div className="p-3 rounded-[5px] bg-white border border-gray-200 text-gray-700">Loading…</div>
                ) : details ? (
                  <div className="space-y-3">
                    <div className="text-xl font-semibold text-gray-900">{details.name}</div>
                    <div className="text-gray-700 whitespace-pre-line">{details.description||''}</div>
                    {Array.isArray(details.images) && details.images.length>0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {details.images.map((u: string, i: number)=> (
                          <img key={`${u}-${i}`} src={u} alt="Room image" className="w-full h-32 object-cover rounded" />
                        ))}
                      </div>
                    )}
                    {Array.isArray(details.amenities) && details.amenities.length>0 && (
                      <div>
                        <div className="font-medium text-gray-900 mb-1">Amenities</div>
                        <ul className="list-disc list-inside text-gray-800 space-y-0.5">
                          {details.amenities.map((a: string, i: number)=> (<li key={`${a}-${i}`}>{a}</li>))}
                        </ul>
                      </div>
                    )}
                    {typeof details.price === 'number' && details.price>0 && (
                      <div className="text-gray-900">Default price: ₱{Number(details.price).toLocaleString()} / night</div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-[5px] bg-white border border-gray-200 text-gray-700">Details not available.</div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}