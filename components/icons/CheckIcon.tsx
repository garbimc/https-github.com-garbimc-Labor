import React from 'react';

export const CheckIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5 text-emerald-500" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
    </svg>
);
