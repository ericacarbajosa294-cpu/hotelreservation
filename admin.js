import { createElement, render, useEffect } from '@wordpress/element';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import './index.css';
import Layout from './components/Layout.jsx';
import Dashboard from './components/Dashboard.jsx';
import Bookings from './components/Bookings.jsx';
import HotelsRooms from './components/HotelsRooms.jsx';
import Automation from './components/Automation.jsx';
import Settings from './components/Settings.jsx';
import ActivityLogs from './components/ActivityLogs.jsx';

const InitialRoute = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    useEffect(() => {
        const target = (typeof NHSA !== 'undefined' && NHSA.initialRoute) ? NHSA.initialRoute : '/';
        const current = location.pathname || '/';
        if (current === '/' && target && target !== '/') {
            navigate(target, { replace: true });
        }
    }, []);
    return children;
};

const App = () => (
    <HashRouter>
        <InitialRoute>
            <Layout>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/bookings" element={<Bookings />} />
                    <Route path="/rooms" element={<HotelsRooms />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/automation" element={<Automation />} />
                    <Route path="/activity-logs" element={<ActivityLogs />} />
                    
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Layout>
        </InitialRoute>
    </HashRouter>
);

const root = document.getElementById('nhsa-admin-app');
if (root) {
    render(<App />, root);
}

