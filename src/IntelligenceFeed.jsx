import { useState, useEffect } from 'react'

const PLATFORM_LABELS = {
    rss_blog: 'Blog',
    rss_newsletter: 'Newsletter',
    github: 'GitHub',
    linkedin: 'LinkedIn',
    twitter: 'Twitter',
    blog: 'Blog',
    youtube: 'YouTube',
}

function getPlatformClass(platform) {
    if (platform.includes('linkedin')) return 'linkedin'
    if (platform.includes('twitter')) return 'twitter'
    if (platform.includes('github')) return 'github'
    if (platform.includes('newsletter')) return 'newsletter'
    if (platform.includes('blog') || platform.includes('rss')) return 'blog'
    if (platform.includes('youtube')) return 'youtube'
    return 'default'
}

function getScoreClass(score) {
    if (score >= 8) return 'score-high'
    if (score >= 6) return 'score-medium'
    return 'score-low'
}

function getPriorityBorderClass(flags) {
    if (!flags || flags.length === 0) return ''
    return `priority-border-${flags[0]}`
}

function FeedSkeleton() {
    return (
        <div className="feed-skeleton">
            <div className="skeleton skeleton-hero" />
            <div className="content-grid">
                <div className="feed-column">
                    <div className="skeleton skeleton-header" />
                    {[1, 2, 3].map(i => (
                        <div key={i} className="skeleton skeleton-card" />
                    ))}
                </div>
                <div className="strategy-column">
                    <div className="skeleton skeleton-sidebar" />
                    <div className="skeleton skeleton-sidebar" />
                </div>
            </div>
        </div>
    )
}

function EmptyFeed({ onNavigate }) {
    return (
        <div className="empty-state">
            <div className="empty-state-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                </svg>
            </div>
            <h2 className="empty-state-title">No Intelligence Data Yet</h2>
            <p className="empty-state-text">
                Start monitoring engineering thought leaders to surface actionable insights.
            </p>
            <div className="empty-state-steps">
                <div className="empty-step">
                    <span className="empty-step-num">1</span>
                    <span>Add builders to monitor</span>
                </div>
                <div className="empty-step">
                    <span className="empty-step-num">2</span>
                    <span>Configure their content sources</span>
                </div>
                <div className="empty-step">
                    <span className="empty-step-num">3</span>
                    <span>Trigger an ingestion cycle</span>
                </div>
            </div>
            <div className="empty-state-actions">
                <button className="btn-primary" onClick={() => onNavigate('builders')}>
                    Add Builders
                </button>
                <button className="btn-secondary" onClick={() => onNavigate('settings')}>
                    Go to Settings
                </button>
            </div>
        </div>
    )
}

export default function IntelligenceFeed({ onNavigate }) {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState(null)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetch('/api/intelligence')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch')
                return res.json()
            })
            .then(json => setData(json))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <FeedSkeleton />
    if (error) return <div className="error-state"><p>⚠ {error}</p></div>
    if (!data || !data.top_items || data.top_items.length === 0) return <EmptyFeed onNavigate={onNavigate} />

    return (
        <>
            {data.trend_summary && (
                <section className="trend-hero">
                    <div className="trend-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                            <polyline points="17 6 23 6 23 12" />
                        </svg>
                    </div>
                    <div className="trend-text">
                        <h2>Weekly Trend Analysis</h2>
                        <p>{data.trend_summary}</p>
                    </div>
                    <span className="trend-week">
                        Week of {new Date(data.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                </section>
            )}

            <div className="content-grid">
                <div className="feed-column">
                    <div className="section-header">
                        <h3>🏆 Top Insights</h3>
                        <span className="badge">{data.top_items.length} items</span>
                    </div>
                    <div className="insights-list">
                        {data.top_items.map((item, idx) => (
                            <article key={item.id || idx} className={`insight-card ${getPriorityBorderClass(item.priority_flags)}`}>
                                <div className="insight-header">
                                    <div className="insight-meta">
                                        <span className={`platform-tag platform-${getPlatformClass(item.platform)}`}>
                                            {PLATFORM_LABELS[item.platform] || item.platform}
                                        </span>
                                        <span className="insight-author">{item.author}</span>
                                        <span className="insight-date">
                                            {new Date(item.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className={`score-badge ${getScoreClass(item.overall_score)}`} title="AI Relevance Score">
                                        {typeof item.overall_score === 'number' ? item.overall_score.toFixed(1) : item.overall_score}
                                    </div>
                                </div>

                                <h4 className="insight-title">
                                    <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
                                </h4>

                                <p className="insight-summary">{item.summary}</p>

                                <div className="insight-details">
                                    {item.why_it_matters && (
                                        <div className="detail-block">
                                            <strong>Why it matters:</strong> {item.why_it_matters}
                                        </div>
                                    )}
                                    {item.what_to_try && (
                                        <div className="detail-block action">
                                            <strong>⚡ Try this:</strong> {item.what_to_try}
                                        </div>
                                    )}
                                </div>

                                {item.priority_flags && item.priority_flags.length > 0 && (
                                    <div className="insight-footer">
                                        <div className="tags">
                                            {item.priority_flags.map(tag => (
                                                <span key={tag} className={`priority-tag priority-${tag}`}>
                                                    {tag.replace(/_/g, ' ')}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                </div>

                <div className="strategy-column">
                    {data.strategic_experiments && data.strategic_experiments.length > 0 && (
                        <div className="sidebar-section">
                            <div className="section-header">
                                <h3>🧪 Strategic Experiments</h3>
                            </div>
                            <div className="experiments-list">
                                {data.strategic_experiments.map((exp, idx) => (
                                    <div key={idx} className="experiment-card">
                                        <h4>{exp.title}</h4>
                                        <p>{exp.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {data.builder_stats && data.builder_stats.length > 0 && (
                        <div className="sidebar-section">
                            <div className="section-header">
                                <h3>👥 Top Builders</h3>
                            </div>
                            <div className="builders-stat-list">
                                {data.builder_stats.map((b, idx) => (
                                    <div key={idx} className="builder-stat-row">
                                        <div className="builder-stat-rank">#{idx + 1}</div>
                                        <div className="builder-stat-info">
                                            <span className="builder-stat-name">{b.name}</span>
                                            <span className="builder-stat-count">{b.count} item{b.count !== 1 ? 's' : ''}</span>
                                        </div>
                                        <div className={`builder-stat-score ${getScoreClass(b.score)}`}>
                                            {b.score}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
