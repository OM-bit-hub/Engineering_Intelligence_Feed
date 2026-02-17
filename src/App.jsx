import { useState, useCallback } from 'react'
import IntelligenceFeed from './IntelligenceFeed'
import BuildersPage from './BuildersPage'
import SettingsPage from './SettingsPage'
import ToastContainer from './Toast'
import './App.css'

function App() {
    const [page, setPage] = useState('feed')
    const [toasts, setToasts] = useState([])

    const showToast = useCallback((message, type = 'success') => {
        const id = Date.now() + Math.random()
        setToasts(prev => [...prev, { id, message, type }])
    }, [])

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    return (
        <div className="app">
            <header className="header">
                <div className="header-content">
                    <div className="logo" onClick={() => setPage('feed')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setPage('feed') }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#6C5CE7" />
                            <path d="M2 17l10 5 10-5" stroke="#A29BFE" strokeWidth="2" fill="none" />
                            <path d="M2 12l10 5 10-5" stroke="#A29BFE" strokeWidth="2" fill="none" />
                        </svg>
                        <span>Engineering Intelligence</span>
                    </div>
                    <nav className="nav-tabs">
                        <button className={`nav-tab ${page === 'feed' ? 'active' : ''}`} onClick={() => setPage('feed')}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                                <polyline points="17 6 23 6 23 12" />
                            </svg>
                            Feed
                        </button>
                        <button className={`nav-tab ${page === 'builders' ? 'active' : ''}`} onClick={() => setPage('builders')}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                            Builders
                        </button>
                        <button className={`nav-tab ${page === 'settings' ? 'active' : ''}`} onClick={() => setPage('settings')}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                            Settings
                        </button>
                    </nav>
                </div>
            </header>

            <main className="main-content">
                {page === 'feed' && <IntelligenceFeed onNavigate={setPage} />}
                {page === 'builders' && <BuildersPage showToast={showToast} />}
                {page === 'settings' && <SettingsPage showToast={showToast} />}
            </main>

            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
    )
}

export default App
