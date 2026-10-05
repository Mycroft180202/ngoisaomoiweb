import { createContext, useContext, useState, useRef } from 'react';
import { HelpCircle, AlertTriangle, CheckCircle } from 'lucide-react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Đồng ý',
    cancelText: 'Hủy',
    type: 'primary', // 'primary' | 'danger' | 'success' | 'warning'
    showCancel: true,
    input: false,
    inputLabel: '',
    inputPlaceholder: '',
    inputRequired: false,
  });
  const [inputValue, setInputValue] = useState('');

  const resolver = useRef(null);

  const confirm = (options = {}) => {
    setState({
      isOpen: true,
      title: options.title || 'Xác nhận',
      message: options.message || 'Bạn có chắc chắn muốn thực hiện hành động này?',
      confirmText: options.confirmText || 'Xác nhận',
      cancelText: options.cancelText || 'Hủy',
      type: options.type || 'primary',
      showCancel: options.showCancel !== false,
      input: Boolean(options.input),
      inputLabel: options.inputLabel || '',
      inputPlaceholder: options.inputPlaceholder || '',
      inputRequired: Boolean(options.inputRequired),
    });
    setInputValue(options.defaultValue || '');
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  };

  const handleConfirm = () => {
    if (state.input && state.inputRequired && !inputValue.trim()) return;
    setState((prev) => ({ ...prev, isOpen: false }));
    if (resolver.current) resolver.current(state.input ? inputValue : true);
  };

  const handleCancel = () => {
    setState((prev) => ({ ...prev, isOpen: false }));
    if (resolver.current) resolver.current(false);
  };

  const getIcon = () => {
    switch (state.type) {
      case 'danger':
        return <AlertTriangle size={24} style={{ color: '#EF4444' }} />;
      case 'warning':
        return <AlertTriangle size={24} style={{ color: '#F59E0B' }} />;
      case 'success':
        return <CheckCircle size={24} style={{ color: '#10B981' }} />;
      default:
        return <HelpCircle size={24} style={{ color: '#3B82F6' }} />;
    }
  };

  const getHeaderIconBg = () => {
    switch (state.type) {
      case 'danger':
        return 'rgba(239, 68, 68, 0.12)';
      case 'warning':
        return 'rgba(245, 158, 11, 0.12)';
      case 'success':
        return 'rgba(16, 185, 129, 0.12)';
      default:
        return 'rgba(59, 130, 246, 0.12)';
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state.isOpen && (
        <div 
          className="modal-overlay animate-fadeIn" 
          onClick={handleCancel}
          style={{ 
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div 
            className="modal-content animate-scaleIn" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              maxWidth: 420, 
              borderRadius: '16px',
              background: 'rgba(30, 41, 59, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              padding: '24px',
              animation: 'scaleIn 0.3s ease-out'
            }}
          >
            {/* Header / Icon layout */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: 10,
                  borderRadius: '12px',
                  background: getHeaderIconBg(),
                  flexShrink: 0
                }}
              >
                {getIcon()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 
                  style={{ 
                    fontSize: '1.125rem', 
                    fontWeight: 600, 
                    color: 'var(--text-h)',
                    marginBottom: 6,
                    lineHeight: 1.3
                  }}
                >
                  {state.title}
                </h3>
                <p 
                  style={{ 
                    fontSize: '0.875rem', 
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    margin: 0
                  }}
                >
                  {state.message}
                </p>
                {state.input && (
                  <div style={{ marginTop: 14 }}>
                    {state.inputLabel && (
                      <label className="form-label" style={{ display: 'block', marginBottom: 6 }}>
                        {state.inputLabel}
                      </label>
                    )}
                    <textarea
                      className="form-control"
                      rows={4}
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      placeholder={state.inputPlaceholder}
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: 12,
                marginTop: 24
              }}
            >
              {state.showCancel && (
                <button 
                  className="btn btn-ghost" 
                  onClick={handleCancel} 
                  style={{ 
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}
                >
                  {state.cancelText}
                </button>
              )}
              <button 
                className={`btn btn-${state.type === 'danger' ? 'danger' : state.type === 'success' ? 'success' : 'primary'}`} 
                onClick={handleConfirm}
                style={{ 
                  borderRadius: '8px',
                  padding: '8px 20px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  boxShadow: state.type === 'danger' ? '0 4px 12px rgba(239, 68, 68, 0.2)' : '0 4px 12px rgba(14, 165, 233, 0.2)'
                }}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
