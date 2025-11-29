import React from 'react';
import { createRoot } from 'react-dom/client';
import BookingWizard from './wizard/components/BookingWizard';
import './wizard.css';

function mount() {
  const el = document.getElementById('nhsa-booking-wizard-root');
  if (!el) return;
  const root = createRoot(el);
  root.render(<BookingWizard />);
}

if (document.readyState !== 'loading') mount();
else document.addEventListener('DOMContentLoaded', mount);