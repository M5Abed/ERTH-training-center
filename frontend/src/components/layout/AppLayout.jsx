import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ExternalTrackSelectionModal from '../ExternalTrackSelectionModal';
import { useI18n } from '../../contexts/I18nContext';
import './AppLayout.css';

export default function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { lang } = useI18n();

    return (
        <div className="app-layout">
            <div className="bg-glow" />
            <ExternalTrackSelectionModal />
            {/* Sidebar kept only for mobile slide-out */}
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="app-main">
                <Topbar onMenuClick={() => setSidebarOpen(true)} />
                <main className="app-content">
                    <Outlet />
                </main>
                <footer style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.85rem', color: 'var(--text-2)', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span>
                            Engineered &amp; Powered by <a href="https://erth.dev" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-1)', textDecoration: 'underline', fontWeight: '600' }}>ERTH</a>
                        </span>
                    </div>
                </footer>
            </div>
        </div>
    );
}
