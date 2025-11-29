import { createElement, useEffect, useState } from '@wordpress/element';

const StatCard = ({ label, value }) => (
    <div className="bg-white rounded-[5px] shadow p-4 flex-1">
        <div className="text-slate-500 text-sm">{label}</div>
        <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
);

const Sparkline = ({ data = [], color = 'stroke-slate-700' }) => {
    const width = 160, height = 48, padding = 4;
    if (!data || data.length === 0) return (<svg width={width} height={height}/>);
    const max = Math.max(...data, 1);
    const step = (width - padding * 2) / (data.length - 1 || 1);
    const points = data.map((v, i) => [padding + i * step, height - padding - (v / max) * (height - padding * 2)]);
    const d = points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
    return (
        <svg width={width} height={height} className="overflow-visible">
            <path d={d} className={`${color} fill-none`} strokeWidth="2"/>
        </svg>
    );
};

const Bars = ({ data = [], color = 'fill-slate-700' }) => {
    const width = 160, height = 48, padding = 4;
    const max = Math.max(...data, 1);
    const barW = Math.max(2, Math.floor((width - padding * 2) / (data.length || 1) - 2));
    return (
        <svg width={width} height={height} className="overflow-visible">
            {data.map((v, i) => {
                const h = (v / max) * (height - padding * 2);
                const x = padding + i * (barW + 2);
                const y = height - padding - h;
                return <rect key={i} x={x} y={y} width={barW} height={h} className={color} rx="2"/>;
            })}
        </svg>
    );
};

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({ totalRooms: 0, availableRooms: 0, days: [], occupancy: [], checkins: [], checkouts: [] });
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const body = new URLSearchParams({ action: 'nhsa_admin_dashboard_metrics', nonce: NHSA.nonce });
                const res = await fetch(NHSA.ajax, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
                const json = await res.json();
                if (!cancelled && json?.success) setMetrics(json.data);
            } finally { if (!cancelled) setLoading(false); }
        })();
        return () => { cancelled = true; };
    }, []);

    const todayIdx = 0;
    const todaysCheckins = metrics.checkins[todayIdx] || 0;
    const todaysCheckouts = metrics.checkouts[todayIdx] || 0;
    const occupancyPct = metrics.totalRooms > 0 ? Math.round(((metrics.occupancy[todayIdx] || 0) / metrics.totalRooms) * 100) : 0;

    return (
        <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-[5px] shadow p-4 flex-1">
                    <div className="text-slate-500 text-sm">Occupancy</div>
                    <div className="text-3xl font-bold mt-2">{occupancyPct}%</div>
                    <div className="mt-2"><Sparkline data={metrics.occupancy} color="stroke-emerald-600"/></div>
                </div>
                <div className="bg-white rounded-[5px] shadow p-4 flex-1">
                    <div className="text-slate-500 text-sm">Today's Check-ins</div>
                    <div className="text-3xl font-bold mt-2">{todaysCheckins}</div>
                    <div className="mt-2"><Bars data={metrics.checkins} color="fill-blue-600"/></div>
                </div>
                <div className="bg-white rounded-[5px] shadow p-4 flex-1">
                    <div className="text-slate-500 text-sm">Today's Check-outs</div>
                    <div className="text-3xl font-bold mt-2">{todaysCheckouts}</div>
                    <div className="mt-2"><Bars data={metrics.checkouts} color="fill-slate-600"/></div>
                </div>
            </div>
            <div className="bg-white rounded-[5px] shadow p-4">
                <div className="text-slate-500 text-sm mb-1">Inventory</div>
                <div className="text-lg font-semibold">{metrics.availableRooms} available / {metrics.totalRooms} total rooms</div>
            </div>
        </div>
    );
};

export default Dashboard;

