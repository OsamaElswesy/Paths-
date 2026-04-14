import React from 'react';
import { cn } from '@/lib/utils';
import styles from './Slider.module.css';

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    valueLabel?: string | number;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
    ({ className, label, valueLabel, id, ...props }, ref) => {
        const sliderId = id || React.useId();

        return (
            <div className={styles.wrapper}>
                <div className={styles.header}>
                    {label && <label htmlFor={sliderId} className={styles.label}>{label}</label>}
                    {valueLabel && <span className={styles.value}>{valueLabel}</span>}
                </div>
                <input
                    type="range"
                    id={sliderId}
                    className={cn(styles.input, className)}
                    ref={ref}
                    {...props}
                />
            </div>
        );
    }
);
Slider.displayName = 'Slider';
