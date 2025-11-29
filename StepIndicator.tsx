import React from 'react';
import { useBooking } from './BookingWizard';
import { CalendarDays, BedDouble, User, CheckCircle2 } from 'lucide-react';

const steps = [
  { id: 0, label: 'Dates', Icon: CalendarDays },
  { id: 1, label: 'Availability', Icon: BedDouble },
  { id: 2, label: 'Guest Info', Icon: User },
  { id: 3, label: 'Confirm', Icon: CheckCircle2 },
];

export default function StepIndicator() {
  const { step, goTo } = useBooking();
  return (
    <nav aria-label="Progress" className="px-2 py-3">
      <ol className="flex flex-wrap items-center justify-between gap-2">
        {steps.map((s, idx) => {
          const completed = step > s.id;
          const active = step === s.id;
          const Icon = s.Icon;
          return (
            <li key={s.id} className="flex-1 min-w-[140px] flex items-center">
              <button
                type="button"
                aria-current={active ? 'step' : undefined}
                aria-disabled={!completed && !active}
                onClick={() => (completed ? goTo(s.id) : undefined)}
                className={
                  'flex items-center justify-center gap-2 w-full rounded-[5px] text-base px-[25px] py-[10px] transition min-h-[40px] ' +
                  (active
                    ? 'bg-[#ffd126] text-[#00488a] ring-2 ring-[#ffd126]'
                    : completed
                    ? 'bg-[#00488a] text-[#fefefd]'
                    : 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50')
                }
              >
                <Icon className={active ? 'h-5 w-5 text-[#00488a]' : completed ? 'h-5 w-5 text-[#fefefd]' : 'h-5 w-5 text-[#00488a]'} aria-hidden="true" />
                <span className="font-medium whitespace-nowrap">{s.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <div className="hidden sm:block flex-1 h-px mx-2 bg-gray-300" aria-hidden="true"></div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}