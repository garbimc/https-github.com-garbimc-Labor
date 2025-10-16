import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200/80 p-6 ${className}`}>
      {title && <h2 className="text-xl font-semibold text-slate-800 mb-4">{title}</h2>}
      {children}
    </div>
  );
};

export default Card;