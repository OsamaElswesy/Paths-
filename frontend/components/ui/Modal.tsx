'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import styles from './Modal.module.css';
import { Button } from './Button';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    description?: string;
}

export const Modal = ({ isOpen, onClose, children }: ModalProps) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!mounted) return null;
    if (!isOpen) return null;

    return createPortal(
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.container} onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>,
        document.body
    );
};

export const ModalContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn(styles.content, className)}>{children}</div>
);

export const ModalHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn(styles.header, className)}>{children}</div>
);

export const ModalFooter = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn(styles.footer, className)}>{children}</div>
);

export const ModalTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 className={cn(styles.title, className)}>{children}</h3>
);

export const ModalDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <p className={cn(styles.description, className)}>{children}</p>
);
