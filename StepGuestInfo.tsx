import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useBooking } from '../BookingWizard';

const Schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional(),
  notes: z.string().optional(),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept terms' }) }),
});

type FormData = z.infer<typeof Schema>;

export default function StepGuestInfo() {
  const { guest, update, goBack, goNext, party } = useBooking();
  const { register, handleSubmit, formState: { errors, isValid }, watch } = useForm<FormData>({
    resolver: zodResolver(Schema),
    mode: 'onChange',
    defaultValues: { firstName: guest.firstName || '', lastName: guest.lastName || '', email: guest.email || '', phone: guest.phone || '', notes: guest.notes || '', acceptTerms: !!guest.acceptTerms },
  });

  useEffect(() => {
    const sub = watch((v) => update({ guest: { ...guest, ...v } }));
    return () => sub.unsubscribe();
  }, [watch, update, guest]);

  const inputClass = 'w-full bg-white text-gray-800 rounded-[5px] text-base px-[25px] py-[10px] focus:ring-2 focus:ring-[#ffd126]';
  const btnSecondary = 'h-10 rounded-[5px] px-[25px] py-[10px] text-base bg-white text-[#00488a] hover:bg-[#ffd126]/10 whitespace-nowrap';
  const btnPrimary = 'h-10 rounded-[5px] px-[25px] py-[10px] text-base bg-[#ffd126] text-[#00488a] font-semibold hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#ffd126] whitespace-nowrap';

  return (
    <form className="rounded-[5px] border border-[#ffd126] p-4 space-y-4 bg-white" onSubmit={handleSubmit(() => goNext())}>
      <div className="text-lg font-semibold">Guest Info</div>

      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-700 mb-1">First Name</label>
          <input {...register('firstName')} className={inputClass} aria-invalid={!!errors.firstName} />
          {errors.firstName && <div className="text-sm text-red-600 mt-1">{errors.firstName.message}</div>}
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Last Name</label>
          <input {...register('lastName')} className={inputClass} aria-invalid={!!errors.lastName} />
          {errors.lastName && <div className="text-sm text-red-600 mt-1">{errors.lastName.message}</div>}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Email</label>
          <input type="email" {...register('email')} className={inputClass} aria-invalid={!!errors.email} />
          {errors.email && <div className="text-sm text-red-600 mt-1">{errors.email.message}</div>}
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Phone (optional)</label>
          <input {...register('phone')} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="block text-sm text-gray-700 mb-1">Notes</label>
        <textarea {...register('notes')} rows={3} className="w-full bg-white text-gray-800 rounded-[5px] text-base px-[25px] py-[10px] focus:ring-2 focus:ring-[#ffd126]" />
      </div>

      <div className="flex items-start gap-3">
        <input id="acceptTerms" type="checkbox" {...register('acceptTerms')} className="mt-1 h-5 w-5 rounded-[4px] border border-gray-300 text-[#00488a] focus:ring-2 focus:ring-[#ffd126] checked:bg-[#00488a] checked:border-[#00488a]" aria-invalid={!!errors.acceptTerms} />
        <label htmlFor="acceptTerms" className="text-sm text-gray-700 select-none">I agree to the terms and privacy policy</label>
      </div>
      {errors.acceptTerms && <div className="text-sm text-red-600">{errors.acceptTerms.message as string}</div>}

      {/* Bottom controls */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-6">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Adults</label>
            <select className="bg-white text-gray-800 rounded-[5px] text-base px-[25px] py-[10px]" value={party.adults} onChange={(e)=>update({ party: { ...party, adults: Math.max(1, Math.min(6, parseInt(e.target.value, 10) || 1)) } })}>
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Children</label>
            <select className="bg-white text-gray-800 rounded-[5px] text-base px-[25px] py-[10px]" value={party.children} onChange={(e)=>update({ party: { ...party, children: Math.max(0, Math.min(6, parseInt(e.target.value, 10) || 0)) } })}>
              {[0,1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button type="button" className={btnSecondary + ' w-full sm:w-auto'} onClick={goBack}>◀ Back</button>
          <button type="submit" className={btnPrimary + ' w-full sm:w-auto'} disabled={!isValid} aria-disabled={!isValid}>Next ➜</button>
        </div>
      </div>
    </form>
  );
}