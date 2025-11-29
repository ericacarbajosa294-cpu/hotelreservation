import { createElement, useEffect, useState } from '@wordpress/element';
import { Home, CalendarCheck, Bed, Settings as SettingsIcon, Zap, BadgeCheck, List } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

	const NavLink = ({ to, children }) => {
		const location = useLocation();
		const isActive = to === '/' ? (location.pathname === '/' ) : (location.pathname === to);
		const base = 'px-4 py-2 rounded-[5px] text-sm font-medium inline-flex items-center gap-2';
		const active = 'bg-slate-900 text-white shadow';
		const inactive = 'text-slate-700 hover:bg-slate-100';
		return (
			<Link className={`${base} ${isActive ? active : inactive}`} to={to}>{children}</Link>
		);
	};

const Layout = ({ children }) => {
    const initialStatus = (typeof NHSA !== 'undefined' && NHSA.options && (NHSA.options.gumroad_status || NHSA.options.license_status)) || 'inactive';
    const initialTrialEnd = (typeof NHSA !== 'undefined' && NHSA.options && (NHSA.options.gumroad_trial_end || '')) || '';
    const [licenseStatus, setLicenseStatus] = useState(initialStatus);
    const [trialEnd, setTrialEnd] = useState(initialTrialEnd);
    const isLocked = !(licenseStatus === 'active' || licenseStatus === 'trial');

    useEffect(() => {
        function onUpdate(e){
            if (e && e.detail) {
                if (e.detail.status) setLicenseStatus(e.detail.status);
                if (e.detail.trialEnd !== undefined) setTrialEnd(e.detail.trialEnd||'');
            }
        }
        window.addEventListener('nhsa-license-updated', onUpdate);
        // Poll whoami to hot-reload capabilities and REST nonce so nav updates without logout
        let t = null;
        function poll(){
            try {
                const url = (typeof NHSA !== 'undefined' && NHSA.ajax) ? NHSA.ajax : ajaxurl;
                const nonce = (typeof NHSA !== 'undefined' && NHSA.nonce) ? NHSA.nonce : '';
                const body = new URLSearchParams();
                body.set('action','nhsa_whoami');
                body.set('nonce', nonce);
                fetch(url, { method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: body.toString() })
                    .then(r => r.ok ? r.json() : null)
                    .then(data => {
                        if (data && data.success && data.data) {
                            if (typeof NHSA !== 'undefined') {
                                if (data.data.caps) { NHSA.currentUserCaps = data.data.caps; }
                                if (data.data.rest) { NHSA.rest = data.data.rest; }
                            }
                        }
                    })
                    .catch(()=>{})
                    .finally(()=>{ t = setTimeout(poll, 10000); });
            } catch (e) {
                t = setTimeout(poll, 10000);
            }
        }
        t = setTimeout(poll, 10000);
        return () => { window.removeEventListener('nhsa-license-updated', onUpdate); if (t) clearTimeout(t); };
    }, []);
    return (
        <div className="nhsa-admin font-sans text-base">
            <div className={`max-w-6xl mx-auto p-4 ${isLocked ? 'relative' : ''}`}>
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">NicheHotel Sync</h1>
                </div>
                {true && (
                    (()=>{
                        const status = licenseStatus;
                        if (status === 'trial') {
                            const endIso = trialEnd || (typeof NHSA!=='undefined' && NHSA.options && NHSA.options.gumroad_trial_end) || '';
                            const end = endIso ? new Date(endIso) : null;
                            const now = new Date();
                            const diffDays = end ? Math.ceil((end.getTime() - now.getTime()) / (1000*60*60*24)) : null;
                            const daysLeft = (diffDays!==null) ? (diffDays > 0 ? String(diffDays) : '0') : '';
                            return (
                                <div className="mb-3 p-3 rounded-[5px] bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
                                    <div className="text-sm text-emerald-800">Free trial active{daysLeft!=='' ? ` — ${daysLeft} day${daysLeft==='1'?'':'s'} left` : ''}.</div>
                                    <a href="https://pinoyvaautomation.gumroad.com/l/NicheHotelSyncAI" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-emerald-600 text-white rounded-[5px] font-medium">Upgrade</a>
                                </div>
                            );
                        }
                        if (status !== 'active') {
                            return (
                                <div className="mb-3 p-3 rounded-[5px] bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                                    <div className="text-sm text-slate-700">Unlock premium features — start your free trial now.</div>
                                    <a href="https://pinoyvaautomation.gumroad.com/l/NicheHotelSyncAI" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-[#ffd126] text-[#00488a] rounded-[5px] font-medium">Start free trial</a>
                                </div>
                            );
                        }
                        return null;
                    })()
                )}
                <div className={`bg-white rounded-[5px] shadow p-2 mb-6 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
					<nav className="flex items-center justify-between gap-2">
						<div className="flex gap-2">
							{(typeof NHSA !== 'undefined' && NHSA.currentUserCaps && NHSA.currentUserCaps.manage_settings) && (
								<NavLink to="/"><Home className="w-4 h-4" /><span>Dashboard</span></NavLink>
							)}
							{(typeof NHSA !== 'undefined' && NHSA.currentUserCaps && NHSA.currentUserCaps.edit_bookings) && (
								<NavLink to="/bookings"><CalendarCheck className="w-4 h-4" /><span>Bookings</span></NavLink>
							)}
							{(typeof NHSA !== 'undefined' && NHSA.currentUserCaps && NHSA.currentUserCaps.manage_settings) && (
								<NavLink to="/rooms"><Bed className="w-4 h-4" /><span>Hotels & Rooms</span></NavLink>
							)}
							{(typeof NHSA !== 'undefined' && NHSA.currentUserCaps && NHSA.currentUserCaps.manage_settings) && (
								<NavLink to="/automation"><Zap className="w-4 h-4" /><span>Automation</span></NavLink>
							)}
							{(typeof NHSA !== 'undefined' && NHSA.currentUserCaps && NHSA.currentUserCaps.view_logs) && (
								<NavLink to="/activity-logs"><List className="w-4 h-4" /><span>Activity Logs</span></NavLink>
							)}
						</div>
						<div className="flex gap-2 ml-auto">
							{(typeof NHSA !== 'undefined' && NHSA.currentUserCaps && NHSA.currentUserCaps.manage_settings) && (
								<NavLink to="/settings"><SettingsIcon className="w-4 h-4" /><span>Settings</span></NavLink>
							)}
						</div>
					</nav>
                </div>
                <div className={`${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                    {children}
                </div>
                {isLocked && (
                    <div className="absolute inset-0 z-40 bg-white/60 backdrop-blur-[1px]"></div>
                )}
            </div>
        </div>
    );
};

export default Layout;