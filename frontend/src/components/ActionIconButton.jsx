export function ActionIconButton({ action, label, onClick }) {
  return (
    <button
      type="button"
      className="btn btn-ghost"
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {action === 'view' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M1 12C3.6 7.8 7.4 5.7 12 5.7C16.6 5.7 20.4 7.8 23 12C20.4 16.2 16.6 18.3 12 18.3C7.4 18.3 3.6 16.2 1 12Z" stroke="currentColor" strokeWidth="1.8"/>
          <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8"/>
        </svg>
      )}
      {action === 'edit' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 17.25V21H6.75L17.8 9.95L14.05 6.2L3 17.25Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
          <path d="M13.2 7.05L16.95 10.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M18.85 8.9L15.1 5.15L16.9 3.35C17.4 2.85 18.2 2.85 18.7 3.35L20.65 5.3C21.15 5.8 21.15 6.6 20.65 7.1L18.85 8.9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
        </svg>
      )}
      {action === 'delete' && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M9 7V5.8C9 4.8 9.8 4 10.8 4H13.2C14.2 4 15 4.8 15 5.8V7" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M6 7L7 20C7.08 21.1 7.98 22 9.08 22H14.92C16.02 22 16.92 21.1 17 20L18 7" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M10 11V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M14 11V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  )
}
