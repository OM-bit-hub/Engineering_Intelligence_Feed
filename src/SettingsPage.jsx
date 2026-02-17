import { useState, useEffect, useCallback } from 'react'

const HEALTH_SERVICES = [
    { key: 'database', label: 'Database', icon: '🗄️', description: 'Supabase PostgreSQL' },
    { key: 'anthropic', label: 'Claude AI', icon: '🧠', description: 'Content scoring & analysis' },
    { key: 'slack', label: 'Slack', icon: '💬', description: 'Weekly digest delivery' },
    { key: 'linkedin', label: 'LinkedIn', icon: '🔗', description: 'Builder content monitoring' },
    { key: 'twitter', label: 'Twitter / X', icon: '🐦', description: 'Builder content monitoring' },
    { key: 'github', label: 'GitHub', icon: '🐙', description: 'Repository & activity tracking' },
]

export default function SettingsPage({ showToast }) {
    const [settings, setSettings] = useState(null)
    const [stats, setStats] = useState(null)
    const [health, setHealth] = useState(null)
    const [loading, setLoading] = useState(true)
    const [ingesting, setIngesting] = useState(false)
    const [savingField, setSavingField] = useState(null)

    const fetchAll = useCallback(() => {
        Promise.all([
            fetch('/api/settings').then(r => r.json()),
            fetch('/api/settings/stats').then(r => r.json()),
            fetch('/api/settings/health').then(r => r.json()),
        ])
            .then(([s, st, h]) => {
                setSettings(s)
                setStats(st)
                setHealth(h)
            })
            .catch(() => showToast('Failed to load settings', 'error'))
            .finally(() => setLoading(false))
    }, [showToast])

    useEffect(() => { fetchAll() }, [fetchAll])

    const handleToggle = async (field) => {
        if (!settings) return
        const newValue = !settings[field]
        setSettings(prev => ({ ...prev, [field]: newValue }))
        setSavingField(field)

        try {
            const res = await fetch('/api/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: newValue })
            })
            if (!res.ok) throw new Error()
            showToast(`${field.replace(/_/g, ' ')} ${newValue ? 'enabled' : 'disabled'}`, 'success')
        } catch {
            setSettings(prev => ({ ...prev, [field]: !newValue }))
            showToast('Failed to update setting', 'error')
        } finally {
            setSavingField(null)
        }
    }

    const handleTriggerIngestion = async () => {
        setIngesting(true)
        try {
            const res = await fetch('/api/ingest/trigger', { method: 'POST' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            showToast(`Ingestion complete — ${data.items_processed} items processed`, 'success')
            fetchAll()
        } catch (err) {
            showToast(err.message || 'Ingestion failed', 'error')
        } finally {
            setIngesting(false)
        }
    }

    if (loading) return <SettingsSkeleton />

    const configuredCount = health ? Object.values(health).filter(Boolean).length : 0
    const totalServices = health ? Object.keys(health).length : 0

    return (
        <div className="settings-page">
            <div className="settings-page-header">
                <h2>System Settings</h2>
                <span className="settings-subtitle">Configure automation, monitor health, and manage the pipeline</span>
            </div>

            <div className="settings-section">
                <h3 className="settings-section-title">Automation Controls</h3>
                <div className="settings-toggles">
                    <div className="toggle-card">
                        <div className="toggle-card-info">
                            <strong>Weekly Automation</strong>
                            <span>Automatically generate and publish weekly intelligence digest</span>
                        </div>
                        <label className={`toggle-switch ${savingField === 'automation_enabled' ? 'saving' : ''}`}>
                            <input
                                type="checkbox"
                                checked={settings?.automation_enabled ?? true}
                                onChange={() => handleToggle('automation_enabled')}
                            />
                            <span className="toggle-slider" />
                        </label>
                    </div>
                    <div className="toggle-card">
                        <div className="toggle-card-info">
                            <strong>Manual Override</strong>
                            <span>Require manual approval before publishing to Slack</span>
                        </div>
                        <label className={`toggle-switch ${savingField === 'manual_override' ? 'saving' : ''}`}>
                            <input
                                type="checkbox"
                                checked={settings?.manual_override ?? false}
                                onChange={() => handleToggle('manual_override')}
                            />
                            <span className="toggle-slider" />
                        </label>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h3 className="settings-section-title">Pipeline Controls</h3>
                <div className="pipeline-controls">
                    <button
                        className={`btn-trigger ${ingesting ? 'loading' : ''}`}
                        onClick={handleTriggerIngestion}
                        disabled={ingesting}
                    >
                        {ingesting ? (
                            <>
                                <span className="btn-spinner" />
                                Running Ingestion...
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="1 4 1 10 7 10" />
                                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                                </svg>
                                Trigger Ingestion Cycle
                            </>
                        )}
                    </button>
                    <p className="pipeline-hint">
                        Fetches new content from all active builders and scores it with Claude AI.
                        {stats?.last_ingestion && (
                            <> Last run: <strong>{new Date(stats.last_ingestion).toLocaleString()}</strong></>
                        )}
                    </p>
                </div>
            </div>

            <div className="settings-section">
                <h3 className="settings-section-title">System Stats</h3>
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{stats?.builders ?? 0}</div>
                        <div className="stat-label">Builders</div>
                        <div className="stat-icon">👤</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats?.sources ?? 0}</div>
                        <div className="stat-label">Sources</div>
                        <div className="stat-icon">📡</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats?.content_items ?? 0}</div>
                        <div className="stat-label">Content Items</div>
                        <div className="stat-icon">📄</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats?.processed_items ?? 0}</div>
                        <div className="stat-label">Scored Items</div>
                        <div className="stat-icon">🎯</div>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <h3 className="settings-section-title">
                    API Configuration
                    <span className="health-summary">{configuredCount}/{totalServices} connected</span>
                </h3>
                <div className="health-list">
                    {HEALTH_SERVICES.map(service => {
                        const connected = health?.[service.key] ?? false
                        return (
                            <div key={service.key} className={`health-item ${connected ? 'connected' : 'disconnected'}`}>
                                <div className={`health-dot ${connected ? 'pulse' : ''}`} />
                                <span className="health-icon">{service.icon}</span>
                                <div className="health-info">
                                    <strong>{service.label}</strong>
                                    <span>{service.description}</span>
                                </div>
                                <span className={`health-status ${connected ? 'status-ok' : 'status-warn'}`}>
                                    {connected ? '✓ Connected' : '⚠ Not configured'}
                                </span>
                            </div>
                        )
                    })}
                </div>
                <p className="health-hint">
                    Configure API keys in your <code>.env</code> file and restart the server.
                </p>
            </div>
        </div>
    )
}

function SettingsSkeleton() {
    return (
        <div className="settings-page">
            <div className="skeleton skeleton-header" style={{ width: '40%', height: 32 }} />
            <div className="skeleton" style={{ height: 120, marginTop: 24 }} />
            <div className="skeleton" style={{ height: 80, marginTop: 24 }} />
            <div className="stats-grid" style={{ marginTop: 24 }}>
                {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
            </div>
            <div className="skeleton" style={{ height: 300, marginTop: 24 }} />
        </div>
    )
}
