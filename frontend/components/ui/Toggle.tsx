import React from 'react';
import { cn } from '@/lib/utils';
import styles from './Toggle.module.css';

export interface ToggleProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>(
    ({ className, label, id, ...props }, ref) => {
        const toggleId = id || React.useId();

        return (
            <div className={styles.wrapper}>
                <label htmlFor={toggleId} className={styles.container}>
                    <input
                        type="checkbox"
                        id={toggleId}
                        className={styles.input}
                        ref={ref}
                        {...props}
                    />
                    <span className={styles.slider} />
                </label>
                {label && <span className={styles.label}>{label}</span>}
            </div>
        );
    }
);
Toggle.displayName = 'Toggle';
