import { useEffect, useRef } from 'react'

const ICONS = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
}

function Toast({ id, message, type, onRemove }) {
    const timerRef = useRef(null)

    useEffect(() => {
        timerRef.current = setTimeout(() => onRemove(id), 4000)
        return () => clearTimeout(timerRef.current)
    }, [id, onRemove])

    return (
        <div className={`toast toast-${type}`}>
            <div className={`toast-icon toast-icon-${type}`}>{ICONS[type]}</div>
            <span className="toast-message">{message}</span>
            <button className="toast-close" onClick={() => onRemove(id)}>×</button>
            <div className="toast-progress">
                <div className={`toast-progress-bar toast-progress-${type}`} />
            </div>
        </div>
    )
}

export default function ToastContainer({ toasts, removeToast }) {
    if (toasts.length === 0) return null

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <Toast key={toast.id} {...toast} onRemove={removeToast} />
            ))}
        </div>
    )
}
