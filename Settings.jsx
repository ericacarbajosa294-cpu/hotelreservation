import { useEffect, useState } from '@wordpress/element';
import { Settings as SettingsIcon, Plug, CreditCard, BadgeCheck } from 'lucide-react';

export default function Settings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        enablePromo: true,
        defaultBranch: '',
        taxRate: 12,
        buttonLabel: 'Check Availability',
    });
    const [hotels, setHotels] = useState([]);
    const [section, setSection] = useState('form'); // form | booking | payment | license
    const initialKey = (typeof NHSA !== 'undefined' && (NHSA.options?.gumroad_key || NHSA.options?.license_key)) ? (NHSA.options?.gumroad_key || NHSA.options?.license_key) : '';
    const initialStatus = (typeof NHSA !== 'undefined' && NHSA.options?.license_status) ? NHSA.options.license_status : 'inactive';
    const [licenseKey, setLicenseKey] = useState(initialKey);
    const [licenseStatus, setLicenseStatus] = useState(initialStatus);
    const [licenseLoading, setLicenseLoading] = useState(false);
    const [licenseError, setLicenseError] = useState('');
    const [pay, setPay] = useState({ paypalEnabled: false, paypalMode: 'sandbox', paypalClientId: '', paypalSecret: '', accountType: 'business' });
    const [payLoading, setPayLoading] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                const [settingsRes, hotelsRes, payRes] = await Promise.all([
                    fetch(NHSA.ajax, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ action: 'nhsa_get_booking_form_settings', nonce: NHSA.nonce }) }),
                    fetch(NHSA.ajax, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ action: 'nhsa_admin_list_hotels', nonce: NHSA.nonce }) }),
                    fetch(NHSA.ajax, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ action: 'nhsa_get_payment_settings', nonce: NHSA.nonce }) }),
                ]);
                const sjson = await settingsRes.json();
                const hjson = await hotelsRes.json();
                const pjson = await payRes.json();
                if (sjson.success && sjson.data) setSettings(sjson.data);
                setHotels(hjson?.data?.hotels || []);
                if (pjson?.success && pjson?.data) setPay({
                    paypalEnabled: !!pjson.data.paypalEnabled,
                    paypalMode: pjson.data.paypalMode || 'sandbox',
                    paypalClientId: pjson.data.paypalClientId || '',
                    paypalSecret: pjson.data.paypalSecret || '',
                    accountType: pjson.data.accountType || 'business',
                });
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

    async function activateLicense() {
        setLicenseLoading(true);
        setLicenseError('');
        const body = new URLSearchParams({ action: 'nhsa_gumroad_activate', nonce: NHSA.nonce, license_key: licenseKey });
        const res = await fetch(NHSA.ajax, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
        const json = await res.json();
        setLicenseLoading(false);
        if (json.success) {
            setLicenseStatus(json.data?.status || 'active');
            if (typeof NHSA !== 'undefined' && NHSA.options) { NHSA.options.gumroad_key = licenseKey; }
            try { window.dispatchEvent(new CustomEvent('nhsa-license-updated', { detail: { status: json.data?.status, trialEnd: json.data?.trialEnd||'' } })); } catch(e){}
        } else {
            const msg = (json?.data && (json.data.message||json.data.error)) || json?.message || 'Connection error. Please try again.';
            setLicenseError(msg);
        }
    }

    async function deactivateLicense() {
        setLicenseLoading(true);
        setLicenseError('');
        const body = new URLSearchParams({ action: 'nhsa_gumroad_deactivate', nonce: NHSA.nonce });
        const res = await fetch(NHSA.ajax, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
        const json = await res.json();
        setLicenseLoading(false);
        if (json.success) { setLicenseStatus(json.data?.status || 'inactive'); if (typeof NHSA !== 'undefined' && NHSA.options) { NHSA.options.gumroad_key=''; } try { window.dispatchEvent(new CustomEvent('nhsa-license-updated', { detail: { status: json.data?.status||'inactive', trialEnd: '' } })); } catch(e){} } else setLicenseError(json?.data?.message || json?.message || 'Connection error. Please try again.');
    }

    if (loading) return <div className="p-4">Loading…</div>;

    return (
        <div className="bg-white rounded-[5px] shadow p-4">
            <div className="flex flex-col md:flex-row gap-6">
                <aside className="md:w-72 w-full">
                    <div className="border border-gray-200 rounded-[5px] p-3">
                        
                        <ul className="mt-2 divide-y">
                            <li>
                                <button type="button" className={`w-full text-left px-3 py-2 rounded-[5px] ${section==='form' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`} onClick={()=>setSection('form')}>
                                    <div className="inline-flex items-center gap-2"><SettingsIcon className="w-4 h-4" /><span>Form Settings</span></div>
                                </button>
                            </li>
                            <li>
                                <button type="button" className={`w-full text-left px-3 py-2 rounded-[5px] ${section==='booking' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`} onClick={()=>setSection('booking')}>
                                    <div className="inline-flex items-center gap-2"><Plug className="w-4 h-4" /><span>Booking Integration</span></div>
                                </button>
                            </li>
                            <li>
                                <button type="button" className={`w-full text-left px-3 py-2 rounded-[5px] ${section==='payment' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`} onClick={()=>setSection('payment')}>
                                    <div className="inline-flex items-center gap-2"><CreditCard className="w-4 h-4" /><span>Payment Integration</span></div>
                                </button>
                            </li>
                            <li>
                                <button type="button" className={`w-full text-left px-3 py-2 rounded-[5px] ${section==='license' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`} onClick={()=>setSection('license')}>
                                    <div className="inline-flex items-center gap-2"><BadgeCheck className="w-4 h-4" /><span>License</span></div>
                                </button>
                            </li>
                        </ul>
                    </div>
                </aside>
                <main className="flex-1">
                    {section === 'form' && (
                        <div className="rounded-[5px] border border-gray-200 p-4">
                            <h2 className="text-xl font-semibold mb-4">Form Settings</h2>
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
                    )}
                    {section === 'booking' && (
                        <div className="rounded-[5px] border border-gray-200 p-4">
                            <h2 className="text-xl font-semibold mb-2">Booking Integration</h2>
                            <p className="text-sm text-slate-600">Configure webhooks and external booking integrations here.</p>
                            <div className="mt-3 grid gap-3">
                                <label className="block">
                                    <span className="block text-sm text-gray-700 mb-1">Booking Created Webhook URL</span>
                                    <input type="url" className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" placeholder="https://example.com/webhook" disabled />
                                </label>
                                <label className="block">
                                    <span className="block text-sm text-gray-700 mb-1">Other Integrations</span>
                                    <input type="text" className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" placeholder="Coming soon" disabled />
                                </label>
                            </div>
                        </div>
                    )}
                    {section === 'payment' && (
                        <div className="rounded-[5px] border border-gray-200 p-4">
                            <h2 className="text-xl font-semibold mb-2">Payment Integration</h2>
                            <p className="text-sm text-slate-600">Connect PayPal for online payments. Supports personal or business accounts via API credentials.</p>
                            <div className="mt-3 grid gap-3 max-w-xl">
                                <label className="inline-flex items-center gap-2">
                                    <input type="checkbox" checked={!!pay.paypalEnabled} onChange={(e)=>setPay({...pay, paypalEnabled: e.target.checked})} />
                                    <span className="text-sm">Enable PayPal</span>
                                </label>
                                <label className="block">
                                    <span className="block text-sm text-gray-700 mb-1">Payment Method</span>
                                    <select className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" value={pay.paymentMethod||'branch'} onChange={(e)=>setPay({...pay, paymentMethod: e.target.value})}>
                                        <option value="online">Online (PayPal)</option>
                                        <option value="branch">Pay at Branch</option>
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="block text-sm text-gray-700 mb-1">Account Type</span>
                                    <select className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" value={pay.accountType} onChange={(e)=>setPay({...pay, accountType:e.target.value})}>
                                        <option value="personal">Personal</option>
                                        <option value="business">Business</option>
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="block text-sm text-gray-700 mb-1">Mode</span>
                                    <select className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" value={pay.paypalMode} onChange={(e)=>setPay({...pay, paypalMode:e.target.value})}>
                                        <option value="sandbox">Sandbox (test)</option>
                                        <option value="live">Live</option>
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="block text-sm text-gray-700 mb-1">PayPal Client ID</span>
                                    <input type="text" className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" value={pay.paypalClientId} onChange={(e)=>setPay({...pay, paypalClientId:e.target.value})} placeholder="Your PayPal REST Client ID" />
                                </label>
                                <label className="block">
                                    <span className="block text-sm text-gray-700 mb-1">PayPal Secret</span>
                                    <input type="password" className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" value={pay.paypalSecret} onChange={(e)=>setPay({...pay, paypalSecret:e.target.value})} placeholder="Your PayPal REST Secret" />
                                </label>
                                <div>
                                    <button className="px-4 py-2 bg-slate-900 text-white rounded-[5px]" disabled={payLoading} onClick={async ()=>{
                                        setPayLoading(true);
                                        try {
                                            const res = await fetch(NHSA.ajax, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: new URLSearchParams({ action:'nhsa_save_payment_settings', nonce: NHSA.nonce, payload: JSON.stringify(pay) }) });
                                            await res.json();
                                        } finally {
                                            setPayLoading(false);
                                        }
                                    }}>{payLoading?'Saving…':'Save Payment Settings'}</button>
                                </div>
                            </div>
                        </div>
                    )}
                    {section === 'license' && (
                        <div className="rounded-[5px] border border-gray-200 p-4">
                            <h2 className="text-xl font-semibold mb-2">License</h2>
                            <div className="grid gap-4 max-w-xl">
                                <div>
                                    <label className="block text-sm text-slate-600 mb-1">License Key</label>
                                    <input type="text" className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]" value={licenseKey} onChange={e => setLicenseKey(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX" />
                                </div>
                                <div className="flex items-center gap-3">
                                    {licenseStatus === 'active' ? (
                                        <button onClick={deactivateLicense} disabled={licenseLoading} className="px-4 py-2 bg-red-600 text-white rounded-[5px]">
                                            {licenseLoading ? 'Processing…' : 'Deactivate'}
                                        </button>
                                    ) : (
                                        <button onClick={activateLicense} disabled={licenseLoading} className="px-4 py-2 bg-slate-900 text-white rounded-[5px]">
                                            {licenseLoading ? 'Processing…' : 'Activate'}
                                        </button>
                                    )}
                                    <div className={`text-sm ${licenseStatus==='active' ? 'text-emerald-600' : (licenseStatus==='expired' ? 'text-amber-600' : 'text-slate-600')}`}>Status: {licenseStatus ? licenseStatus.charAt(0).toUpperCase()+licenseStatus.slice(1) : 'Inactive'}</div>
                                </div>
                                {licenseError && (
                                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-[5px] px-3 py-2">
                                        {licenseError}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}