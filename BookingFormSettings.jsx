import { useEffect, useState } from '@wordpress/element';

export default function BookingFormSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        enablePromo: true,
        defaultBranch: '',
        taxRate: 12,
        buttonLabel: 'Check Availability',
    });
	const [hotels, setHotels] = useState([]);

    useEffect(() => {
        async function load() {
            try {
                const [settingsRes, hotelsRes] = await Promise.all([
                    fetch(NHSA.ajax, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ action: 'nhsa_get_booking_form_settings', nonce: NHSA.nonce }) }),
                    fetch(NHSA.ajax, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ action: 'nhsa_admin_list_hotels', nonce: NHSA.nonce }) }),
                ]);
                const sjson = await settingsRes.json();
                const hjson = await hotelsRes.json();
                if (sjson.success && sjson.data) setSettings(sjson.data);
                setHotels(hjson?.data?.hotels || []);
            } finally { setLoading(false); }
        }
        load();
    }, []);

    async function save() {
        setSaving(true);
        try {
            const res = await fetch(NHSA.ajax, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ action: 'nhsa_save_booking_form_settings', nonce: NHSA.nonce, payload: JSON.stringify(settings) }),
            });
            await res.json();
        } finally { setSaving(false); }
    }

    if (loading) return <div className="p-4">Loading…</div>;

    return (
        <div className="bg-white rounded-[5px] shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Booking Form Settings</h2>
            <div className="grid md:grid-cols-2 gap-4">
                <label className="block">
                    <span className="block text-sm text-gray-700 mb-1">Enable Promo Code</span>
                    <input type="checkbox" className="rounded-[5px]" checked={settings.enablePromo} onChange={(e)=>setSettings({ ...settings, enablePromo: e.target.checked })} />
                </label>
                <label className="block">
                    <span className="block text-sm text-gray-700 mb-1">Default Branch</span>
                    <select className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" value={settings.defaultBranch} onChange={(e)=>setSettings({ ...settings, defaultBranch: e.target.value })}>
                        <option value="">None</option>
                        {hotels.map((h)=> (
                            <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                    </select>
                </label>
                <label className="block">
                    <span className="block text-sm text-gray-700 mb-1">Tax Rate (%)</span>
                    <input type="number" className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" value={settings.taxRate} onChange={(e)=>setSettings({ ...settings, taxRate: Number(e.target.value||0) })} />
                </label>
                <label className="block">
                    <span className="block text-sm text-gray-700 mb-1">Button Label</span>
                    <input type="text" className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" value={settings.buttonLabel} onChange={(e)=>setSettings({ ...settings, buttonLabel: e.target.value })} />
                </label>
            </div>
            <div className="mt-4">
                <button className="px-4 py-2 bg-slate-900 text-white rounded-[5px]" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</button>
            </div>
        </div>
    );
}

