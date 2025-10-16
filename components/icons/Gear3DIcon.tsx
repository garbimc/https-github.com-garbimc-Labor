import React from 'react';

export const Gear3DIcon: React.FC<{ className?: string }> = ({ className = "w-24 h-24" }) => (
  <svg className={className} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="Ícone de engrenagem 3D">
    <defs>
      {/* Gradiente para o corpo principal da engrenagem para dar uma sensação metálica e arredondada */}
      <radialGradient id="gearGradient" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
        <stop offset="0%" stopColor="#d1d5db" stopOpacity="1" /> {/* Destaque mais claro */}
        <stop offset="100%" stopColor="#6b7280" stopOpacity="1" /> {/* Base mais escura */}
      </radialGradient>
      
      {/* Gradiente para o furo interno para mostrar profundidade */}
      <linearGradient id="holeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#4b5563" />
        <stop offset="100%" stopColor="#9ca3af" />
      </linearGradient>
      
      {/* Filtro de sombra projetada */}
      <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur"/>
        <feOffset in="blur" dx="4" dy="4" result="offsetBlur"/>
        <feMerge>
          <feMergeNode in="offsetBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    {/* A forma da engrenagem com dados de caminho */}
    <g filter="url(#dropShadow)">
        <path 
            d="M93.3,50a6.7,6.7,0,0,0-4-6.35l-11.33-6.54a6.7,6.7,0,0,0-9.33,2.67l-5.67,9.82a6.7,6.7,0,0,0-8,0L49,40a6.7,6.7,0,0,0-9.33-2.67L28.33,43.65a6.7,6.7,0,0,0-4,6.35l0,13.09a6.7,6.7,0,0,0,4,6.35l11.33,6.54a6.7,6.7,0,0,0,9.33-2.67l5.67-9.82a6.7,6.7,0,0,0,8,0l5.67,9.82a6.7,6.7,0,0,0,9.33,2.67l11.33-6.54a6.7,6.7,0,0,0,4-6.35Z"
            transform="translate(-20.99 -20.99) scale(1.42)"
            fill="url(#gearGradient)"
            stroke="#4b5563"
            strokeWidth="1"
        />
        {/* Furo interno */}
        <circle cx="50" cy="50" r="15" fill="url(#holeGradient)" />
        <circle cx="50" cy="50" r="12" fill="transparent" stroke="#374151" strokeWidth="1.5" />
    </g>
  </svg>
);