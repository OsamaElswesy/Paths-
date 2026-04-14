import React from 'react';
import { cn } from '@/lib/utils';
import styles from './Input.module.css';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, label, error, id, ...props }, ref) => {
        const textareaId = id || React.useId();

        return (
            <div className={styles.wrapper}>
                {label && (
                    <label htmlFor={textareaId} className={styles.label}>
                        {label}
                    </label>
                )}
                <textarea
                    id={textareaId}
                    className={cn(styles.input, error && styles.errorInput, 'min-h-[80px] py-3', className)}
                    ref={ref}
                    {...props}
                />
                {error && <p className={styles.errorMessage}>{error}</p>}
            </div>
        );
    }
);
Textarea.displayName = 'Textarea';
