import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, X, Info } from 'lucide-react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  isSimulated?: boolean;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  showSuccess: (title: string, message?: string, options?: { isSimulated?: boolean }) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  showMyHutFallback: (error: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration || 5000,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove toast after duration
    setTimeout(() => {
      removeToast(id);
    }, newToast.duration);
  }, [removeToast]);

  const showSuccess = useCallback((title: string, message?: string, options?: { isSimulated?: boolean }) => {
    showToast({
      type: 'success',
      title,
      message,
      isSimulated: options?.isSimulated,
    });
  }, [showToast]);

  const showError = useCallback((title: string, message?: string) => {
    showToast({
      type: 'error',
      title,
      message,
      duration: 7000, // Longer duration for errors
    });
  }, [showToast]);

  const showWarning = useCallback((title: string, message?: string) => {
    showToast({
      type: 'warning',
      title,
      message,
    });
  }, [showToast]);

  const showInfo = useCallback((title: string, message?: string) => {
    showToast({
      type: 'info',
      title,
      message,
    });
  }, [showToast]);

  const showMyHutFallback = useCallback((error: string) => {
    showToast({
      type: 'error',
      title: 'MyHut Service Unavailable',
      message: `Unable to execute swap via MyHut canister: ${error}. Please try again or contact support if the issue persists.`,
      duration: 10000, // Longer duration for critical errors
    });
  }, [showToast]);

  const value: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showMyHutFallback,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <AlertTriangle size={20} />;
      case 'warning':
        return <AlertTriangle size={20} />;
      case 'info':
        return <Info size={20} />;
    }
  };

  const getStyles = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'bg-success-600/90 border-success-500/50 text-success-100';
      case 'error':
        return 'bg-error-600/90 border-error-500/50 text-error-100';
      case 'warning':
        return 'bg-warning-600/90 border-warning-500/50 text-warning-100';
      case 'info':
        return 'bg-primary-600/90 border-primary-500/50 text-primary-100';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`relative rounded-xl border backdrop-blur-sm shadow-2xl p-4 animate-slideInRight ${getStyles(toast.type)}`}
        >
          {/* Simulation indicator */}
          {toast.isSimulated && (
            <div className="absolute -top-2 -right-2 bg-warning-500 text-warning-900 text-xs font-bold px-2 py-1 rounded-full border-2 border-surface-1">
              SIMULATED
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(toast.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm mb-1">
                {toast.title}
              </div>
              {toast.message && (
                <div className="text-sm opacity-90 leading-relaxed">
                  {toast.message}
                </div>
              )}
            </div>

            <button
              onClick={() => onRemove(toast.id)}
              className="flex-shrink-0 w-6 h-6 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center transition-colors"
              aria-label="Close notification"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToastProvider;