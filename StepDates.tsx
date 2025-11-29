import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { useBooking } from '../BookingWizard';
import { Calendar } from 'lucide-react';

export default function StepDates() {
  const { dates, update, goNext } = useBooking();
  const [openIn, setOpenIn] = useState(false);
  const [openOut, setOpenOut] = useState(false);
  const refIn = useRef<HTMLDivElement>(null);
  const refOut = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (refIn.current && !refIn.current.contains(e.target as Node)) setOpenIn(false);
      if (refOut.current && !refOut.current.contains(e.target as Node)) setOpenOut(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const disabled = useMemo(() => !(dates.checkIn && dates.checkOut && dates.nights > 0), [dates]);

  const base = new Date('2023-08-22T00:00:00');
  const todayBase = useMemo(() => { const t = new Date(); t.setHours(0,0,0,0); return t; }, []);

  function setCheckIn(d: Date | null) {
    const checkInIso = d ? d.toISOString() : null;
    let checkOutIso = dates.checkOut;
    if (d && (!dates.checkOut || new Date(dates.checkOut) <= d)) {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      checkOutIso = next.toISOString();
    }
    const nights = checkInIso && checkOutIso ? Math.max(0, (new Date(checkOutIso).getTime() - new Date(checkInIso).getTime())/(1000*60*60*24)) : 0;
    update({ dates: { checkIn: checkInIso, checkOut: checkOutIso, nights: Math.round(nights) } });
  }

  function setCheckOut(d: Date | null) {
    const checkOutIso = d ? d.toISOString() : null;
    const checkInIso = dates.checkIn;
    let nights = dates.nights;
    if (checkInIso && checkOutIso) {
      const ci = new Date(checkInIso);
      const co = new Date(checkOutIso);
      if (co <= ci) co.setDate(ci.getDate() + 1);
      nights = Math.max(0, (co.getTime() - ci.getTime())/(1000*60*60*24));
      update({ dates: { checkIn: ci.toISOString(), checkOut: co.toISOString(), nights: Math.round(nights) } });
    } else {
      update({ dates: { checkIn: checkInIso, checkOut: checkOutIso, nights: Math.round(nights||0) } });
    }
  }

  const controlClass = 'w-full inline-flex items-center justify-between bg-white text-gray-800 rounded-[5px] text-base px-[25px] py-[10px] border border-[#00488a]';
  const actionClass = `text-base rounded-[5px] px-[25px] py-[10px] ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#ffd126]'} bg-[#ffd126] text-[#00488a] font-semibold`;

  const checkInDate = dates.checkIn ? new Date(dates.checkIn) : null;
  const checkOutDate = dates.checkOut ? new Date(dates.checkOut) : null;
  const inPast  = checkInDate ? checkInDate < base : false;
  const outPast = checkOutDate ? checkOutDate < base : false;

  function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
  function isSameDay(a: Date, b: Date) { return startOfDay(a).getTime() === startOfDay(b).getTime(); }

  const disabledIn = useMemo(() => {
    const matchers: any[] = [ { before: todayBase } ];
    if (checkOutDate) {
      const co = startOfDay(checkOutDate);
      matchers.push((day: Date) => startOfDay(day) >= co);
    }
    return matchers;
  }, [todayBase, checkOutDate]);

  const disabledOut = useMemo(() => {
    const matchers: any[] = [ { before: todayBase } ];
    if (checkInDate) {
      const min = startOfDay(addDays(checkInDate, 1));
      matchers.push({ before: min });
    }
    return matchers;
  }, [todayBase, checkInDate]);

  return (
    <div className="rounded-[5px] border border-[#ffd126] p-4 bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative" ref={refIn}>
          <label className="block text-sm text-gray-700 mb-1">Check-in</label>
          <button type="button" onClick={() => setOpenIn((v) => !v)} className={controlClass}>
            <span className="inline-flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#00488a]" />
              <span className={inPast ? 'text-gray-500 line-through' : ''}>{dates.checkIn ? checkInDate!.toLocaleDateString() : 'Select date'}</span>
            </span>
          </button>
          {openIn && (
            <div className="absolute z-20 mt-2 bg-white border border-gray-200 rounded-[5px] shadow p-2 max-w-xs w-[calc(100vw-2rem)] sm:w-auto left-0">
              <DayPicker mode="single" selected={checkInDate || undefined} onSelect={(d) => { setCheckIn(d || null); }} disabled={disabledIn} />
            </div>
          )}
        </div>
        <div className="relative" ref={refOut}>
          <label className="block text-sm text-gray-700 mb-1">Check-out</label>
          <button type="button" onClick={() => setOpenOut((v) => !v)} className={controlClass}>
            <span className="inline-flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#00488a]" />
              <span className={outPast ? 'text-gray-500 line-through' : ''}>{dates.checkOut ? checkOutDate!.toLocaleDateString() : 'Select date'}</span>
            </span>
          </button>
          {openOut && (
            <div className="absolute z-20 mt-2 bg-white border border-gray-200 rounded-[5px] shadow p-2 max-w-xs w-[calc(100vw-2rem)] sm:w-auto left-0">
              <DayPicker mode="single" selected={checkOutDate || undefined} onSelect={(d) => { setCheckOut(d || null); }} disabled={disabledOut} />
            </div>
          )}
        </div>
      </div>

      {disabled && (
        <div className="mt-3 text-sm text-gray-600">Select both dates to continue.</div>
      )}

      <div className="flex flex-wrap justify-end gap-2 mt-4">
        <button className={actionClass + ' w-full sm:w-auto'} onClick={() => goNext()} disabled={disabled} aria-disabled={disabled}>Next ➜</button>
      </div>
    </div>
  );
}