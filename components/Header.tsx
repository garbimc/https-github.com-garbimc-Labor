import React from 'react';

interface HeaderProps {
  title: string;
  operationName?: string;
  children?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, operationName, children }) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
      <div className="flex items-baseline">
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        {operationName && (
          <span className="ml-3 text-xl font-medium text-slate-500 border-l-2 border-slate-300 pl-3">
            {operationName}
          </span>
        )}
      </div>
      <div className="flex items-center space-x-4 mt-4 md:mt-0">
        {children}
      </div>
    </div>
  );
};

export default Header;