import { createElement, useState } from '@wordpress/element';

const Automation = () => {
    const initial = (typeof NHSA !== 'undefined' && NHSA.options) ? NHSA.options : {};
    const [urls, setUrls] = useState({
        booking_created: initial.booking_created || '',
        guest_checked_in: initial.guest_checked_in || '',
        guest_checked_out: initial.guest_checked_out || '',
        payment_received: initial.payment_received || '',
    });
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState('');

    const save = async () => {
        setSaving(true);
        setNotice('');
        const body = new URLSearchParams({
            action: 'nhsa_save_settings',
            nonce: NHSA.nonce,
            ...urls,
        });
        const res = await fetch(NHSA.ajax, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
        const json = await res.json();
        setSaving(false);
        setNotice(json?.data?.message || json?.message || (json?.success ? 'Saved' : 'Error'));
    };

    return (
        <div className="bg-white rounded-[5px] shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Automation</h2>
            <div className="grid gap-4">
                {[
                    ['booking_created', 'Booking Created'],
                    ['guest_checked_in', 'Guest Checked In'],
                    ['guest_checked_out', 'Guest Checked Out'],
                    ['payment_received', 'Payment Received'],
                ].map(([key, label]) => (
                    <div key={key}>
                        <label className="block text-sm text-slate-600 mb-1">{label} Webhook URL</label>
                        <input
                            type="url"
                            className="w-full bg-white text-gray-800 border border-gray-300 rounded-[5px] px-3 py-2 focus:ring-2 focus:ring-[#ffd126]"
                            value={urls[key]}
                            onChange={e => setUrls({ ...urls, [key]: e.target.value })}
                            placeholder="https://hook.eu1.make.com/..."
                        />
                    </div>
                ))}
                <div className="flex items-center gap-3">
                    <button onClick={save} disabled={saving} className="px-4 py-2 bg-slate-900 text-white rounded-[5px]">
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                    {notice && <div className="text-sm text-slate-600">{notice}</div>}
                </div>
            </div>
        </div>
    );
};

export default Automation;

