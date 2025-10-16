import React from 'react';

interface TableProps {
  headers: string[];
  children: React.ReactNode;
}

const Table: React.FC<TableProps> = ({ headers, children }) => {
  return (
    <div className="overflow-x-auto bg-white rounded-lg border border-slate-200/80 shadow-sm">
      <table className="w-full text-sm text-left text-slate-600">
        <thead className="text-xs text-slate-700 uppercase bg-slate-50">
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col" className="px-6 py-3 font-semibold tracking-wider">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {children}
        </tbody>
      </table>
    </div>
  );
};

export default Table;