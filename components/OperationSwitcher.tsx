import React from 'react';
import { useAuth } from '../context/AuthContext';
import { DemandIcon } from './icons/DemandIcon';

const OperationSwitcher: React.FC = () => {
  const { user, operations, currentOperation, switchOperation } = useAuth();

  // If user has only one or zero operations, just display the name statically
  if (!user || operations.length <= 1) {
    return (
        <div className="p-4 border-b border-slate-200">
            <h3 className="px-3 pb-2 text-xs font-bold uppercase text-slate-400 tracking-wider">
                Operação Ativa
            </h3>
            <div className="w-full text-left p-3 rounded-lg bg-slate-100 text-slate-800 text-sm font-semibold flex items-center">
                <DemandIcon />
                <span className="ml-3">{currentOperation?.name || 'Nenhuma Operação'}</span>
            </div>
      </div>
    );
  }

  // If user has multiple operations, display a dropdown select for better scalability
  return (
    <div className="p-4 border-b border-slate-200">
        <h3 className="px-3 pb-2 text-xs font-bold uppercase text-slate-400 tracking-wider">
            Mudar Operação
        </h3>
        <div className="relative">
            <label htmlFor="operation-select" className="sr-only">Operação Ativa</label>
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                <DemandIcon />
            </div>
            <select
                id="operation-select"
                value={currentOperation?.id || ''}
                onChange={(e) => switchOperation(e.target.value)}
                className="w-full pl-10 pr-8 p-3 text-sm font-semibold text-slate-800 bg-slate-100 border border-transparent rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                aria-label="Selecionar Operação"
            >
                {operations.map((op) => (
                    <option key={op.id} value={op.id}>
                        {op.name}
                    </option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-500">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
            </div>
        </div>
    </div>
  );
};

export default OperationSwitcher;