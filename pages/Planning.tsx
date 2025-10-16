import React, { useState } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import Table from '../components/Table';
import { getEmployees, getEngineeringStandards } from '../services/api';
import { generateShiftPlan } from '../services/geminiService';
import { EmployeeSchedule } from '../types';
import { CalendarIcon } from '../components/icons/CalendarIcon';
import { useAuth } from '../context/AuthContext';
import { Role } from '../enums';

const Planning: React.FC = () => {
    const { user, currentOperation } = useAuth();
    const [shiftPlan, setShiftPlan] = useState<EmployeeSchedule[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');

    const isViewer = user?.role === Role.VIEWER;

    const handleGeneratePlan = async () => {
        if (!currentOperation) {
            setError('Por favor, selecione uma operação para gerar o planejamento.');
            return;
        }
        setIsLoading(true);
        setError('');
        setShiftPlan([]);

        try {
            const employees = await getEmployees(currentOperation.id);
            if (employees.length === 0) {
                setError('Não há funcionários nesta operação para gerar um plano.');
                setIsLoading(false);
                return;
            }
            const standards = await getEngineeringStandards(currentOperation.id);
            const plan = await generateShiftPlan(employees, standards);
            setShiftPlan(plan);
        } catch (err) {
            setError('Não foi possível gerar o planejamento. Verifique a chave de API e tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const tableHeaders = ["Funcionário", "Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

    if (!currentOperation) {
        return <div className="text-center p-10">Selecione uma operação para iniciar o planejamento.</div>;
    }

    return (
        <div>
            <Header title="Planejamento de Turnos" operationName={currentOperation.name}>
                <button onClick={handleGeneratePlan} disabled={isLoading || isViewer} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300">
                    {isLoading ? 'Gerando Plano...' : 'Gerar Planejamento Semanal com IA'}
                </button>
            </Header>

            <Card>
                {error && <p className="text-center text-rose-500 mb-4 bg-rose-50 p-3 rounded-lg">{error}</p>}
                
                {!isLoading && shiftPlan.length === 0 && !error && (
                    <div className="text-center text-slate-500 py-16">
                        <CalendarIcon className="w-12 h-12 mx-auto text-blue-400 mb-4" />
                        <h3 className="text-xl font-semibold">Otimize a escala da sua equipe</h3>
                        <p className="mt-2">Clique para gerar um plano de turnos semanal com base na demanda e especialidades dos funcionários da operação atual.</p>
                         {isViewer && <p className="text-sm text-orange-500 mt-4 bg-orange-50 p-2 rounded-md">A geração de novos planos está desabilitada para usuários de visualização.</p>}
                    </div>
                )}
                
                {isLoading && <div className="text-center py-10">Analisando dados e otimizando a escala...</div>}

                {shiftPlan.length > 0 && (
                    <Table headers={tableHeaders}>
                        {shiftPlan.map((item) => (
                            <tr key={item.employeeName} className="hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium">{item.employeeName}</td>
                                <td className="px-6 py-4">{item.schedule.Segunda}</td>
                                <td className="px-6 py-4">{item.schedule.Terça}</td>
                                <td className="px-6 py-4">{item.schedule.Quarta}</td>
                                <td className="px-6 py-4">{item.schedule.Quinta}</td>
                                <td className="px-6 py-4">{item.schedule.Sexta}</td>
                            </tr>
                        ))}
                    </Table>
                )}
            </Card>
        </div>
    );
};

export default Planning;