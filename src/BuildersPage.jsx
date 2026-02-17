import { useState, useEffect } from 'react'

const SOURCE_TYPES = [
    { value: 'rss_blog', label: 'RSS Blog', placeholder: 'Blog RSS feed URL (e.g., https://example.com/feed)' },
    { value: 'rss_newsletter', label: 'Newsletter', placeholder: 'Newsletter RSS feed URL' },
    { value: 'github', label: 'GitHub', placeholder: 'GitHub username (e.g., torvalds)' },
]

function getInitials(name) {
    if (!name) return '?'
    return name.split(' ').filter(w => w.length > 0).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function getAvatarColor(name) {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash) % 360
    return `hsl(${hue}, 45%, 45%)`
}

function getSourceLabel(type) {
    const found = SOURCE_TYPES.find(s => s.value === type)
    return found ? found.label : type
}

export default function BuildersPage({ showToast }) {
    const [builders, setBuilders] = useState([])
    const [loading, setLoading] = useState(true)
    const [newName, setNewName] = useState('')
    const [newBio, setNewBio] = useState('')
    const [addingSource, setAddingSource] = useState(null)
    const [sourceType, setSourceType] = useState('rss_blog')
    const [sourceIdentifier, setSourceIdentifier] = useState('')
    const [deleting, setDeleting] = useState(null)

    const fetchBuilders = async () => {
        try {
            const res = await fetch('/api/builders')
            const data = await res.json()
            setBuilders(data)
        } catch {
            showToast('Failed to load builders', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchBuilders() }, [])

    const handleAddBuilder = async (e) => {
        e.preventDefault()
        if (!newName.trim()) return
        try {
            const res = await fetch('/api/builders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName.trim(), short_bio: newBio.trim() || null })
            })
            if (res.ok) {
                setNewName('')
                setNewBio('')
                fetchBuilders()
                showToast(`Builder "${newName.trim()}" added`, 'success')
            }
        } catch {
            showToast('Failed to add builder', 'error')
        }
    }

    const handleToggleActive = async (builder) => {
        try {
            await fetch(`/api/builders/${builder.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !builder.is_active })
            })
            fetchBuilders()
        } catch {
            showToast('Failed to update builder', 'error')
        }
    }

    const handleDeleteBuilder = async (id) => {
        try {
            await fetch(`/api/builders/${id}`, { method: 'DELETE' })
            setDeleting(null)
            fetchBuilders()
            showToast('Builder deleted', 'success')
        } catch {
            setDeleting(null)
            showToast('Failed to delete builder', 'error')
        }
    }

    const handleAddSource = async (e) => {
        e.preventDefault()
        if (!sourceIdentifier.trim()) return
        try {
            const res = await fetch('/api/builder-sources', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    builder_id: addingSource,
                    source_type: sourceType,
                    source_identifier: sourceIdentifier.trim()
                })
            })
            if (res.ok) {
                setAddingSource(null)
                setSourceIdentifier('')
                setSourceType('rss_blog')
                fetchBuilders()
                showToast('Source added', 'success')
            }
        } catch {
            showToast('Failed to add source', 'error')
        }
    }

    const handleDeleteSource = async (sourceId) => {
        try {
            await fetch(`/api/builder-sources/${sourceId}`, { method: 'DELETE' })
            fetchBuilders()
        } catch {
            showToast('Failed to delete source', 'error')
        }
    }

    const handleToggleSource = async (source) => {
        try {
            await fetch(`/api/builder-sources/${source.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !source.is_active })
            })
            fetchBuilders()
        } catch {
            showToast('Failed to toggle source', 'error')
        }
    }

    if (loading) return <BuildersSkeleton />

    const activeCount = builders.filter(b => b.is_active).length
    const currentPlaceholder = SOURCE_TYPES.find(s => s.value === sourceType)?.placeholder || 'Source identifier'

    return (
        <div className="builders-page">
            <div className="builders-header">
                <div>
                    <h2>Builder Management</h2>
                    <span className="builders-subtitle">{builders.length} builder{builders.length !== 1 ? 's' : ''} · {activeCount} active</span>
                </div>
            </div>

            <form className="add-builder-form" onSubmit={handleAddBuilder}>
                <div className="add-builder-inputs">
                    <input
                        type="text"
                        placeholder="Builder name (e.g., Gergely Orosz)"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        required
                    />
                    <input
                        type="text"
                        placeholder="Role / short bio (e.g., CTO at Uber)"
                        value={newBio}
                        onChange={(e) => setNewBio(e.target.value)}
                    />
                </div>
                <button type="submit" className="btn-primary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Add Builder
                </button>
            </form>

            <div className="builders-list">
                {builders.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <h2 className="empty-state-title">No Builders Yet</h2>
                        <p className="empty-state-text">
                            Add engineering thought leaders to start monitoring their content across platforms.
                        </p>
                    </div>
                )}

                {builders.map(builder => (
                    <div key={builder.id} className={`builder-card ${!builder.is_active ? 'inactive' : ''}`}>
                        <div className="builder-card-header">
                            <div className="builder-card-left">
                                <div className="builder-avatar" style={{ background: getAvatarColor(builder.name) }}>
                                    {getInitials(builder.name)}
                                </div>
                                <div className="builder-card-meta">
                                    <strong className="builder-card-name">{builder.name}</strong>
                                    {builder.short_bio && <span className="builder-card-bio">{builder.short_bio}</span>}
                                    <span className="builder-card-sources-count">
                                        {builder.sources?.length || 0} source{(builder.sources?.length || 0) !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                            <div className="builder-card-actions">
                                <button
                                    className={`toggle-btn ${builder.is_active ? 'active' : ''}`}
                                    onClick={() => handleToggleActive(builder)}
                                    title={builder.is_active ? 'Deactivate' : 'Activate'}
                                >
                                    {builder.is_active ? '● Active' : '○ Inactive'}
                                </button>
                                <button
                                    className="add-source-btn"
                                    onClick={() => setAddingSource(addingSource === builder.id ? null : builder.id)}
                                >
                                    + Source
                                </button>
                                <button className="delete-btn" onClick={() => setDeleting(builder.id)}>
                                    ✕
                                </button>
                            </div>
                        </div>

                        {builder.sources && builder.sources.length > 0 && (
                            <div className="sources-list">
                                {builder.sources.map(source => (
                                    <div key={source.id} className={`source-row ${!source.is_active ? 'inactive' : ''}`}>
                                        <span className={`source-type-badge source-type-${source.source_type}`}>
                                            {getSourceLabel(source.source_type)}
                                        </span>
                                        <span className="source-id" title={source.source_identifier}>
                                            {source.source_identifier}
                                        </span>
                                        <div className="source-actions">
                                            <button
                                                className={`source-toggle ${source.is_active ? 'on' : 'off'}`}
                                                onClick={() => handleToggleSource(source)}
                                            >
                                                {source.is_active ? 'ON' : 'OFF'}
                                            </button>
                                            <button className="source-delete" onClick={() => handleDeleteSource(source.id)}>✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {addingSource === builder.id && (
                            <form className="add-source-form" onSubmit={handleAddSource}>
                                <select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                                    {SOURCE_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    placeholder={currentPlaceholder}
                                    value={sourceIdentifier}
                                    onChange={(e) => setSourceIdentifier(e.target.value)}
                                    required
                                />
                                <button type="submit" className="btn-source-add">Add</button>
                                <button type="button" className="btn-source-cancel" onClick={() => setAddingSource(null)}>Cancel</button>
                            </form>
                        )}

                        {deleting === builder.id && (
                            <div className="delete-confirm">
                                <span>Delete <strong>{builder.name}</strong> and all sources?</span>
                                <div className="delete-confirm-actions">
                                    <button className="btn-danger" onClick={() => handleDeleteBuilder(builder.id)}>Delete</button>
                                    <button className="btn-cancel" onClick={() => setDeleting(null)}>Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

function BuildersSkeleton() {
    return (
        <div className="builders-page">
            <div className="skeleton skeleton-header" style={{ width: '35%', height: 32 }} />
            <div className="skeleton" style={{ height: 56, marginTop: 16 }} />
            {[1, 2, 3].map(i => (
                <div key={i} className="skeleton skeleton-card" style={{ marginTop: 12 }} />
            ))}
        </div>
    )
}
