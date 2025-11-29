import { createElement, useEffect, useState, useRef } from '@wordpress/element';

const ActivityLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ user: '', action: '', from: '', to: '' });
    const [actions, setActions] = useState([]);
    const canView = (typeof NHSA !== 'undefined' && NHSA.currentUserCaps && (NHSA.currentUserCaps.view_logs || NHSA.currentUserCaps.manage_settings)) || false;

    const controllerRef = useRef(null);
    useEffect(() => {
        if (!canView) { setLoading(false); return; }
        const root = (typeof NHSA !== 'undefined' && NHSA.rest && NHSA.rest.root) ? NHSA.rest.root : ((typeof NHSA !== 'undefined' && NHSA.root) ? NHSA.root : '/wp-json/');
        const qs = new URLSearchParams();
        if (filters.user) qs.set('user', String(filters.user));
        if (filters.action) qs.set('action', String(filters.action));
        if (filters.from) qs.set('from', String(filters.from));
        if (filters.to) qs.set('to', String(filters.to));
        const baseUrl = root + 'nichehotel/v1/activity-logs' + (qs.toString() ? ('?' + qs.toString()) : '');
        const nonce = (typeof NHSA !== 'undefined' && NHSA.rest && NHSA.rest.nonce) ? NHSA.rest.nonce : ((typeof NHSA !== 'undefined' && NHSA.nonce) ? NHSA.nonce : '');

        let stopped = false;
        function fetchOnce() {
            try {
                if (controllerRef.current) { controllerRef.current.abort(); }
                controllerRef.current = new AbortController();
                const url = baseUrl + (baseUrl.includes('?') ? '&' : '?') + '_ts=' + Date.now();
                return fetch(url, { credentials: 'same-origin', headers: { 'X-WP-Nonce': nonce }, signal: controllerRef.current.signal })
                    .then(r => r.ok ? r.json() : Promise.reject(r))
                    .then(data => {
                        if (stopped) return;
                        const list = Array.isArray(data.logs) ? data.logs : [];
                        setLogs(prev => {
                            // Only update if changed to limit re-renders
                            if (prev && prev.length === list.length && prev[0] && list[0] && prev[0].id === list[0].id) {
                                return prev;
                            }
                            return list;
                        });
                        setLoading(false);
                    })
                    .catch(() => { if (!stopped) setLoading(false); });
            } catch (e) {
                setLoading(false);
            }
        }

        fetchOnce();
        const interval = setInterval(fetchOnce, 5000);
        return () => { stopped = true; clearInterval(interval); if (controllerRef.current) controllerRef.current.abort(); };
    }, [canView, filters.user, filters.action, filters.from, filters.to]);

    useEffect(() => {
        if (!canView) return;
        const root = (typeof NHSA !== 'undefined' && NHSA.rest && NHSA.rest.root) ? NHSA.rest.root : ((typeof NHSA !== 'undefined' && NHSA.root) ? NHSA.root : '/wp-json/');
        const url = root + 'nichehotel/v1/activity-actions?_ts=' + Date.now();
        const nonce = (typeof NHSA !== 'undefined' && NHSA.rest && NHSA.rest.nonce) ? NHSA.rest.nonce : ((typeof NHSA !== 'undefined' && NHSA.nonce) ? NHSA.nonce : '');
        fetch(url, { credentials: 'same-origin', headers: { 'X-WP-Nonce': nonce } })
            .then(r => r.ok ? r.json() : Promise.reject(r))
            .then(data => { if (Array.isArray(data.actions)) setActions(data.actions); })
            .catch(()=>{});
    }, [canView]);

    if (!canView) {
        return (
            <div className="p-4">
                <h2 className="text-xl font-semibold mb-3">Activity Logs</h2>
                <div className="text-sm text-slate-600">You do not have permission to view logs.</div>
            </div>
        );
    }

    return (
        <div className="p-4">
            <h2 className="text-xl font-semibold mb-3">Activity Logs</h2>
            {/* Filters */}
            <div className="mb-3 flex flex-wrap items-end gap-2">
                <div className="min-w-[200px]">
                    <label className="block text-xs text-slate-600 mb-1">User</label>
                    <input type="text" value={filters.user} onChange={e=>setFilters(f=>({...f, user:e.target.value}))} className="border rounded px-2 py-1 text-sm w-full" placeholder="ID or Name" />
                </div>
                <div>
                    <label className="block text-xs text-slate-600 mb-1">Action</label>
                    <select value={filters.action} onChange={e=>setFilters(f=>({...f, action:e.target.value}))} className="border rounded px-2 py-1 text-sm min-w-[220px]">
                        <option value="">All</option>
                        {actions.map(a => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-slate-600 mb-1">From</label>
                    <input type="date" value={filters.from} onChange={e=>setFilters(f=>({...f, from:e.target.value}))} className="border rounded px-2 py-1 text-sm" />
                </div>
                <div>
                    <label className="block text-xs text-slate-600 mb-1">To</label>
                    <input type="date" value={filters.to} onChange={e=>setFilters(f=>({...f, to:e.target.value}))} className="border rounded px-2 py-1 text-sm" />
                </div>
                <div className="ml-auto">
                    <a
                        href={(function(){
                            const root = (typeof NHSA !== 'undefined' && NHSA.rest && NHSA.rest.root) ? NHSA.rest.root : ((typeof NHSA !== 'undefined' && NHSA.root) ? NHSA.root : '/wp-json/');
                            const p = new URLSearchParams();
                            if (filters.user) p.set('user', String(filters.user));
                            if (filters.action) p.set('action', String(filters.action));
                            if (filters.from) p.set('from', String(filters.from));
                            if (filters.to) p.set('to', String(filters.to));
                            p.set('_wpnonce', (typeof NHSA !== 'undefined' && NHSA.rest && NHSA.rest.nonce) ? NHSA.rest.nonce : '');
                            return root + 'nichehotel/v1/activity-logs/export' + (p.toString() ? ('?' + p.toString()) : '');
                        })()}
                        className="inline-flex items-center px-3 py-1.5 rounded bg-slate-900 text-white text-sm"
                    >Export CSV</a>
                </div>
            </div>
            {loading ? (
                <div className="text-sm text-slate-600">Loading...</div>
            ) : (
                <div className="overflow-auto max-h-[70vh]">
                    <table className="min-w-[800px] w-full border border-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wide p-2 border-b border-slate-200">User</th>
                                <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wide p-2 border-b border-slate-200">Action</th>
                                <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wide p-2 border-b border-slate-200">Details</th>
                                <th className="text-left text-xs font-semibold text-slate-600 uppercase tracking-wide p-2 border-b border-slate-200">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((row) => (
                                <tr key={row.id} className="odd:bg-white even:bg-slate-50">
                                    <td className="p-2 align-top text-sm text-slate-800">{String(row.user_name || row.user_id || '')}</td>
                                    <td className="p-2 align-top text-sm text-slate-800">{String(row.action || '')}</td>
                                    <td className="p-2 align-top text-sm text-slate-800 whitespace-pre-wrap break-words">{String(row.details || '')}</td>
                                    <td className="p-2 align-top text-sm text-slate-800">{(function(){
                                        const s = String(row.timestamp || '');
                                        if (!s) return '';
                                        const d = new Date(s.replace(' ', 'T'));
                                        if (isNaN(d.getTime())) return s;
                                        let hh = d.getHours();
                                        const mm = String(d.getMinutes()).padStart(2,'0');
                                        const ampm = hh >= 12 ? 'PM' : 'AM';
                                        hh = hh % 12; if (hh === 0) hh = 12;
                                        const yyyy = d.getFullYear();
                                        const mon = String(d.getMonth()+1).padStart(2,'0');
                                        const dd = String(d.getDate()).padStart(2,'0');
                                        return `${yyyy}-${mon}-${dd} ${hh}:${mm} ${ampm}`;
                                    })()}</td>
                                </tr>
                            ))}
                            {(!logs || logs.length === 0) && (
                                <tr>
                                    <td colSpan="4" className="p-4 text-sm text-slate-600 text-center">No logs found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ActivityLogs;

