import { createElement, useEffect, useState } from '@wordpress/element';

const IconButton = ({ titleText, onClick, children }) => (
    <button type="button" title={titleText} aria-label={titleText} className="p-2 rounded-lg hover:bg-slate-100" onClick={onClick}>
        {children}
    </button>
);

const AddIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 3.75a.75.75 0 0 1 .75.75v6.75H19.5a.75.75 0 0 1 0 1.5h-6.75V19.5a.75.75 0 0 1-1.5 0v-6.75H4.5a.75.75 0 0 1 0-1.5h6.75V4.5a.75.75 0 0 1 .75-.75z"/>
    </svg>
);

const AmenityEditor = ({ value, onChange }) => {
    const [text, setText] = useState(Array.isArray(value)? value.join(', ') : '');
    useEffect(()=>{ setText(Array.isArray(value)? value.join(', ') : ''); }, [value]);
    return (
        <div className="space-y-1">
            <input className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" placeholder="e.g., WiFi, TV, Air Conditioning" value={text} onChange={e=>setText(e.target.value)} />
            <div className="flex justify-end">
                <button type="button" className="text-sm px-2 py-1 border border-gray-300 rounded-[5px]" onClick={()=>{ const arr = text.split(',').map(s=>s.trim()).filter(Boolean); onChange(arr); }}>Apply</button>
            </div>
        </div>
    );
};

const ImagesEditor = ({ value, onChange }) => {
    const [urls, setUrls] = useState(Array.isArray(value)? value : []);
    const [input, setInput] = useState('');
    useEffect(()=>{ setUrls(Array.isArray(value)? value : []); }, [value]);
    function addUrl(){ const u = input.trim(); if (!u) return; const next = [...urls, u]; setUrls(next); onChange(next); }
    function removeUrl(idx){ const next = urls.filter((_,i)=>i!==idx); setUrls(next); onChange(next); }
    function openUploader(){
        try {
            const wp = window?.wp;
            if (!wp || !wp.media) { alert('Media library not available.'); return; }
            const frame = wp.media({ title: 'Select Images', library: { type: 'image' }, multiple: true, button: { text: 'Use selected' } });
            frame.on('select', () => {
                const selection = frame.state().get('selection');
                const chosen = [];
                selection.each(att => { const url = att.get('url'); if (url) chosen.push(url); });
                if (chosen.length) { const next = [...urls, ...chosen]; setUrls(next); onChange(next); }
            });
            frame.open();
        } catch (e) {}
    }
    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <input className="flex-1 bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" placeholder="https://..." value={input} onChange={e=>setInput(e.target.value)} />
                <button type="button" className="px-3 py-2 border border-gray-300 rounded-[5px]" onClick={addUrl}>Add URL</button>
                <button type="button" className="px-3 py-2 border border-gray-300 rounded-[5px]" onClick={openUploader}>Upload</button>
            </div>
            <ul className="space-y-1">
                {urls.map((u, i)=> (
                    <li key={`${u}-${i}`} className="flex items-center justify-between text-sm">
                        <span className="truncate max-w-[260px]" title={u}>{u}</span>
                        <button type="button" className="text-red-600 px-2 py-1 hover:underline" onClick={()=>removeUrl(i)}>Remove</button>
                    </li>
                ))}
                {urls.length===0 && <li className="text-slate-500 text-sm">No images added.</li>}
            </ul>
        </div>
    );
};

const PencilIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-slate-700">
        <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712z"/>
        <path d="M19.513 8.199 15.801 4.487 4.41 15.878a5.25 5.25 0 0 0-1.32 2.214l-.8 2.398a.75.75 0 0 0 .948.948l2.398-.8a5.25 5.25 0 0 0 2.214-1.32L19.513 8.2z"/>
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-red-600">
        <path d="M9 3.75A1.75 1.75 0 0 1 10.75 2h2.5A1.75 1.75 0 0 1 15 3.75V5h3.25a.75.75 0 0 1 0 1.5H5.75a.75.75 0 0 1 0-1.5H9V3.75zM6.75 8A.75.75 0 0 1 7.5 8.75v8.5a1.75 1.75 0 0 0 1.75 1.75h5.5A1.75 1.75 0 0 0 16.5 17.25v-8.5a.75.75 0 0 1 1.5 0v8.5A3.25 3.25 0 0 1 14.75 20.5h-5.5A3.25 3.25 0 0 1 6 17.25v-8.5A.75.75 0 0 1 6.75 8z"/>
    </svg>
);

const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-emerald-600">
        <path d="M5 3.75A1.75 1.75 0 0 1 6.75 2h8.5A1.75 1.75 0 0 1 17 3.75V8h-2.25A2.75 2.75 0 0 0 12 10.75V13H5V3.75z"/>
        <path d="M3.5 13.75A1.75 1.75 0 0 1 5.25 12h8.5A1.75 1.75 0 0 1 15.5 13.75v5A1.75 1.75 0 0 1 13.75 20.5h-8.5A1.75 1.75 0 0 1 3.5 18.75v-5z"/>
        <path d="M15 3.75h.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237V9.75H15V3.75z"/>
    </svg>
);

const HotelIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V12h5.25A1.75 1.75 0 0 1 22 13.75V21a.75.75 0 0 1-1.5 0v-2.25h-2V21a.75.75 0 0 1-1.5 0v-2.25H7V21a.75.75 0 0 1-1.5 0v-2.25h-2V21A.75.75 0 0 1 2 21v-9.75A1.75 1.75 0 0 1 3.75 9.5H15V4.5A.5.5 0 0 0 14.5 4h-9a.5.5 0 0 0-.5.5V12h-1V4.5zM6 6.75h3V9H6V6.75zm0 3.75h3v2.25H6V10.5zm4.5-3.75h3V9h-3V6.75zm0 3.75h3v2.25h-3V10.5z"/>
    </svg>
);

const HotelsRooms = () => {
    const [hotels, setHotels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeHotel, setActiveHotel] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [adding, setAdding] = useState(false);
    const [newRoom, setNewRoom] = useState({ number: '', type: '' });
    const [newHotel, setNewHotel] = useState({ name: '', location: '' });
    const [bulkRows, setBulkRows] = useState([{ name: '', location: '' }]);
    const [showBulk, setShowBulk] = useState(false);
    const [showBulkRooms, setShowBulkRooms] = useState(false);
    const [bulkRooms, setBulkRooms] = useState({ range: '', type: 'standard' });
    const [editingId, setEditingId] = useState(null);
    const [editBuffer, setEditBuffer] = useState({});
    const [sortBy, setSortBy] = useState('number');
    const [sortDir, setSortDir] = useState('asc');
    const [roomEditId, setRoomEditId] = useState(null);
    const [roomEdit, setRoomEdit] = useState({ price: '', description: '' });
    const [menuHotelId, setMenuHotelId] = useState(null);
    const [roomMenuId, setRoomMenuId] = useState(null);
    const [showAddRoom, setShowAddRoom] = useState(false);
    const [showAddRoomType, setShowAddRoomType] = useState(false);
    const [newRoomType, setNewRoomType] = useState({ name: '', price: '', description: '', amenities: [], images: [] });
    const [roomTypes, setRoomTypes] = useState([]);
    const [hotelQuery, setHotelQuery] = useState('');
    const [activeTab, setActiveTab] = useState('rooms');
    const [showEditRoomType, setShowEditRoomType] = useState(false);
    const [editRoomType, setEditRoomType] = useState({ id: 0, name: '', price: '', description: '', amenities: [], images: [] });
    const [showDeleteRoomType, setShowDeleteRoomType] = useState(false);
    const [deleteRoomTypeObj, setDeleteRoomTypeObj] = useState(null);

    async function loadHotels(){
        const body = new URLSearchParams({ action: 'nhsa_admin_list_hotels', nonce: NHSA.nonce });
        const res = await fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
        const json = await res.json();
        setHotels(json?.data?.hotels || []);
        setLoading(false);
    }

    useEffect(() => { loadHotels(); }, []);

    useEffect(() => {
        function onDocClick(e) {
            const target = e.target;
            if (menuHotelId !== null) {
                const wrap = document.querySelector(`[data-hotel-menu="hotel-${menuHotelId}"]`);
                if (wrap && wrap.contains(target)) {
                    // click inside menu area; keep it open
                } else {
                    setMenuHotelId(null);
                }
            }
            if (roomMenuId !== null) {
                const wrap2 = document.querySelector(`[data-room-menu="room-${roomMenuId}"]`);
                if (wrap2 && wrap2.contains(target)) {
                    // inside room menu
                } else {
                    setRoomMenuId(null);
                }
            }
        }
        document.addEventListener('click', onDocClick);
        return () => document.removeEventListener('click', onDocClick);
    }, [menuHotelId, roomMenuId]);

    async function openHotel(h){
        setActiveHotel(h);
        const body = new URLSearchParams({ action: 'nhsa_admin_list_rooms', nonce: NHSA.nonce, hotel_id: String(h.id), sort_by: sortBy, sort_dir: sortDir });
        const res = await fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
        const json = await res.json();
        setRooms(json?.data?.rooms || []);
        // load room types for dropdown
        try {
            const rtRes = await fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: new URLSearchParams({ action:'nhsa_admin_list_room_types', nonce: NHSA.nonce }) });
            const rtJson = await rtRes.json();
            setRoomTypes(rtJson?.data?.room_types || []);
        } catch(e) {}
    }

    async function addRoom(e){
        e.preventDefault();
        setAdding(true);
        let defPrice = '';
        let defDesc = '';
        try {
            const rt = roomTypes.find(rt => (rt.slug || rt.name) === newRoom.type);
            if (rt) {
                if (rt.price !== undefined && rt.price !== null && rt.price !== '') {
                    defPrice = String(rt.price);
                }
                if (rt.description) {
                    defDesc = String(rt.description);
                }
            }
        } catch (err) {}
        const body = new URLSearchParams({
            action: 'nhsa_admin_add_room', nonce: NHSA.nonce,
            hotel_id: String(activeHotel.id), room_number: newRoom.number, room_type: newRoom.type,
            price: defPrice, description: defDesc
        });
        const res = await fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
        const json = await res.json();
        setAdding(false);
        if (json?.success) { setNewRoom({ number: '', type: '' }); openHotel(activeHotel); setShowAddRoom(false); }
    }

    async function addHotel(e){
        e.preventDefault();
        const body = new URLSearchParams({ action:'nhsa_admin_add_hotel', nonce: NHSA.nonce, name: newHotel.name, location: newHotel.location });
        const res = await fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
        const json = await res.json();
        if (json?.success) { setNewHotel({ name:'', location:'' }); loadHotels(); }
    }

    function addBulkRow(){ setBulkRows([...bulkRows, { name: '', location: '' }]); }
    function updateBulkRow(idx, field, value){ setBulkRows(bulkRows.map((r, i) => i===idx ? { ...r, [field]: value } : r)); }

    async function submitBulk(){
        for (const row of bulkRows) {
            if (!row.name) continue;
            const body = new URLSearchParams({ action:'nhsa_admin_add_hotel', nonce: NHSA.nonce, name: row.name, location: row.location||'' });
            await fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
        }
        setBulkRows([{ name: '', location: '' }]);
        setShowBulk(false);
        loadHotels();
    }

    async function updateHotelRequest(id, payload){
        const body = new URLSearchParams({ action:'nhsa_admin_update_hotel', nonce: NHSA.nonce, id: String(id), name: payload.name, location: payload.location||'' });
        await fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
        loadHotels();
    }

    function startEdit(h){ setEditingId(h.id); setEditBuffer({ id: h.id, name: h.name, location: h.location||'' }); }
    function cancelEdit(){ setEditingId(null); setEditBuffer({}); }
    async function saveEdit(){ if (!editingId) return; await updateHotelRequest(editingId, editBuffer); cancelEdit(); }

    async function deleteHotel(h){
        if (!confirm('Delete this hotel?')) return;
        const body = new URLSearchParams({ action:'nhsa_admin_delete_hotel', nonce: NHSA.nonce, id: String(h.id) });
        await fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
        if (activeHotel?.id === h.id) { setActiveHotel(null); setRooms([]); }
        loadHotels();
    }

    function startRoomEdit(r){ setRoomEditId(r.id); setRoomEdit({ price: r.price || '', description: r.description || '' }); }
    function cancelRoomEdit(){ setRoomEditId(null); setRoomEdit({ price: '', description: '' }); }
    async function saveRoomEdit(){ if (!roomEditId) return; const body = new URLSearchParams({ action:'nhsa_admin_update_room', nonce: NHSA.nonce, id: String(roomEditId), price: String(roomEdit.price||''), description: String(roomEdit.description||'') }); await fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body }); cancelRoomEdit(); if (activeHotel) openHotel(activeHotel); }
    async function deleteRoom(id){ if (!id) return; if (!confirm('Delete this room?')) return; const body = new URLSearchParams({ action: 'nhsa_admin_delete_room', nonce: NHSA.nonce, id: String(id) }); await fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body }); if (activeHotel) openHotel(activeHotel); }

    const filteredHotels = hotels.filter(h => {
        const q = hotelQuery.trim().toLowerCase();
        if (!q) return true;
        return String(h.name||'').toLowerCase().includes(q) || String(h.location||'').toLowerCase().includes(q);
    });

    return (
        <div className="bg-white rounded-[5px] shadow p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Hotels & Rooms</h2>
                <div className="flex items-center gap-2">
                    <button className="px-3 py-2 bg-slate-900 text-white rounded-[5px] flex items-center gap-2" onClick={()=>setShowBulk(true)}>
                        <AddIcon/>
                        <span>Add Hotel</span>
                    </button>
                    {activeHotel && (
                        <button className="px-3 py-2 border border-gray-300 rounded-[5px] flex items-center gap-2" onClick={()=>setShowBulkRooms(true)}>
                            <AddIcon/>
                            <span>Add Rooms (Bulk)</span>
                        </button>
                    )}
                </div>
            </div>

            {showBulk && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-[5px] shadow p-4 w-full max-w-xl">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold">Add More Hotels</h3>
                            <button className="text-slate-500" onClick={()=>setShowBulk(false)}>✕</button>
                        </div>
                        <div className="space-y-2">
                            {bulkRows.map((row, idx) => (
                                <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <input className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" placeholder="Hotel Name" value={row.name} onChange={e=>updateBulkRow(idx,'name',e.target.value)} />
                                    <input className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" placeholder="Location" value={row.location} onChange={e=>updateBulkRow(idx,'location',e.target.value)} />
                                    {idx === bulkRows.length - 1 ? (
                                        <button type="button" title="Add another row" aria-label="Add another row" className="px-3 py-2 bg-slate-900 text-white rounded-[5px]" onClick={addBulkRow}>+</button>
                                    ) : (
                                        <div></div>
                                    )}
                                </div>
                            ))}
                            <div className="flex justify-end gap-2 pt-2">
                                <button className="px-3 py-2 rounded-[5px] border border-gray-300" onClick={()=>setShowBulk(false)}>Cancel</button>
                                <button className="px-3 py-2 bg-slate-900 text-white rounded-[5px]" onClick={submitBulk}>Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {loading ? <div className="text-sm text-slate-500">Loading...</div> : (
                <div className="flex flex-col md:flex-row gap-6">
                    <aside className="md:w-72 w-full">
                        <div className="border border-gray-200 rounded-[5px] p-3">
                            <input className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" placeholder="Search hotels" value={hotelQuery} onChange={e=>setHotelQuery(e.target.value)} />
                            <div className="flex items-center justify-between mt-3">
                                <div className="inline-flex items-center gap-2 text-sm text-slate-700"><HotelIcon/><span>Hotels</span></div>
                                <span className="text-xs px-2 py-1 bg-slate-100 rounded-[5px] text-slate-700">{filteredHotels.length}</span>
                            </div>
                            <ul className="mt-2 divide-y">
                                {filteredHotels.map(h => (
                                    <li key={h.id} className="relative group">
                                        <div className="flex items-start justify-between gap-2">
                                            <button type="button" className={`flex-1 text-left px-3 py-2 rounded-[5px] ${activeHotel?.id===h.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`} onClick={()=>{ if (editingId===h.id) return; openHotel(h); }}>
                                                {editingId === h.id ? (
                                                    <div className="space-y-2">
                                                        <input className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-2 py-1 focus:ring-2 focus:ring-[#ffd126]" value={editBuffer.name||''} onChange={e=>setEditBuffer({ ...editBuffer, name: e.target.value })} placeholder="Hotel Name" />
                                                        <input className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-2 py-1 focus:ring-2 focus:ring-[#ffd126]" value={editBuffer.location||''} onChange={e=>setEditBuffer({ ...editBuffer, location: e.target.value })} placeholder="Location" />
                                                        <div className="flex items-center gap-2">
                                                            <button type="button" className="px-2 py-1 bg-slate-900 text-white rounded-[5px]" onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); saveEdit(); }}>Save</button>
                                                            <button type="button" className="px-2 py-1 border border-gray-300 rounded-[5px]" onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); cancelEdit(); }}>Cancel</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="font-medium">{h.name}</div>
                                                        {h.location ? <div className="text-xs text-slate-500">{h.location}</div> : null}
                                                    </>
                                                )}
                                            </button>
                                            <div className="px-2 py-2">
                                                <div className="relative" data-hotel-menu={`hotel-${h.id}`}>
                                                    <button type="button" className="p-1 leading-none text-slate-500 hover:text-slate-900" onClick={(e)=>{e.stopPropagation(); setMenuHotelId(menuHotelId===h.id?null:h.id);}} title="More">⋯</button>
                                                    <div className={`absolute right-0 z-20 mt-2 w-40 bg-white text-gray-800 border border-gray-200 rounded-[5px] shadow overflow-hidden ${menuHotelId===h.id ? 'block' : 'hidden'}`}>
                                                        <button type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={(e)=>{e.stopPropagation(); startEdit(h); setMenuHotelId(null);}} title="Edit">Edit</button>
                                                        <button type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600" onClick={(e)=>{e.stopPropagation(); deleteHotel(h); setMenuHotelId(null);}} title="Delete">Delete</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                                {filteredHotels.length === 0 && (
                                    <li className="px-3 py-2 text-sm text-slate-500">No hotels found.</li>
                                )}
                            </ul>
                            {hotels.length === 0 && (
                                <div className="mt-3 text-xs text-slate-600">Create your first hotel using "Add Hotel".</div>
                            )}
                        </div>
                    </aside>
                    <main className="flex-1">
                        {activeHotel ? (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b border-gray-200">
                                    <button type="button" className={`px-4 py-2 -mb-px border-b-2 ${activeTab==='rooms'?'border-slate-900 text-slate-900':'border-transparent text-slate-500 hover:text-slate-900'}`} onClick={()=>setActiveTab('rooms')}>Rooms</button>
                                    <button type="button" className={`px-4 py-2 -mb-px border-b-2 ${activeTab==='types'?'border-slate-900 text-slate-900':'border-transparent text-slate-500 hover:text-slate-900'}`} onClick={()=>setActiveTab('types')}>Room Type Categories</button>
                                </div>

                                {activeTab==='rooms' && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">{activeHotel.name} — Rooms</h3>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <label className="text-sm text-slate-600">Sort by</label>
                                            <select className="bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 text-sm focus:ring-2 focus:ring-[#ffd126] w-auto min-w-[140px] h-10" value={sortBy} onChange={e=>{setSortBy(e.target.value); if(activeHotel) openHotel(activeHotel);}}>
                                                <option value="number">Room Number</option>
                                                <option value="status">Status</option>
                                            </select>
                                            <select className="bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 text-sm focus:ring-2 focus:ring-[#ffd126] w-auto min-w-[90px] h-10" value={sortDir} onChange={e=>{setSortDir(e.target.value); if(activeHotel) openHotel(activeHotel);}}>
                                                <option value="asc">Asc</option>
                                                <option value="desc">Desc</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button className="px-3 py-2 bg-slate-900 text-white rounded-[5px]" onClick={()=>setShowAddRoom(true)}>Add Room</button>
                                        </div>
                                    </div>
                                    <table className="min-w-full text-sm">
                                        <thead className="text-left text-slate-500">
                                            <tr>
                                                <th className="py-2 pr-4">Room Number</th>
                                                <th className="py-2 pr-4">Room Type</th>
                                                <th className="py-2 pr-4">Status</th>
                                                <th className="py-2 pr-4">Price</th>
                                                <th className="py-2 pr-4">Description</th>
                                                <th className="py-2 pr-4">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {rooms.map(r => (
                                                <tr key={r.id}>
                                                    <td className="py-2 pr-4">{r.number}</td>
                                                    <td className="py-2 pr-4 capitalize">{r.room_type}</td>
                                                    <td className="py-2 pr-4 capitalize">
                                                        {r.status === 'available' ? (
                                                            <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Available</span>
                                                        ) : r.status === 'checked_in' ? (
                                                            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700">Checked-In</span>
                                                        ) : (
                                                            <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">Booked</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 pr-4 w-28">
                                                        {roomEditId === r.id ? (
                                                            <input type="number" step="0.01" className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-2 py-1 focus:ring-2 focus:ring-[#ffd126]" value={roomEdit.price} onChange={e=>setRoomEdit({...roomEdit, price: e.target.value})} />
                                                        ) : (
                                                            <span>₱{(Number(r.price)||0).toLocaleString()}</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 pr-4">
                                                        {roomEditId === r.id ? (
                                                            <input type="text" className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-2 py-1 focus:ring-2 focus:ring-[#ffd126]" value={roomEdit.description} onChange={e=>setRoomEdit({...roomEdit, description: e.target.value})} />
                                                        ) : (
                                                            <span className="text-slate-700">{r.description || ''}</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 pr-4">
                                                        {roomEditId === r.id ? (
                                                            <div className="flex items-center gap-2">
                                                                <button className="px-2 py-1 bg-slate-900 text-white rounded-[5px]" onClick={saveRoomEdit}>Save</button>
                                                                <button className="px-2 py-1 border border-gray-300 rounded-[5px]" onClick={cancelRoomEdit}>Cancel</button>
                                                            </div>
                                                        ) : (
                                                            <div className="relative" data-room-menu={`room-${r.id}`}>
                                                                <button type="button" className="px-2 py-1 rounded-[5px] border border-gray-300 bg-white hover:bg-gray-50" onClick={()=>setRoomMenuId(roomMenuId===r.id?null:r.id)} title="More">⋯</button>
                                                                <div className={`absolute right-0 z-20 mt-2 w-40 bg-white text-gray-800 border border-gray-200 rounded-[5px] shadow overflow-hidden ${roomMenuId===r.id?'block':'hidden'}`}>
                                                                    <button type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={()=>{ startRoomEdit(r); setRoomMenuId(null); }} title="Edit">Edit</button>
                                                                    <button type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600" onClick={()=>{ deleteRoom(r.id); setRoomMenuId(null); }} title="Delete">Delete</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {rooms.length === 0 && <tr><td colSpan="6" className="py-3 text-slate-500">No rooms yet.</td></tr>}
                                        </tbody>
                                    </table>
                                </div>
                                )}

                                {activeTab==='types' && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold">Room Type Categories</h3>
                                        <button type="button" className="px-3 py-2 border border-gray-300 rounded-[5px]" onClick={()=>setShowAddRoomType(true)}>Create Room Type</button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead className="text-left text-slate-500">
                                                <tr>
                                                    <th className="py-2 pr-4">Name</th>
                                                    <th className="py-2 pr-4">Default Price</th>
                                                    <th className="py-2 pr-4">Images</th>
                                                    <th className="py-2 pr-4">Amenities</th>
                                                    <th className="py-2 pr-4">Description</th>
                                                    <th className="py-2 pr-4">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {roomTypes.map((t)=> (
                                                    <tr key={t.id}>
                                                        <td className="py-2 pr-4">{t.name}</td>
                                                        <td className="py-2 pr-4">{t.price?`₱${Number(t.price).toLocaleString()}`:'-'}</td>
                                                        <td className="py-2 pr-4">{Array.isArray(t.images)&&t.images.length>0 ? `${t.images.length} image(s)` : '-'}</td>
                                                        <td className="py-2 pr-4">{Array.isArray(t.amenities)&&t.amenities.length>0 ? t.amenities.join(', ') : '-'}</td>
                                                        <td className="py-2 pr-4">{t.description||''}</td>
                                                        <td className="py-2 pr-4">
                                                            <div className="flex items-center gap-2">
                                                                <button className="p-2 rounded-lg hover:bg-slate-100" title="Edit" onClick={()=>{ setEditRoomType({ id:t.id, name:t.name||'', price: String(t.price||''), description:t.description||'', amenities:Array.isArray(t.amenities)?t.amenities:[], images:Array.isArray(t.images)?t.images:[] }); setShowEditRoomType(true); }}>Edit</button>
                                                                <button className="p-2 rounded-lg hover:bg-slate-100" title="Duplicate" onClick={()=>{
                                                                    const clone = { id: 0, name: `${t.name} (Copy)`, price: String(t.price||''), description: t.description||'', amenities: Array.isArray(t.amenities)?[...t.amenities]:[], images: Array.isArray(t.images)?[...t.images]:[] };
                                                                    setEditRoomType(clone);
                                                                    setShowEditRoomType(true);
                                                                }}>Duplicate</button>
                                                                <button className="p-2 rounded-lg hover:bg-slate-100 text-red-600" title="Delete" onClick={()=>{ setDeleteRoomTypeObj(t); setShowDeleteRoomType(true); }}>Delete</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {roomTypes.length===0 && (
                                                    <tr><td colSpan="6" className="py-3 text-slate-500">No room type categories.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-sm text-slate-500">Select a hotel to manage rooms.</div>
                        )}
                    </main>
                </div>
            )}

            {showBulkRooms && activeHotel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-[5px] shadow p-4 w-full max-w-xl">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold">Add Rooms (Bulk) — {activeHotel.name}</h3>
                            <button className="text-slate-500" onClick={()=>setShowBulkRooms(false)}>✕</button>
                        </div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                                <label className="text-sm text-slate-600">Room Range</label>
                                <input className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 md:col-span-2 focus:ring-2 focus:ring-[#ffd126]" placeholder="e.g., 101-110" value={bulkRooms.range} onChange={e=>setBulkRooms({...bulkRooms, range: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                                <label className="text-sm text-slate-600">Room Type</label>
                                <select className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 md:col-span-2 focus:ring-2 focus:ring-[#ffd126]" value={bulkRooms.type} onChange={e=>setBulkRooms({...bulkRooms, type: e.target.value})}>
                                    <option value="standard">Standard</option>
                                    <option value="deluxe">Deluxe</option>
                                    <option value="suite">Suite</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                                <label className="text-sm text-slate-600">Price (PHP)</label>
                                <input type="number" step="0.01" className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 md:col-span-2 focus:ring-2 focus:ring-[#ffd126]" placeholder="e.g., 2200" value={bulkRooms.price||''} onChange={e=>setBulkRooms({...bulkRooms, price: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                                <label className="text-sm text-slate-600">Description</label>
                                <input type="text" className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 md:col-span-2 focus:ring-2 focus:ring-[#ffd126]" placeholder="Short description" value={bulkRooms.description||''} onChange={e=>setBulkRooms({...bulkRooms, description: e.target.value})} />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button className="px-3 py-2 rounded-[5px] border border-gray-300" onClick={()=>setShowBulkRooms(false)}>Cancel</button>
                                <button className="px-3 py-2 bg-slate-900 text-white rounded-[5px]" onClick={async ()=>{
                                    const body = new URLSearchParams({ action: 'nhsa_admin_add_rooms_bulk', nonce: NHSA.nonce, hotel_id: String(activeHotel.id), range: bulkRooms.range, room_type: bulkRooms.type, price: String(bulkRooms.price||''), description: String(bulkRooms.description||'') });
                                    await fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
                                    setShowBulkRooms(false);
                                    setBulkRooms({ range: '', type: 'standard', price: '', description: '' });
                                    openHotel(activeHotel);
                                }}>Create</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showAddRoom && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-[5px] shadow p-4 w-full max-w-xl">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold">Add Room — {activeHotel?.name||''}</h3>
                            <button className="text-slate-500" onClick={()=>setShowAddRoom(false)}>✕</button>
                        </div>
                        <form onSubmit={addRoom} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm text-slate-600 mb-1">Room Number</label>
                                <input className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" placeholder="e.g., 101" value={newRoom.number} onChange={e=>setNewRoom({...newRoom, number:e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-600 mb-1">Room Type</label>
                                <select className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" value={newRoom.type} onChange={e=>setNewRoom({...newRoom, type:e.target.value})} required>
                                    <option value="">Select type</option>
                                    {roomTypes.map(rt => (
                                        <option key={rt.id} value={rt.slug || rt.name}>{rt.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-2 pt-1">
                                <button type="button" className="px-3 py-2 rounded-[5px] border border-gray-300" onClick={()=>setShowAddRoom(false)}>Cancel</button>
                                <button className="px-3 py-2 bg-slate-900 text-white rounded-[5px]" disabled={adding}>{adding?'Adding...':'Create Room'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showAddRoomType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-[5px] shadow p-4 w-full max-w-md">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold">Create Room Type</h3>
                            <button className="text-slate-500" onClick={()=>setShowAddRoomType(false)}>✕</button>
                        </div>
                        <form onSubmit={async (e)=>{ 
                            e.preventDefault();
                            const body = new URLSearchParams({ 
                                action: 'nhsa_admin_add_room_type', 
                                nonce: NHSA.nonce, 
                                name: newRoomType.name, 
                                price: String(newRoomType.price||''), 
                                description: newRoomType.description||'',
                                amenities: JSON.stringify(Array.isArray(newRoomType.amenities)?newRoomType.amenities:[]),
                                images: JSON.stringify(Array.isArray(newRoomType.images)?newRoomType.images:[])
                            }); 
                            const res = await fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body }); 
                            const json = await res.json(); 
                            if (json?.success) { 
                                setNewRoomType({ name:'', price:'', description:'', amenities:[], images:[] }); 
                                setShowAddRoomType(false); 
                                try { 
                                    const rtRes = await fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: new URLSearchParams({ action:'nhsa_admin_list_room_types', nonce: NHSA.nonce }) }); 
                                    const rtJson = await rtRes.json(); 
                                    setRoomTypes(rtJson?.data?.room_types || []); 
                                } catch(e) {} 
                            } 
                        }} className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="block text-sm text-slate-600 mb-1">Name</label>
                                <input className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" value={newRoomType.name} onChange={e=>setNewRoomType({...newRoomType, name:e.target.value})} placeholder="e.g., Deluxe" required />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-600 mb-1">Default Price (PHP)</label>
                                <input type="number" step="0.01" className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" value={newRoomType.price} onChange={e=>setNewRoomType({...newRoomType, price:e.target.value})} placeholder="e.g., 2500" />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-600 mb-1">Description</label>
                                <textarea className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" rows="3" value={newRoomType.description} onChange={e=>setNewRoomType({...newRoomType, description:e.target.value})} placeholder="Short description"></textarea>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-600 mb-1">Amenities</label>
                                <AmenityEditor value={newRoomType.amenities} onChange={(val)=>setNewRoomType({...newRoomType, amenities: val})} />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-600 mb-1">Images (URLs, optional)</label>
                                <ImagesEditor value={newRoomType.images} onChange={(val)=>setNewRoomType({...newRoomType, images: val})} />
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                                <button type="button" className="px-3 py-2 rounded-[5px] border border-gray-300" onClick={()=>setShowAddRoomType(false)}>Cancel</button>
                                <button className="px-3 py-2 bg-slate-900 text-white rounded-[5px]">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEditRoomType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-[5px] shadow p-4 w-full max-w-md">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold">Edit Room Type</h3>
                            <button className="text-slate-500" onClick={()=>setShowEditRoomType(false)}>✕</button>
                        </div>
                        <form onSubmit={async (e)=>{ 
                            e.preventDefault();
                            const isNew = !editRoomType.id;
                            const body = new URLSearchParams({ 
                                action: isNew ? 'nhsa_admin_add_room_type' : 'nhsa_admin_update_room_type', 
                                nonce: NHSA.nonce, 
                                ...(isNew ? {} : { id: String(editRoomType.id) }),
                                name: editRoomType.name, 
                                price: String(editRoomType.price||''), 
                                description: editRoomType.description||'',
                                amenities: JSON.stringify(Array.isArray(editRoomType.amenities)?editRoomType.amenities:[]),
                                images: JSON.stringify(Array.isArray(editRoomType.images)?editRoomType.images:[])
                            }); 
                            await fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body }); 
                            setShowEditRoomType(false);
                            if (activeHotel) openHotel(activeHotel);
                        }} className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="block text-sm text-slate-600 mb-1">Name</label>
                                <input className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" value={editRoomType.name} onChange={e=>setEditRoomType({...editRoomType, name:e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-600 mb-1">Default Price (PHP)</label>
                                <input type="number" step="0.01" className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" value={editRoomType.price} onChange={e=>setEditRoomType({...editRoomType, price:e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-600 mb-1">Description</label>
                                <textarea className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" rows="3" value={editRoomType.description} onChange={e=>setEditRoomType({...editRoomType, description:e.target.value})}></textarea>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-600 mb-1">Amenities</label>
                                <AmenityEditor value={editRoomType.amenities} onChange={(val)=>setEditRoomType({...editRoomType, amenities: val})} />
                            </div>
                            <div>
                                <label className="block text-sm text-slate-600 mb-1">Images (URLs, optional)</label>
                                <ImagesEditor value={editRoomType.images} onChange={(val)=>setEditRoomType({...editRoomType, images: val})} />
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                                <button type="button" className="px-3 py-2 rounded-[5px] border border-gray-300" onClick={()=>setShowEditRoomType(false)}>Cancel</button>
                                <button className="px-3 py-2 bg-slate-900 text-white rounded-[5px]">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showDeleteRoomType && deleteRoomTypeObj && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-[5px] shadow p-4 w-full max-w-md">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold">Delete Room Type</h3>
                            <button className="text-slate-500" onClick={()=>setShowDeleteRoomType(false)}>✕</button>
                        </div>
                        <div className="text-sm text-slate-700">Are you sure you want to delete "{deleteRoomTypeObj.name}"?</div>
                        <div className="flex justify-end gap-2 pt-4">
                            <button className="px-3 py-2 rounded-[5px] border border-gray-300" onClick={()=>setShowDeleteRoomType(false)}>Cancel</button>
                            <button className="px-3 py-2 bg-red-600 text-white rounded-[5px]" onClick={async()=>{
                                const body = new URLSearchParams({ action:'nhsa_admin_delete_room_type', nonce: NHSA.nonce, id: String(deleteRoomTypeObj.id) });
                                await fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body });
                                setShowDeleteRoomType(false);
                                setDeleteRoomTypeObj(null);
                                if (activeHotel) openHotel(activeHotel);
                            }}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HotelsRooms;