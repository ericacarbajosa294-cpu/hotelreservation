import { createElement, useEffect, useState } from '@wordpress/element';

const statusMeta = (raw) => {
    const v = String(raw || '').toLowerCase();
    if (v === 'checked_in') return { label: 'Checked-In', color: 'bg-emerald-100 text-emerald-700' };
    if (v === 'canceled') return { label: 'Cancelled', color: 'bg-red-100 text-red-700' };
    if (v === 'checked_out') return { label: 'Checked-Out', color: 'bg-slate-200 text-slate-700' };
    if (v === 'created') return { label: 'Booked', color: 'bg-blue-100 text-blue-700' };
    return { label: (String(raw || '').replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())), color: 'bg-slate-100 text-slate-700' };
};

const Bookings = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [guestQuery, setGuestQuery] = useState('');
    const [hotels, setHotels] = useState([]);
    const [hotelId, setHotelId] = useState('');
    const [reloading, setReloading] = useState(false);
    const [status, setStatus] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [confirmCancel, setConfirmCancel] = useState({ open: false, bookingId: null });
    const [selected, setSelected] = useState([]);
    const [addOpen, setAddOpen] = useState(false);
    const [newBooking, setNewBooking] = useState({
        guest: '', salutation: '', firstName: '', lastName: '', gender: '', birth: '', nationality: '',
        email: '', phone: '', arrivalWindow: '', payment: '', paymentMethod: '', paymentRef: '',
        hotel_id: '', room_type: '', room_qty: 1, checkin: '', checkout: '', guests: 1,
        notes: '', specifyPerRoom: false
    });
    const [availCounts, setAvailCounts] = useState({});
    const [roomTypeOptions, setRoomTypeOptions] = useState([]);
    const [availableRoomsByType, setAvailableRoomsByType] = useState({});
    const [typeMeta, setTypeMeta] = useState({}); // { norm: { label, price } }
    const [selectedTypes, setSelectedTypes] = useState([]); // [{ id:norm, qty:number }]
    const [nationalities, setNationalities] = useState([]);
    const [phoneCodes, setPhoneCodes] = useState([]);
    const [loadingNations, setLoadingNations] = useState(false);
    const [arrivalWindows, setArrivalWindows] = useState([]);
    const [moreOpen, setMoreOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [actionMenuId, setActionMenuId] = useState(null);
    const [showGuest, setShowGuest] = useState(false);
    const [guestInfo, setGuestInfo] = useState(null);
    const [activeBooking, setActiveBooking] = useState(null);
    const [tab, setTab] = useState(0);
    const [paymentUpdateBookingId, setPaymentUpdateBookingId] = useState(null);
    const [roomNightsByType, setRoomNightsByType] = useState({}); // { typeNorm: number[] per room index }
    const [roomOccupantsByType, setRoomOccupantsByType] = useState({}); // { typeNorm: [{adult, child}] }
    const [guestTotal, setGuestTotal] = useState(0);
    const [guestTotalLoading, setGuestTotalLoading] = useState(false);

    useEffect(() => {
        function onDocClick(e){
            const target = e.target;
            if (actionMenuId !== null) {
                const wrap = document.querySelector(`[data-booking-menu="booking-${actionMenuId}"]`);
                if (wrap && wrap.contains(target)) {
                    // click inside menu area; keep it open
                } else {
                    setActionMenuId(null);
                }
            }
        }
        document.addEventListener('click', onDocClick);
        return () => document.removeEventListener('click', onDocClick);
    }, [actionMenuId]);

    async function loadHotels(){
        const body = new URLSearchParams({ action: 'nhsa_admin_list_hotels', nonce: NHSA.nonce });
        const res = await fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
        const json = await res.json();
        setHotels(json?.data?.hotels || []);
    }

    async function loadBookings(params={}){
        const body = new URLSearchParams({ action: 'nhsa_admin_list_bookings', nonce: NHSA.nonce, ...params });
        const res = await fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
        const json = await res.json();
        if (json?.success) setRows(json.data.bookings || []);
    }

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                await Promise.all([loadHotels(), loadBookings({})]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!addOpen) return;
        buildArrivalWindows();
        let cancelled = false;
        (async () => {
            try {
                setLoadingNations(true);
                const res = await fetch('https://restcountries.com/v3.1/all');
                const json = await res.json();
                if (cancelled) return;
                const nats = [];
                const codes = [];
                const codeSet = new Set();
                json.forEach((c)=>{
                    const name = c?.name?.common || '';
                    if (name) nats.push(name);
                    const root = c?.idd?.root || '';
                    const suffixes = Array.isArray(c?.idd?.suffixes) ? c.idd.suffixes : [];
                    if (root && suffixes.length){
                        suffixes.forEach(s=>{ const code = `${root}${s}`; if (!codeSet.has(code)) { codeSet.add(code); codes.push({ country: name, code }); } });
                    }
                });
                nats.sort((a,b)=>a.localeCompare(b));
                codes.sort((a,b)=> a.country.localeCompare(b.country));
                setNationalities(nats);
                setPhoneCodes(codes);
            } catch (e) {
                setNationalities(['Philippines','United States','Canada','United Kingdom']);
                setPhoneCodes([{country:'Philippines', code:'+63'},{country:'United States', code:'+1'}]);
            } finally {
                setLoadingNations(false);
            }
        })();
        return () => { cancelled = true; };
    }, [addOpen]);

    async function applyFilters(e){
        e?.preventDefault?.();
        setReloading(true);
        await loadBookings({ guest: guestQuery, hotel_id: hotelId, status, from, to });
        setReloading(false);
        setSelected([]);
        setFilterOpen(false);
        setMoreOpen(false);
    }

    function resetFilters(){
        setGuestQuery('');
        setHotelId('');
        setStatus('');
        setFrom('');
        setTo('');
        setSelected([]);
        setFilterOpen(false);
        setMoreOpen(false);
    }

    function fmt(d){ const pad=(n)=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
    function computeNights(ci, co){
        if (!ci || !co) return 0;
        const a = new Date(ci);
        const b = new Date(co);
        const diff = Math.floor((b - a) / (1000*60*60*24));
        return diff > 0 ? diff : 0;
    }
    function presetToday(){ const d=new Date(); const s=fmt(d); setFrom(s); setTo(s); }
    function presetThisWeek(){ const d=new Date(); const day=d.getDay()||7; const start=new Date(d); start.setDate(d.getDate()-(day-1)); const end=new Date(start); end.setDate(start.getDate()+6); setFrom(fmt(start)); setTo(fmt(end)); }

    async function updateStatus(id, status){
        setReloading(true);
        const body = new URLSearchParams({ action:'nhsa_admin_update_booking_status', nonce: NHSA.nonce, id: String(id), status });
        await fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
        await loadBookings({ guest: guestQuery, hotel_id: hotelId, status, from, to });
        setReloading(false);
    }

    async function bulkUpdate(nextStatus){
        if (selected.length === 0) return;
        setReloading(true);
        const body = new URLSearchParams({ action:'nhsa_admin_bulk_update_booking_status', nonce: NHSA.nonce, status: nextStatus });
        selected.forEach(id => body.append('ids[]', String(id)));
        await fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
        await loadBookings({ guest: guestQuery, hotel_id: hotelId, status, from, to });
        setReloading(false);
        setSelected([]);
        setMoreOpen(false);
    }

    async function createBooking(e){
        e?.preventDefault?.();
        const guestFull = (`${newBooking.firstName||''} ${newBooking.lastName||''}`).trim() || 'Guest';
        const payload = { ...newBooking, guest: guestFull };
        const nightsMap = {};
        const occupantsMap = {};
        (selectedTypes||[]).forEach(st=>{ const arr = Array.isArray(roomNightsByType[st.id]) ? roomNightsByType[st.id] : []; nightsMap[st.id] = arr; });
        (selectedTypes||[]).forEach(st=>{ const arr = Array.isArray(roomOccupantsByType[st.id]) ? roomOccupantsByType[st.id] : []; occupantsMap[st.id] = arr; });
        const body = new URLSearchParams({ action:'nhsa_admin_add_booking', nonce: NHSA.nonce,
            guest: payload.guest, salutation: payload.salutation, firstName: payload.firstName, lastName: payload.lastName, gender: payload.gender, birth: payload.birth, nationality: payload.nationality,
            email: payload.email, phone: (newBooking.phone||''), hotel_id: payload.hotel_id, room_type: payload.room_type, room_qty: String(payload.room_qty||1), checkin: payload.checkin, checkout: payload.checkout, guests: String(payload.guests||1), payment: (payload.payment||''),
            paymentMethod: (payload.paymentMethod||''), paymentRef: (payload.paymentRef||''),
            arrivalWindow: payload.arrivalWindow || '', notes: payload.notes, specifyPerRoom: payload.specifyPerRoom, selected_types: JSON.stringify(selectedTypes||[]), nights_map: JSON.stringify(nightsMap), occupants_map: JSON.stringify(occupantsMap)
        });
        const res = await fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
        const json = await res.json();
        if (json?.success) {
            setAddOpen(false);
            setNewBooking({ guest: '', salutation: '', firstName: '', lastName: '', gender: '', birth: '', nationality: '',
                email: '', phone: '', arrivalWindow: '',
                hotel_id: '', room_type: '', room_qty: 1, checkin: '', checkout: '', guests: 1,
                notes: '', specifyPerRoom: false
            });
            setAvailCounts({}); setRoomTypeOptions([]);
            applyFilters();
        }
    }

    function toggleSelect(id){ setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]); }
    function toggleSelectAll(){ if (selected.length === rows.length) setSelected([]); else setSelected(rows.map(r=>r.id)); }

    function exportCsv(){
        const params = new URLSearchParams({ action: 'nhsa_admin_export_bookings', nonce: NHSA.nonce, guest: guestQuery, hotel_id: hotelId, status, from, to });
        const url = `${NHSA.ajax}?${params.toString()}`;
        window.open(url, '_blank');
    }

    function openCancelConfirm(id){ setConfirmCancel({ open:true, bookingId:id }); }
    function closeCancelConfirm(){ setConfirmCancel({ open:false, bookingId:null }); }
    async function confirmCancelAction(){ if (!confirmCancel.bookingId) return; await updateStatus(confirmCancel.bookingId,'canceled'); closeCancelConfirm(); }

    function toTitleCase(s){
        const t = String(s||'').replace(/[\-_]+/g,' ').trim().toLowerCase();
        return t.split(' ').filter(Boolean).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
    }

    function buildArrivalWindows(){
        const items = [];
        for (let h=0; h<24; h++){
            for (let m=0; m<60; m+=30){
                const start = new Date(0,0,0,h,m,0);
                const end = new Date(0,0,0,h, m+30, 0);
                const fmt = (d)=>{
                    let hr = d.getHours();
                    const am = hr < 12;
                    const hr12 = ((hr+11)%12)+1;
                    const min = String(d.getMinutes()).padStart(2,'0');
                    return `${hr12}:${min} ${am?'am':'pm'}`;
                };
                items.push(`${fmt(start)} - ${fmt(end)}`);
            }
        }
        setArrivalWindows(items);
    }

    async function refreshAvailability(hid){
        if (!hid) { setAvailCounts({}); setRoomTypeOptions([]); setNewBooking(nb=>({...nb, room_type:''})); return; }
        const body = new URLSearchParams({ action: 'nhsa_admin_list_rooms', nonce: NHSA.nonce, hotel_id: String(hid) });
        const res = await fetch(NHSA.ajax, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
        const json = await res.json();
        const rooms = json?.data?.rooms || [];
        if (!Array.isArray(rooms) || rooms.length === 0) {
            setAvailCounts({});
            setRoomTypeOptions([]);
            setNewBooking(nb => ({ ...nb, room_type: '' }));
            setAvailableRoomsByType({});
            return;
        }
        const normMap = {};
        const counts = {};
        const byType = {};
        const priceByType = {};
        rooms.forEach(r => {
            const raw = String(r.room_type||'').trim();
            if (!raw) return;
            const norm = raw.toLowerCase();
            if (!normMap[norm]) { normMap[norm] = raw; }
            if (!byType[norm]) { byType[norm] = []; }
            if ((r.status||'available') === 'available') {
                byType[norm].push({ id: r.id, number: r.number, price: Number(r.price||0) });
            }
            if ((r.price||0) > 0 && priceByType[norm] === undefined) { priceByType[norm] = Number(r.price)||0; }
            if ((r.status||'available') === 'available') {
                counts[norm] = (counts[norm]||0) + 1;
            }
        });
        setAvailCounts(counts);
        setAvailableRoomsByType(byType);
        let options = Object.entries(counts)
            .filter(([,c]) => (c||0) > 0)
            .map(([norm, count]) => { const value = normMap[norm] || norm; return ({ value, label: toTitleCase(value), count, price: priceByType[norm]||0 }); });
        if (options.length === 0) {
            // No currently available rooms; show all room types for this hotel with count 0
            options = Object.keys(normMap).map(norm => { const value = normMap[norm] || norm; const count = counts[norm]||0; return ({ value, label: toTitleCase(value), count, price: priceByType[norm]||0 }); });
        }
        setRoomTypeOptions(options);
        const tm = {};
        options.forEach(o => { tm[o.value.toLowerCase()] = { label: o.label, price: o.price||0 }; });
        setTypeMeta(tm);
        setNewBooking(nb => {
            if (!nb.room_type || !options.some(o => o.value.toLowerCase() === String(nb.room_type||'').toLowerCase())) {
                return { ...nb, room_type: (options[0]?.value || '') };
            }
            return nb;
        });
    }

    useEffect(() => {
        if (addOpen && newBooking.hotel_id) { refreshAvailability(newBooking.hotel_id); }
    }, [addOpen, newBooking.hotel_id]);

    // Keep per-room nights overrides in sync with selected quantities and date range
    useEffect(() => {
        const defaultN = computeNights(newBooking.checkin, newBooking.checkout);
        setRoomNightsByType(prev => {
            const next = {};
            (selectedTypes || []).forEach(st => {
                const id = st.id;
                const qty = Math.max(0, Number(st.qty)||0);
                const existing = Array.isArray(prev[id]) ? prev[id] : [];
                const arr = [];
                for (let i=0;i<qty;i++){
                    const current = typeof existing[i] === 'number' && existing[i] > 0 ? existing[i] : defaultN;
                    const clamped = defaultN > 0 ? Math.max(1, Math.min(current || defaultN, defaultN)) : 0;
                    arr[i] = clamped;
                }
                next[id] = arr;
            });
            return next;
        });
        setRoomOccupantsByType(prev => {
            const next = {};
            (selectedTypes || []).forEach(st => {
                const id = st.id;
                const qty = Math.max(0, Number(st.qty)||0);
                const existing = Array.isArray(prev[id]) ? prev[id] : [];
                const arr = [];
                for (let i=0;i<qty;i++){
                    const existingItem = existing[i] || {};
                    const adult = Math.max(1, Number(existingItem.adult||1));
                    const child = Math.max(0, Number(existingItem.child||0));
                    arr[i] = { adult, child };
                }
                next[id] = arr;
            });
            return next;
        });
    }, [selectedTypes, newBooking.checkin, newBooking.checkout]);

    const selectedHotelName = hotels.find(h => String(h.id) === String(newBooking.hotel_id))?.name || '';

    return (
        <div className="bg-white rounded-[5px] shadow p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Bookings</h2>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={()=>window.location.reload()}
                        className="border border-gray-300 px-3 py-2 rounded-[5px] h-10 bg-white hover:bg-gray-50"
                        title="Refresh"
                    >
                        Refresh
                    </button>
                    <button
                        type="button"
                        onClick={()=>setAddOpen(true)}
                        className="bg-[#ffd126] text-[#00488a] hover:brightness-95 px-4 py-2 rounded-[5px] h-10"
                        title="Add Booking"
                    >
                        Add Booking
                    </button>
                </div>
            </div>

            {/* Branded Filter / Navigation Bar */}
            <div className="bg-[#00488a] text-[#fefefd] p-4 rounded-[5px] shadow mb-4">
                <div className="flex flex-wrap items-center gap-3 relative">
                    {/* Search guest name */}
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={guestQuery}
                            onChange={(e)=>setGuestQuery(e.target.value)}
                            placeholder="Search guest name"
                            className="h-10 w-full sm:w-56 md:w-72 bg-white text-gray-700 border border-gray-300 rounded-[5px] px-3 focus:outline-none focus:ring-2 focus:ring-[#ffd126]"
                        />
                    </div>

                    {/* All Hotels */}
                    <div className="flex items-center gap-2">
                        <select
                            value={hotelId}
                            onChange={(e)=>setHotelId(e.target.value)}
                            className="h-10 w-full sm:w-44 bg-white text-gray-700 border border-gray-300 rounded-[5px] px-3 focus:outline-none focus:ring-2 focus:ring-[#ffd126]"
                            aria-label="All Hotels"
                        >
                            <option value="">All Hotels</option>
                            {hotels.map(h => (<option key={h.id} value={h.id}>{h.name}</option>))}
                        </select>
                    </div>

                    {/* All Statuses */}
                    <div className="flex items-center gap-2">
                        <select
                            value={status}
                            onChange={(e)=>setStatus(e.target.value)}
                            className="h-10 w-full sm:w-44 bg-white text-gray-700 border border-gray-300 rounded-[5px] px-3 focus:outline-none focus:ring-2 focus:ring-[#ffd126]"
                            aria-label="All Statuses"
                        >
                            <option value="">All Statuses</option>
                            <option value="created">Booked</option>
                            <option value="checked_in">Checked-In</option>
                            <option value="checked_out">Checked-Out</option>
                            <option value="canceled">Cancelled</option>
                        </select>
                    </div>

                    {/* Filters */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={()=>setFilterOpen(v=>!v)}
                            className="h-10 w-full sm:w-auto bg-white text-[#00488a] border border-gray-300 rounded-[5px] px-3 hover:bg-[#ffd126]/10 hover:text-[#00488a] focus:text-[#00488a] focus:outline-none focus:ring-2 focus:ring-[#ffd126]"
                            title="Filters"
                        >
                            Filters ▾
                        </button>
                        {filterOpen && (
                            <div className="absolute z-20 mt-2 w-80 bg-white text-gray-800 border border-gray-200 rounded-[5px] shadow p-3">
                                <div className="text-sm font-medium mb-2 text-[#00488a]">Date Range</div>
                                <div className="grid grid-cols-1 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={from}
                                            onChange={(e)=>setFrom(e.target.value)}
                                            placeholder="mm/dd/yyyy"
                                            className="h-10 w-full bg-white text-gray-700 border border-gray-300 rounded-[5px] px-2 focus:outline-none focus:ring-2 focus:ring-[#ffd126]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={to}
                                            onChange={(e)=>setTo(e.target.value)}
                                            placeholder="mm/dd/yyyy"
                                            className="h-10 w-full bg-white text-gray-700 border border-gray-300 rounded-[5px] px-2 focus:outline-none focus:ring-2 focus:ring-[#ffd126]"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                    <button type="button" onClick={presetToday} className="h-10 bg-white text-[#00488a] font-medium px-3 rounded-[5px] hover:bg-[#ffd126]/20 border border-gray-300">Today</button>
                                    <button type="button" onClick={presetThisWeek} className="h-10 bg-white text-[#00488a] font-medium px-3 rounded-[5px] hover:bg-[#ffd126]/20 border border-gray-300">This Week</button>
                                    <button type="button" onClick={applyFilters} className="h-10 bg-[#22c55e] text-white font-semibold px-4 rounded-[5px] hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#ffd126]">Apply</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right-side actions inline */}
                    <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={applyFilters}
                            className="h-10 w-full sm:w-auto bg-[#22c55e] text-white font-semibold px-4 rounded-[5px] hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#ffd126]"
                            title="Apply"
                        >
                            Apply
                        </button>
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="h-10 w-full sm:w-auto border border-white text-white px-4 rounded-[5px] hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#ffd126]"
                            title="Reset"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Bulk action bar or helper message */}
            {selected.length >= 2 ? (
                <div className="flex items-center justify-between bg-white rounded-[5px] border border-gray-200 p-3 mb-3">
                    <div className="text-sm text-slate-700">{selected.length} selected</div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={()=>bulkUpdate('checked_in')} className="px-3 py-2 rounded-[5px] border border-gray-300 bg-white hover:bg-gray-50">Bulk Check-in</button>
                        <button type="button" onClick={()=>bulkUpdate('checked_out')} className="px-3 py-2 rounded-[5px] border border-gray-300 bg-white hover:bg-gray-50">Bulk Check-out</button>
                        <button type="button" onClick={exportCsv} className="px-3 py-2 rounded-[5px] border border-gray-300 bg-white hover:bg-gray-50">Export CSV</button>
                    </div>
                </div>
            ) : (
                selected.length === 1 ? (
                    <div className="mb-3 text-sm text-slate-600">Select more guest names to view bulk action.</div>
                ) : null
            )}

            {loading ? (
                <div className="text-sm text-slate-500">Loading...</div>
            ) : (
                <div className="w-full max-h-[70vh] overflow-x-auto overflow-y-auto">
                    <table className="min-w-[1200px] text-sm">
                        <thead className="text-left text-slate-500">
                            <tr>
                                <th className="py-2 pr-4"><input type="checkbox" checked={selected.length===rows.length && rows.length>0} onChange={toggleSelectAll} /></th>
                                <th className="py-2 pr-4">Guest</th>
                                <th className="py-2 pr-4">Hotel Branch</th>
                                <th className="py-2 pr-4">Room Type</th>
                                <th className="py-2 pr-4">Room #</th>
                                <th className="py-2 pr-4">Check-in</th>
                                <th className="py-2 pr-4">Check-out</th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2 pr-4">Payment</th>
                                <th className="py-2 pr-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {rows.map((b, idx) => (
                                <tr key={b.id} className={(idx % 2 === 0 ? 'bg-white' : 'bg-slate-50') + ' hover:bg-slate-100'}>
                                    <td className="py-2 pr-4"><input type="checkbox" checked={selected.includes(b.id)} onChange={()=>toggleSelect(b.id)} /></td>
                                    <td className="py-2 pr-4">
                                        <button type="button" className="font-semibold text-slate-900 text-base hover:underline" onClick={()=>{ setActiveBooking(b);
                                            const norm = (v)=>{
                                                if (Array.isArray(v)) { const cand = v.find(x=>typeof x==='string' && x.trim().length>0); return String(cand ?? v[0] ?? ''); }
                                                if (v===null||v===undefined) return '';
                                                const s = String(v);
                                                // Avoid random numeric-only values being shown as names
                                                if (/^\d+$/.test(s)) return '';
                                                return s;
                                            };
                                            setGuestInfo({
                                                salutation: norm(b.details?.salutation),
                                                firstName: norm(b.details?.firstName),
                                                lastName: norm(b.details?.lastName),
                                                gender: norm(b.details?.gender),
                                                birth: norm(b.details?.birth),
                                                nationality: norm(b.details?.nationality),
                                                email: norm(b.details?.email || b?.user?.email),
                                                phone: norm(b.details?.phone),
                                                arrivalWindow: norm(b.details?.arrivalWindow),
                                                notes: norm(b.details?.notes),
                                                rooms: Array.isArray(b.rooms)? b.rooms : [],
                                                roomCheckins: (b.roomCheckins||{}),
                                                checkout: b.computed?.checkout||b.checkout||'',
                                                payment: String(b.payment||'unpaid'),
                                                amounts: b.amounts||{subtotal:0,tax:0,total:0}
                                            }); setShowGuest(true); }}>{b.guest}</button>
                                        {(b?.user?.email || b?.code) && (
                                            <div className="text-xs text-slate-600">
                                                {b?.user?.email ? <span>{b.user.email}</span> : null}
                                                {b?.user?.email && b?.code ? <span className="mx-1">·</span> : null}
                                                {b?.code ? <span>Code: {b.code}</span> : null}
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-2 pr-4">{b.hotel}</td>
                                    <td className="py-2 pr-4">{b.rooms && b.rooms.length>0 ? b.rooms.map(r=>r.room_type||b.roomType).join(', ') : b.roomType}</td>
                                    <td className="py-2 pr-4">{b.rooms && b.rooms.length>0 ? b.rooms.map(r=>r.room_number).join(', ') : b.roomNum}</td>
                                    <td className="py-2 pr-4">{b.checkin}</td>
                                    <td className="py-2 pr-4">{b.checkout}</td>
                                    <td className="py-2 pr-4">{(() => { const m = statusMeta(b.status); return (<span className={`px-2 py-1 rounded-full ${m.color}`}>{m.label}</span>); })()}</td>
                                    <td className="py-2 pr-4">{(() => { const p = String(b.payment||'unpaid').toLowerCase(); const paid = p==='paid' || p==='success'; return (<span className={`px-2 py-1 rounded-full ${paid?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{paid?'Paid':'Unpaid'}</span>); })()}</td>
                                    <td className="py-2 pr-4">
                                        <div className="relative" data-booking-menu={`booking-${b.id}`}>
                                            <button type="button" className="px-2 py-1 rounded-[5px] border border-gray-300 bg-white hover:bg-gray-50" onClick={()=>setActionMenuId(actionMenuId===b.id?null:b.id)} title="More">⋯</button>
                                            <div className={`absolute right-0 z-20 mt-2 w-40 bg-white text-gray-800 border border-gray-200 rounded-[5px] shadow overflow-hidden ${actionMenuId===b.id?'block':'hidden'}`}>
                                                <button type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={()=>{
                                                    const countRooms = Array.isArray(b.rooms) && b.rooms.length>0 ? b.rooms.length : (b.roomNum && String(b.roomNum).includes(',') ? String(b.roomNum).split(',').length : 1);
                                                    if (countRooms>1) {
                                                        const ok = window.confirm(`This booking has ${countRooms} rooms. Confirm checking in all rooms?`);
                                                        if (!ok) { setActionMenuId(null); return; }
                                                    }
                                                    updateStatus(b.id,'checked_in'); setActionMenuId(null);
                                                }} title="Check-in">Check-in</button>
                                                <button type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={()=>{ updateStatus(b.id,'checked_out'); setActionMenuId(null); }} title="Check-out">Check-out</button>
                                                <button type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600" onClick={()=>{ openCancelConfirm(b.id); setActionMenuId(null); }} title="Cancel">Cancel</button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr><td className="py-3 text-slate-500" colSpan="9">No bookings found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {confirmCancel.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-[5px] shadow p-4 w-full max-w-sm">
                        <div className="text-lg font-semibold mb-2">Cancel booking?</div>
                        <div className="text-sm text-slate-600 mb-4">This action cannot be undone.</div>
                        <div className="flex justify-end gap-2">
                            <button className="px-3 py-2 rounded-[5px] border border-gray-300" onClick={()=>setConfirmCancel({open:false, bookingId:null})}>Close</button>
                            <button className="px-3 py-2 bg-red-600 text-white rounded-[5px]" onClick={confirmCancelAction}>Cancel booking</button>
                        </div>
                    </div>
                </div>
            )}

            {addOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-[5px] shadow p-4 w-[95%] sm:w-[90%] md:w-[70%] lg:w-[70%] xl:w-[70%] max-w-[1400px] max-h-[85vh] overflow-y-auto overflow-x-auto">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold">{paymentUpdateBookingId ? 'Update Payment' : 'Add Booking'}</h3>
                            <button className="text-slate-500" onClick={()=>setAddOpen(false)}>✕</button>
                        </div>
                        <form onSubmit={createBooking} className="space-y-3">
                            <div className="flex gap-2 border-b border-gray-200 mb-2">
                                <button type="button" className={`px-3 py-2 ${tab===0?'border-b-2 border-slate-900 text-slate-900':'text-slate-600 hover:text-slate-900'}`} onClick={()=>setTab(0)}>Details</button>
                                <button type="button" className={`px-3 py-2 ${tab===1?'border-b-2 border-slate-900 text-slate-900':'text-slate-600 hover:text-slate-900'}`} onClick={()=>setTab(1)}>Guest Info</button>
                                <button type="button" className={`px-3 py-2 ${tab===2?'border-b-2 border-slate-900 text-slate-900':'text-slate-600 hover:text-slate-900'}`} onClick={()=>setTab(2)}>Booking Summary</button>
                            </div>
                            {tab===0 && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-sm text-slate-600 mb-1">Check-in</label>
                                        <input type="date" min={fmt(new Date())} className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2" value={newBooking.checkin} onChange={e=>{ const v=e.target.value; let nextOut=newBooking.checkout; if (nextOut && v && new Date(nextOut) <= new Date(v)) { const d=new Date(v); d.setDate(d.getDate()+1); nextOut = fmt(d); } setNewBooking({...newBooking, checkin:v, checkout: nextOut}); }} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-600 mb-1">Check-out</label>
                                        <input type="date" min={newBooking.checkin ? (()=>{ const d=new Date(newBooking.checkin); d.setDate(d.getDate()+1); return fmt(d); })() : fmt(new Date())} className={`w-full bg-white border border-gray-300 rounded-[5px] px-3 py-2 ${(newBooking.checkout && newBooking.checkin && new Date(newBooking.checkout) <= new Date(newBooking.checkin)) ? 'line-through text-gray-500' : 'text-gray-800'}`} value={newBooking.checkout} onChange={e=>{ const v=e.target.value; if (newBooking.checkin && v && new Date(v) <= new Date(newBooking.checkin)) { const d=new Date(newBooking.checkin); d.setDate(d.getDate()+1); setNewBooking({...newBooking, checkout: fmt(d)}); } else { setNewBooking({...newBooking, checkout: v}); } }} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-600 mb-1">Hotel</label>
                                        <select className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2" value={newBooking.hotel_id} onChange={async (e)=>{ const v=e.target.value; setNewBooking({...newBooking, hotel_id:v, room_type:''}); await refreshAvailability(v); }} required>
                                            <option value="">Select hotel</option>
                                            {hotels.map(h => (<option key={h.id} value={h.id}>{h.name}</option>))}
                                        </select>
                                        {newBooking.hotel_id && (
                                            (()=>{ const parts = roomTypeOptions.map(o => `${o.label}: ${availCounts[o.value.toLowerCase()]||0}`); return (<div className="mt-1 text-xs text-slate-600">{parts.length? (`Availability — ${parts.join(', ')}`) : 'No room types found for this hotel.'}</div>); })()
                                        )}
                                    </div>
                                    {/* Removed global Guests field; per-room occupants below */}
                                    <div className="md:col-span-3">
                                        <label className="block text-sm text-slate-600 mb-1">Room Types</label>
                                        <div className="space-y-3">
                                            {roomTypeOptions.length===0 && (
                                                <div className="text-sm text-slate-500">No room types available for this hotel.</div>
                                            )}
                                            {roomTypeOptions.map(o => {
                                                const norm = o.value.toLowerCase();
                                                const selected = selectedTypes.find(x => x.id === norm);
                                                const qty = selected?.qty || 0;
                                                const max = availCounts[norm] || 0;
                                                const defaultN = computeNights(newBooking.checkin, newBooking.checkout);
                                                const perRoomNights = roomNightsByType[norm] || [];
                                                const price = typeMeta[norm]?.price || o.price || 0;
                                                const totalForType = Array.from({length: qty}).reduce((sum, _, idx)=>{
                                                    const n = perRoomNights[idx] || defaultN;
                                                    return sum + (price * Math.max(0, n));
                                                }, 0);
                                                return (
                                                    <div key={o.value} className="border border-gray-200 rounded-[5px] p-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 text-sm text-slate-800">{o.label} <span className="text-slate-500">({max} available)</span></div>
                                                            <input type="number" min="0" max={max} className="w-20 bg-white text-gray-800 border border-gray-300 rounded-[5px] px-2 py-1" value={qty} onChange={e=>{ const nextQty=Math.max(0, Math.min(max, Number(e.target.value)||0)); setSelectedTypes(prev=>{ const rest=prev.filter(x=>x.id!==norm); return nextQty>0?[...rest,{id:norm,qty:nextQty}]:rest; }); }} />
                                                        </div>
                                                        {qty>0 && (
                                                            <div className="mt-2 space-y-1">
                                                                <div className="text-xs text-slate-600">Nights between dates: <span className="font-medium text-slate-800">{defaultN}</span></div>
                                                                <div className="text-xs text-slate-600">Price per night: <span className="font-medium text-slate-800">₱{Number(price).toLocaleString()}</span></div>
                                                                <div className="text-xs text-slate-600">Total for this room type: <span className="font-semibold text-slate-900">₱{Number(totalForType).toLocaleString()}</span></div>
                                                                <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                    {Array.from({length: qty}).map((_, idx)=>{
                                                                        const n = perRoomNights[idx] ?? defaultN;
                                                                        return (
                                                                            <div key={idx} className="grid grid-cols-1 md:grid-cols-3 items-center gap-2 p-2 border rounded-[5px]">
                                                                                <div className="flex items-center gap-2">
                                                                                    <label className="text-xs text-slate-600">Room {idx+1} nights</label>
                                                                                    <input type="number" min="0" max={defaultN} className="w-24 bg-white text-gray-800 border border-gray-300 rounded-[5px] px-2 py-1" value={n} onChange={e=>{
                                                                                        const val = Math.max(0, Math.min(defaultN, Number(e.target.value)||0));
                                                                                        setRoomNightsByType(prev=>{
                                                                                            const curr = {...prev};
                                                                                            const arr = Array.isArray(curr[norm]) ? [...curr[norm]] : [];
                                                                                            arr[idx] = val;
                                                                                            curr[norm] = arr;
                                                                                            return curr;
                                                                                        });
                                                                                    }} />
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    <label className="text-xs text-slate-600">Adult</label>
                                                                                    <input type="number" min="1" className="w-20 bg-white text-gray-800 border border-gray-300 rounded-[5px] px-2 py-1" value={(roomOccupantsByType[norm]?.[idx]?.adult)||1} onChange={e=>{
                                                                                        const val = Math.max(1, Number(e.target.value)||1);
                                                                                        setRoomOccupantsByType(prev=>{
                                                                                            const curr = {...prev};
                                                                                            const arr = Array.isArray(curr[norm]) ? curr[norm].map(x=>({...x})) : [];
                                                                                            while(arr.length <= idx) arr.push({adult:1, child:0});
                                                                                            arr[idx].adult = val;
                                                                                            curr[norm] = arr;
                                                                                            return curr;
                                                                                        });
                                                                                    }} />
                                                                                    <label className="text-xs text-slate-600">Child</label>
                                                                                    <input type="number" min="0" className="w-20 bg-white text-gray-800 border border-gray-300 rounded-[5px] px-2 py-1" value={(roomOccupantsByType[norm]?.[idx]?.child)||0} onChange={e=>{
                                                                                        const val = Math.max(0, Number(e.target.value)||0);
                                                                                        setRoomOccupantsByType(prev=>{
                                                                                            const curr = {...prev};
                                                                                            const arr = Array.isArray(curr[norm]) ? curr[norm].map(x=>({...x})) : [];
                                                                                            while(arr.length <= idx) arr.push({adult:1, child:0});
                                                                                            arr[idx].child = val;
                                                                                            curr[norm] = arr;
                                                                                            return curr;
                                                                                        });
                                                                                    }} />
                                                                                </div>
                                                                                <div className="text-xs text-slate-700 text-right w-full">₱{Number(price * (n || 0)).toLocaleString()}</div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {tab===1 && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-sm text-slate-600 mb-1">Salutation</label>
                                        <select className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2" value={newBooking.salutation} onChange={e=>setNewBooking({...newBooking, salutation:e.target.value})} required>
                                            <option value="">Select</option>
                                            <option>Mr.</option><option>Mrs.</option><option>Ms.</option><option>Dr.</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-600 mb-1">First Name</label>
                                        <input className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2" value={newBooking.firstName} onChange={e=>setNewBooking({...newBooking, firstName:e.target.value})} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-600 mb-1">Last Name</label>
                                        <input className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2" value={newBooking.lastName} onChange={e=>setNewBooking({...newBooking, lastName:e.target.value})} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-600 mb-1">Gender</label>
                                        <select className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2" value={newBooking.gender} onChange={e=>setNewBooking({...newBooking, gender:e.target.value})} required>
                                            <option value="">Select</option>
                                            <option>Male</option><option>Female</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-600 mb-1">Birth Date</label>
                                        <input type="date" className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2" value={newBooking.birth} onChange={e=>setNewBooking({...newBooking, birth:e.target.value})} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-600 mb-1">Nationality</label>
                                        <select className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2" value={newBooking.nationality} onChange={e=>setNewBooking({...newBooking, nationality:e.target.value})} required>
                                            <option value="">{loadingNations?'Loading…':'Select nationality'}</option>
                                            {nationalities.map(n => (<option key={n} value={n}>{n}</option>))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-600 mb-1">Email</label>
                                        <input type="email" className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2" value={newBooking.email} onChange={e=>setNewBooking({...newBooking, email:e.target.value})} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-600 mb-1">Contact Number</label>
                                        <input type="tel" inputMode="numeric" pattern="[0-9]{12,13}" maxLength={13} minLength={12} className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2" value={newBooking.phone} onChange={e=>{ const v=(e.target.value||'').replace(/\D+/g,'').slice(0,13); setNewBooking({...newBooking, phone:v}); }} required />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-slate-600 mb-1">Estimated Arrival Time</label>
                                        <select className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2" value={newBooking.arrivalWindow} onChange={e=>setNewBooking({...newBooking, arrivalWindow:e.target.value})} required>
                                            <option value="">Select</option>
                                            {arrivalWindows.map(w => (<option key={w} value={w}>{w}</option>))}
                                        </select>
                                    </div>
                                    <div className="md:col-span-3">
                                        <div className="text-sm font-medium text-slate-700">Special Notes <span className="text-xs text-slate-500">(Subject to availability)</span></div>
                                        <textarea className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 mt-1" rows={3} value={newBooking.notes} onChange={e=>setNewBooking({...newBooking, notes:e.target.value})} placeholder="Add any special requests here"></textarea>
                                    </div>
                                </div>
                            )}
                            {tab===2 && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <div className="text-sm text-slate-600">Hotel</div>
                                            <div className="text-slate-900">{hotels.find(h=>String(h.id)===String(newBooking.hotel_id))?.name||'-'}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-slate-600">Dates</div>
                                            <div className="text-slate-900">{newBooking.checkin||'-'} → {newBooking.checkout||'-'}</div>
                                        </div>
                                    </div>
                                    <div className="border border-gray-200 rounded-[5px] p-2 space-y-2 bg-slate-50">
                                        {(() => {
                                            const items = (selectedTypes.length>0 ? selectedTypes : (newBooking.room_type ? [{ id:String(newBooking.room_type).toLowerCase(), qty:newBooking.room_qty||1 }] : []));
                                            if (items.length === 0) { return (<div className="text-sm text-slate-500">No rooms selected.</div>); }
                                            const defaultN = computeNights(newBooking.checkin, newBooking.checkout);
                                            return items.map(st => { const meta=typeMeta[st.id]||{label:toTitleCase(st.id),price:0}; const price=meta.price||0; const rooms=(availableRoomsByType[st.id]||[]).slice(0,st.qty); const perRoom = roomNightsByType[st.id]||[]; const totalType = Array.from({length: st.qty||0}).reduce((sum,_,i)=> { const n=(perRoom[i] ?? defaultN) || 0; return sum + (price * n); }, 0); return (
                                                <div key={st.id} className="border-b last:border-0 pb-2">
                                                    {Array.from({length: st.qty||0}).map((_, i) => {
                                                        const r = rooms[i];
                                                        const n = (perRoom[i] ?? defaultN) || 0;
                                                        const per = (r && (r.price||0)) || (price||0);
                                                        const lineTotal = per * n;
                                                        return (
                                                            <div key={r ? r.id : `${st.id}-${i}`} className="flex justify-between text-sm">
                                                                <div>
                                                                    <div className="text-slate-800">{r ? `Room ${r.number}` : 'Room — TBA'}</div>
                                                                    <div className="text-slate-600">{meta.label} — {n} night{n===1?'':'s'}</div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="text-xs text-slate-600">Price per night: ₱{Number(per).toLocaleString()}</div>
                                                                    <div className="text-slate-900">₱{Number(lineTotal).toLocaleString()}</div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    <div className="flex justify-between text-xs text-slate-700 pt-1"><div>Type subtotal</div><div>₱{Number(totalType).toLocaleString()}</div></div>
                                                </div>
                                            ); });
                                        })()}
                                        {(()=>{ const items=(selectedTypes.length>0?selectedTypes:(newBooking.room_type?[{id:String(newBooking.room_type).toLowerCase(),qty:newBooking.room_qty||1}]:[])); const defaultN = computeNights(newBooking.checkin, newBooking.checkout); const subtotal=items.reduce((sum,st)=>{ const price=(typeMeta[st.id]?.price||0); const perRoom = roomNightsByType[st.id]||[]; const typeTotal = Array.from({length: st.qty||0}).reduce((s,_,i)=> { const n=(perRoom[i] ?? defaultN) || 0; return s + (price * n); }, 0); return sum + typeTotal; },0); const taxRate=0.12; const taxes=(subtotal*taxRate); const total=subtotal+taxes; return (
                                            <div className="space-y-1 pt-1 border-t">
                                                <div className="flex justify-between text-sm">
                                                    <div className="text-slate-700">Subtotal</div>
                                                    <div className="text-right text-slate-900">₱{subtotal.toLocaleString()}</div>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <div className="text-slate-700">Taxes/Fees</div>
                                                    <div className="text-right text-slate-900">₱{taxes.toLocaleString()}</div>
                                                </div>
                                                <div className="flex justify-between text-sm font-semibold">
                                                    <div className="text-slate-800">Total</div>
                                                    <div className="text-right text-slate-900">₱{total.toLocaleString()}</div>
                                                </div>
                                            </div>
                                        ); })()}
                                    </div>
                                    <div className="space-y-2">
                                        <div>
                                            <label className="block text-sm text-slate-600 mb-1">Payment Method</label>
                                            <select className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2" value={newBooking.paymentMethod||''} onChange={e=>setNewBooking({...newBooking, paymentMethod:e.target.value, payment: (e.target.value==='cash'? newBooking.payment : ''), paymentRef: (e.target.value==='cash'?'':newBooking.paymentRef)})} required>
                                                <option value="">Select</option>
                                                <option value="cash">Cash</option>
                                                <option value="card">Debit/Credit</option>
                                                <option value="ewallet">eWallet</option>
                                            </select>
                                        </div>
                                        {newBooking.paymentMethod==='cash' && (
                                            <div>
                                                <label className="block text-sm text-slate-600 mb-1">Cash Status</label>
                                                <select className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2" value={newBooking.payment||''} onChange={e=>setNewBooking({...newBooking, payment:e.target.value})} required>
                                                    <option value="">Select</option>
                                                    <option value="paid">Paid</option>
                                                    <option value="unpaid">Unpaid</option>
                                                </select>
                                            </div>
                                        )}
                                        {(newBooking.paymentMethod==='card' || newBooking.paymentMethod==='ewallet') && (
                                            <div>
                                                <label className="block text-sm text-slate-600 mb-1">Reference Number</label>
                                                <input className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2" placeholder="Enter reference number" value={newBooking.paymentRef||''} onChange={e=>setNewBooking({...newBooking, paymentRef:e.target.value})} required />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-between gap-2 pt-2">
                                <div>
                                    {tab>0 && (<button type="button" className="px-3 py-2 rounded-[5px] border border-gray-300" onClick={()=>setTab(tab-1)}>Back</button>)}
                                </div>
                                <div className="ml-auto flex gap-2">
                                    <button type="button" className="px-3 py-2 rounded-[5px] border border-gray-300" onClick={()=>setAddOpen(false)}>Cancel</button>
                                    {tab<2 ? (
                                        <button type="button" className="px-3 py-2 bg-slate-900 text-white rounded-[5px]" disabled={
                                            (tab===0 && (!newBooking.checkin || !newBooking.checkout || !newBooking.hotel_id || ((selectedTypes||[]).length===0 && !newBooking.room_type))) ||
                                            (tab===1 && (!newBooking.salutation || !newBooking.firstName || !newBooking.lastName || !newBooking.gender || !newBooking.birth || !newBooking.nationality || !newBooking.email || !(newBooking.phone||'').match(/^\d{12,13}$/) || !newBooking.arrivalWindow))
                                        } onClick={()=>setTab(tab+1)}>Next</button>
                                    ) : (
                                        <button type="submit" className="px-3 py-2 bg-slate-900 text-white rounded-[5px]" disabled={
                                            !newBooking.checkin || !newBooking.checkout || !newBooking.hotel_id || ((selectedTypes||[]).length===0 && !newBooking.room_type) ||
                                            !newBooking.salutation || !newBooking.firstName || !newBooking.lastName || !newBooking.gender || !newBooking.birth || !newBooking.nationality || !newBooking.email || !(newBooking.phone||'').match(/^\d{12,13}$/) || !newBooking.arrivalWindow ||
                                            !newBooking.paymentMethod || (newBooking.paymentMethod==='cash' ? !newBooking.payment : !newBooking.paymentRef)
                                        }>Create Booking</button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showGuest && guestInfo && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-[5px] shadow p-4 w-full max-w-xl max-h-[85vh] overflow-y-auto overflow-x-auto">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold">Guest Details</h3>
                            <button className="text-slate-500" onClick={()=>setShowGuest(false)}>✕</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <div className="text-xs text-slate-500">Salutation</div>
                                <div className="text-sm text-slate-800 font-semibold">{guestInfo.salutation||'-'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">First Name</div>
                                <div className="text-sm text-slate-800 font-semibold">{guestInfo.firstName||'-'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">Last Name</div>
                                <div className="text-sm text-slate-800 font-semibold">{guestInfo.lastName||'-'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">Gender</div>
                                <div className="text-sm text-slate-800 font-semibold">{guestInfo.gender||'-'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">Birth Date</div>
                                <div className="text-sm text-slate-800 font-semibold">{guestInfo.birth||'-'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">Nationality</div>
                                <div className="text-sm text-slate-800 font-semibold">{guestInfo.nationality||'-'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">Email</div>
                                <div className="text-sm text-slate-800 font-semibold break-all">{guestInfo.email||'-'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">Contact Number</div>
                                <div className="text-sm text-slate-800 font-semibold">{guestInfo.phone||'-'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500">Arrival Window</div>
                                <div className="text-sm text-slate-800 font-semibold">{guestInfo.arrivalWindow||'-'}</div>
                            </div>
                            <div className="md:col-span-3">
                                <div className="text-xs text-slate-500">Payment Status</div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs ${String(guestInfo.payment||'unpaid').toLowerCase()==='paid'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>
                                        <span className="font-semibold">{String(guestInfo.payment||'unpaid').toLowerCase()==='paid'?'Paid':'Unpaid'}</span>
                                    </span>
                                    {String(guestInfo.payment||'unpaid').toLowerCase()==='paid' && (
                                        <span className="text-sm text-slate-900 font-semibold ml-2">₱{Number((activeBooking?.amounts?.total)||0).toLocaleString()}</span>
                                    )}
                                    {String(guestInfo.payment||'unpaid').toLowerCase()!=='paid' && (
                                        <button className="px-2 py-1 border border-gray-300 rounded-[5px] text-xs" onClick={()=>{ setShowGuest(false); setPaymentUpdateBookingId(activeBooking?.id||null); setNewBooking({
                                            guest: activeBooking?.guest || '', salutation: guestInfo.salutation||'', firstName: guestInfo.firstName||'', lastName: guestInfo.lastName||'', gender: guestInfo.gender||'', birth: guestInfo.birth||'', nationality: guestInfo.nationality||'',
                                            email: guestInfo.email||'', phone: guestInfo.phone||'', arrivalWindow: guestInfo.arrivalWindow||'', payment: '', paymentMethod: '', paymentRef: '',
                                            hotel_id: String(activeBooking?.hotelId||''), room_type: activeBooking?.roomType||'', room_qty: 1, checkin: activeBooking?.checkin||'', checkout: activeBooking?.checkout||'', guests: Number(activeBooking?.details?.guests||activeBooking?.guests||1),
                                            notes: guestInfo.notes||'', specifyPerRoom: false
                                        }); setAddOpen(true); setTab(2); }}>Update Payment</button>
                                    )}
                                </div>
                            </div>
                            <div className="md:col-span-3">
                                <div className="text-xs text-slate-500">Rooms</div>
                                {Array.isArray(guestInfo.rooms) && guestInfo.rooms.length>0 ? (
                                    <ul className="text-sm text-slate-800 list-disc list-inside space-y-0.5">
                                        {guestInfo.rooms.map((r, i)=> {
                                            const checkins = (guestInfo.roomCheckins||{});
                                            const rid = String(r.room_id||'');
                                            const cinRaw = checkins[rid] || null;
                                            const checkoutDate = guestInfo.checkout || null;
                                            let overtime = false;
                                            let cinLabel = '';
                                            if (cinRaw) {
                                                try {
                                                    const d = new Date(cinRaw);
                                                    let hr = d.getHours();
                                                    const min = String(d.getMinutes()).padStart(2,'0');
                                                    const am = hr < 12;
                                                    const hr12 = ((hr+11)%12)+1;
                                                    cinLabel = `${hr12}:${min} ${am?'AM':'PM'}`;
                                                } catch(e) { cinLabel = cinRaw; }
                                            }
                                            if (cinRaw && checkoutDate) {
                                                try {
                                                    const start = new Date(cinRaw);
                                                    const planned = new Date(checkoutDate + 'T12:00:00');
                                                    const overdueMin = (start.getTime() - planned.getTime()) / 60000;
                                                    overtime = overdueMin > 30;
                                                } catch(e) { overtime = false; }
                                            }
                                            const isPaid = String(guestInfo.payment||'unpaid').toLowerCase()==='paid';
                                            return (
                                                <li key={`${r.room_id||i}`} className={overtime? 'text-red-600' : ''}>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div>
                                                            <span>Room {r.room_number} — {String(r.room_type||'').toUpperCase()}</span>
                                                            {cinRaw ? <span className="text-xs text-slate-600"> (checked in: {cinLabel})</span> : null}
                                                        </div>
                                                        {isPaid && (
                                                            <div>
                                                                {!cinRaw ? (
                                                                    <button className="px-2 py-1 text-xs border border-gray-300 rounded-[5px]" onClick={()=>{ setShowGuest(false); updateStatus(activeBooking?.id,'checked_in'); }}>Check-In</button>
                                                                ) : (
                                                                    <button className="px-2 py-1 text-xs border border-gray-300 rounded-[5px]" onClick={()=>{ setShowGuest(false); updateStatus(activeBooking?.id,'checked_out'); }}>Check-Out</button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <div className="text-sm text-slate-800">-</div>
                                )}
                            </div>
                            <div className="md:col-span-3">
                                <div className="text-xs text-slate-500">Special Notes (Subject to availability)</div>
                                <div className="text-sm text-slate-800 whitespace-pre-line">{guestInfo.notes||'-'}</div>
                            </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                            <button className="px-3 py-2 rounded-[5px] border border-gray-300" onClick={()=>setShowGuest(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Bookings;

