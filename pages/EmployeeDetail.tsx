import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import { getEmployees, getTimeLogs, getTaskExecutions, getEngineeringStandards } from '../services/api';
// FIX: Changed import for ActivityType to be from enums.ts, consistent with the rest of the app.
import { Employee, TimeLog, TaskExecution, EngineeringStandard } from '../types';
import { ActivityType } from '../enums';
import Table from '../components/Table';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

const StatCard: React.FC<{ title: string; value: string; description: string; }> = ({ title, value, description }) => (
    <Card>
        <h3 className="text-sm font-medium text-slate-500">{title}</h3>
        <p className="text-3xl font-bold mt-1">{value}</p>
        <p className="text-sm text-slate-400 mt-1">{description}</p>
    </Card>
);

const EmployeeProfileCard: React.FC<{ employee: Employee; status: 'Online' | 'Offline'; activity: ActivityType | null }> = ({ employee, status, activity }) => {
    const isOnline = status === 'Online';
    return (
        <Card className="h-full">
            <div className="flex flex-col items-center text-center">
                <div className="relative">
                    <img src={employee.photo} alt={employee.name} className="w-32 h-32 rounded-full object-cover ring-4 ring-offset-2 ring-blue-500" />
                    <span className={`absolute bottom-2 right-2 block h-5 w-5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'} ring-2 ring-white`}></span>
                </div>
                <h2 className="text-2xl font-bold mt-4">{employee.name}</h2>
                <p className={`mt-1 font-semibold px-3 py-1 text-sm rounded-full ${isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                    {isOnline ? `Online - ${activity}` : 'Offline'}
                </p>
                <div className="mt-6 w-full text-left">
                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Especialidades</h4>
                    <div className="flex flex-wrap gap-2">
                        {employee.activities.map(act => (
                            <span key={act} className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full">{act}</span>
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    );
}


const EmployeeDetail: React.FC = () => {
    const { currentOperation } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [allLogs, setAllLogs] = useState<TimeLog[]>([]);
    const [allTasks, setAllTasks] = useState<TaskExecution[]>([]);
    const [allStandards, setAllStandards] = useState<EngineeringStandard[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000); // update every minute
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!currentOperation) { setIsLoading(false); return; }
            setIsLoading(true);
            const [employeesData, logsData, tasksData, standardsData] = await Promise.all([
                getEmployees(currentOperation.id), getTimeLogs(currentOperation.id),
                getTaskExecutions(currentOperation.id), getEngineeringStandards(currentOperation.id),
            ]);
            setEmployees(employeesData);
            setAllLogs(logsData);
            setAllTasks(tasksData);
            setAllStandards(standardsData);
            if (employeesData.length > 0 && !employeesData.find(e => e.id === selectedEmployeeId)) {
                setSelectedEmployeeId(employeesData[0].id);
            } else if (employeesData.length === 0) {
                 setSelectedEmployeeId('');
            }
            setIsLoading(false);
        };
        fetchData();
    }, [currentOperation]);

    const employeeStatusMap = useMemo(() => {
        const statusMap = new Map<string, { status: 'Check-in' | 'Check-out'; activity: ActivityType | null }>();
        allLogs.forEach(log => {
            if (!statusMap.has(log.employeeId)) {
                statusMap.set(log.employeeId, { status: log.type === 'Check-in' ? 'Check-in' : 'Check-out', activity: log.activity });
            }
        });
        return statusMap;
    }, [allLogs]);

    const employeeData = useMemo(() => {
        if (!selectedEmployeeId) return null;
        const employee = employees.find(e => e.id === selectedEmployeeId);
        if (!employee) return null;

        const parseTimestamp = (timestamp: string): Date => {
             const [datePart, timePart] = timestamp.split(', ');
             const [day, month, year] = datePart.split('/');
             return new Date(`${year}-${month}-${day}T${timePart}`);
        };
        
        const statusInfo = employeeStatusMap.get(employee.id);
        // FIX: Add explicit type annotation to prevent type from being widened to 'string'.
        const employeeStatus: 'Online' | 'Offline' = statusInfo?.status === 'Check-in' ? 'Online' : 'Offline';
        const currentActivity = statusInfo?.activity ?? null;

        const employeeTasks = allTasks.filter(task => task.employeeId === selectedEmployeeId);
        const todayString = new Date().toLocaleDateString('pt-BR');
        const todayTasks = employeeTasks.filter(t => t.executionDate === todayString);
        
        let todayWorkHours = 0;
        let todayWorkMinutes = 0;
        if (employeeStatus === 'Online') {
            const lastCheckIn = allLogs.find(l => l.employeeId === selectedEmployeeId && l.type === 'Check-in');
            if (lastCheckIn) {
                const checkInTime = parseTimestamp(lastCheckIn.timestamp);
                const diffMs = currentTime.getTime() - checkInTime.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                todayWorkHours = Math.floor(diffMins / 60);
                todayWorkMinutes = diffMins % 60;
            }
        }
        
        const calculateProductivity = (tasks: TaskExecution[]): number => {
            const totalStandardHours = tasks.reduce((sum, task) => {
                const standard = allStandards.find(s => s.activity === task.activity && s.hourlyProductivity > 0);
                return standard ? sum + (task.quantity / standard.hourlyProductivity) : sum;
            }, 0);
            const totalActualHours = tasks.reduce((sum, task) => sum + task.executionHours, 0);
            return totalActualHours > 0 ? (totalStandardHours / totalActualHours) * 100 : 0;
        };

        const overallProductivity = calculateProductivity(employeeTasks);

        const productivityByActivity = employee.activities.map(activity => {
            const tasksForActivity = employeeTasks.filter(t => t.activity === activity);
            const employeeProd = calculateProductivity(tasksForActivity);
            
            const teamMembersInActivity = employees.filter(e => e.activities.includes(activity));
            const teamTasksForActivity = allTasks.filter(t => teamMembersInActivity.some(m => m.id === t.employeeId) && t.activity === activity);
            const teamProd = calculateProductivity(teamTasksForActivity);
            
            return {
                name: activity,
                'Sua Produtividade': parseFloat(employeeProd.toFixed(1)),
                'Média da Equipe': parseFloat(teamProd.toFixed(1)),
            };
        });

        const teamAverageProductivity = productivityByActivity.length > 0 ? productivityByActivity.reduce((acc, curr) => acc + curr['Média da Equipe'], 0) / productivityByActivity.length : 100;

        return {
            ...employee,
            status: employeeStatus,
            currentActivity,
            todayWorkHoursFormatted: `${String(todayWorkHours).padStart(2, '0')}h ${String(todayWorkMinutes).padStart(2, '0')}m`,
            todayTasksCompleted: todayTasks.reduce((acc, t) => acc + t.quantity, 0),
            overallProductivity,
            teamAverageProductivity,
            productivityByActivity
        };
    }, [selectedEmployeeId, employees, allLogs, allTasks, allStandards, currentTime, employeeStatusMap]);

    const selectedEmployeeTasks = useMemo(() => {
        if (!selectedEmployeeId) return [];
        const parseDateString = (dateStr: string): Date => {
            const [day, month, year] = dateStr.split('/').map(Number);
            return new Date(year, month - 1, day);
        };
        return allTasks.filter(t => t.employeeId === selectedEmployeeId).sort((a,b) => parseDateString(b.executionDate).getTime() - parseDateString(a.executionDate).getTime());
    }, [selectedEmployeeId, allTasks]);


    if (!currentOperation) return <div className="text-center p-10">Selecione uma operação para analisar os funcionários.</div>;
    if (isLoading) return <div className="text-center p-10">Carregando dados...</div>;

    const radialChartData = employeeData ? [{ name: 'Productivity', value: employeeData.overallProductivity }] : [];
    const perfColor = employeeData && employeeData.overallProductivity >= 100 ? '#10b981' : '#3b82f6';

    return (
        <div>
            <Header title="Análise de Funcionário" operationName={currentOperation.name} />
            <Card className="mb-6">
                <label htmlFor="employee-select" className="block text-sm font-medium mb-1">Selecione um Funcionário</label>
                <select id="employee-select" value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)} className="w-full max-w-sm p-2 border rounded-lg">
                     {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
            </Card>

            {employeeData ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1">
                            <EmployeeProfileCard employee={employeeData} status={employeeData.status} activity={employeeData.currentActivity} />
                        </div>
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                           <StatCard title="Horas Hoje" value={employeeData.todayWorkHoursFormatted} description={employeeData.status === 'Online' ? 'Tempo real' : 'Total no dia'} />
                           <StatCard title="Produção Hoje" value={String(employeeData.todayTasksCompleted.toFixed(0))} description="Unidades/Linhas concluídas" />
                            <Card title="Produtividade Geral" className="md:col-span-2">
                                <ResponsiveContainer width="100%" height={200}>
                                    <RadialBarChart innerRadius="70%" outerRadius="100%" data={radialChartData} startAngle={180} endAngle={-180}>
                                        <PolarAngleAxis type="number" domain={[0, 150]} angleAxisId={0} tick={false} />
                                        <RadialBar background dataKey='value' angleAxisId={0} fill={perfColor} cornerRadius={10} />
                                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-4xl font-bold fill-slate-700">
                                            {`${employeeData.overallProductivity.toFixed(0)}%`}
                                        </text>
                                        <text x="50%" y="65%" textAnchor="middle" dominantBaseline="middle" className="text-sm fill-slate-500">
                                            Média da equipe: {employeeData.teamAverageProductivity.toFixed(0)}%
                                        </text>
                                    </RadialBarChart>
                                </ResponsiveContainer>
                            </Card>
                        </div>
                    </div>

                    <Card title="Desempenho por Atividade">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={employeeData.productivityByActivity} layout="vertical" margin={{ left: 20, right: 30 }}>
                                <XAxis type="number" domain={[0, 150]} unit="%" />
                                <YAxis type="category" dataKey="name" width={80} />
                                <Tooltip formatter={(value: number) => `${value}%`} />
                                <Legend />
                                <Bar dataKey="Sua Produtividade" fill="#3b82f6" />
                                <Bar dataKey="Média da Equipe" fill="#94a3b8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>

                    <Card title="Histórico de Atividades Recentes">
                        <div className="max-h-96 overflow-y-auto">
                           <Table headers={['Data', 'Atividade', 'Quantidade', 'Driver', 'Horas Executadas']}>
                               {selectedEmployeeTasks.map(task => (<tr key={task.id}><td className="px-6 py-4">{task.executionDate}</td><td className="px-6 py-4">{task.activity}</td><td className="px-6 py-4">{task.quantity}</td><td className="px-6 py-4">{task.driver}</td><td className="px-6 py-4">{task.executionHours.toFixed(2)}</td></tr>))}
                           </Table>
                        </div>
                    </Card>
                </div>
            ) : (
                 <div className="text-center p-10 text-slate-500">
                    <p>{employees.length > 0 ? 'Selecione um funcionário para ver seus detalhes.' : 'Nenhum funcionário cadastrado nesta operação.'}</p>
                </div>
            )}
        </div>
    );
};

export default EmployeeDetail;