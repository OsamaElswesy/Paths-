'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

/* --- Styles (inline for simplicity in single file, or separate module) --- */
// Using inline styles/classes for the toast container and items to keep it self-contained here, 
// matching our vanilla CSS approach but leveraging the global vars.

interface Toast {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    description?: string;
    duration?: number;
}

interface ToastContextType {
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback(({ duration = 5000, ...toast }: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { ...toast, id, duration }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            {/* Toast Container Portal - Only render on client after mount */}
            {mounted && typeof document !== 'undefined' && createPortal(
                <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
                    {toasts.map((toast) => (
                        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    );
};

const ToastItem = ({ toast, onClose }: { toast: Toast; onClose: () => void }) => {
    const icons = {
        success: <CheckCircle className="text-green-500" size={20} />,
        error: <AlertCircle className="text-red-500" size={20} />,
        warning: <AlertTriangle className="text-amber-500" size={20} />,
        info: <Info className="text-blue-500" size={20} />,
    };

    return (
        <div className="bg-white border border-slate-200 shadow-lg rounded-lg p-4 flex gap-3 pointer-events-auto animate-in slide-in-from-right-5 fade-in duration-300">
            <div className="shrink-0 pt-0.5">{icons[toast.type]}</div>
            <div className="flex-1">
                <h4 className="font-medium text-slate-900 text-sm">{toast.message}</h4>
                {toast.description && (
                    <p className="text-slate-500 text-xs mt-1 leading-relaxed">{toast.description}</p>
                )}
            </div>
            <button
                onClick={onClose}
                className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
                <X size={16} />
            </button>
        </div>
    );
};
