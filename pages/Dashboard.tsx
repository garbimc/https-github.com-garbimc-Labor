import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import Header from '../components/Header';
import Card from '../components/Card';
import { getDashboardData } from '../services/api';
import { generateDashboardInsights } from '../services/geminiService';
import { DashboardData } from '../types';
import { ActivityType, Role } from '../enums';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF19AF'];
type PeriodType = 'day' | 'week' | 'month';

const Dashboard: React.FC = () => {
    const { user, currentOperation } = useAuth();
    const [data, setData] = useState<DashboardData | null>(null);
    const [insights, setInsights] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isLoadingInsights, setIsLoadingInsights] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [periodType, setPeriodType] = useState<PeriodType>('day');
    const [referenceDate, setReferenceDate] = useState(() => new Date());
    const [selectedActivities, setSelectedActivities] = useState<ActivityType[]>([]);

    const isViewer = user?.role === Role.VIEWER;

    const { startDate, endDate } = useMemo(() => {
        const start = new Date(referenceDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(referenceDate);
        end.setHours(23, 59, 59, 999);

        if (periodType === 'week') {
            const dayOfWeek = start.getDay();
            const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            start.setDate(diff);
            end.setDate(start.getDate() + 6);
        } else if (periodType === 'month') {
            start.setDate(1);
            end.setMonth(end.getMonth() + 1);
            end.setDate(0);
        }
        
        return { startDate: start, endDate: end };
    }, [referenceDate, periodType]);

    const fetchData = useCallback(async (operationId: string) => {
        setIsLoading(true);
        try {
            const dashboardData = await getDashboardData(operationId, startDate, endDate, selectedActivities);
            setData(dashboardData);
            setError('');
        } catch (err) {
            setError('Failed to load dashboard data.');
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate, selectedActivities]);

    useEffect(() => {
        if (currentOperation) {
            fetchData(currentOperation.id);
        }
    }, [fetchData, currentOperation]);

    const handleGenerateInsights = async () => {
        if (!data || isViewer) return;
        setIsLoadingInsights(true);
        setInsights('');
        try {
            const result = await generateDashboardInsights(data);
            setInsights(result);
        } catch (err) {
            setInsights('Desculpe, não foi possível gerar os insights. Verifique a chave de API e tente novamente.');
        } finally {
            setIsLoadingInsights(false);
        }
    };
    
    const formattedInsights = useMemo(() => {
        return insights
            .split('**')
            .map((part, index) => (index % 2 === 1) ? <strong key={index} className="text-blue-600">{part}</strong> : part)
            .reduce<React.ReactNode[]>((acc, curr) => {
                if (typeof curr === 'string') {
                    return [...acc, ...curr.split('\n').map((line, lineIndex) => (
                        <p key={`${acc.length}-${lineIndex}`} className="mb-2">{line.replace(/^\* /, '• ')}</p>
                    ))];
                }
                return [...acc, curr];
            }, []);
    }, [insights]);
    
    const displayDateRange = useMemo(() => {
        const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
        if (periodType === 'day') return startDate.toLocaleDateString('pt-BR', options);
        return `${startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${endDate.toLocaleDateString('pt-BR', options)}`;
    }, [startDate, endDate, periodType]);

    const handleDateChange = (direction: 'prev' | 'next') => {
        setReferenceDate(prevDate => {
            const newDate = new Date(prevDate);
            const multiplier = direction === 'prev' ? -1 : 1;
            if (periodType === 'day') newDate.setDate(newDate.getDate() + multiplier);
            else if (periodType === 'week') newDate.setDate(newDate.getDate() + 7 * multiplier);
            else if (periodType === 'month') newDate.setMonth(newDate.getMonth() + multiplier);
            return newDate;
        });
    };

    const handleActivityToggle = (activity: ActivityType) => {
        setSelectedActivities(prev => prev.includes(activity) ? prev.filter(a => a !== activity) : [...prev, activity]);
    };

    const absenteeismData = useMemo(() => {
        if (!data?.operation || data.operation.totalHeadcount === 0) return null;

        const { totalHeadcount, employeesOnVacation, name } = data.operation;
        const effectiveHeadcount = totalHeadcount - employeesOnVacation;
        const absentToday = Math.max(0, effectiveHeadcount - data.activeEmployees);
        const absenteeismRate = effectiveHeadcount > 0 ? (absentToday / effectiveHeadcount) * 100 : 0;
        
        return {
            planned: totalHeadcount,
            onVacation: employeesOnVacation,
            active: data.activeEmployees,
            absent: absentToday,
            rate: absenteeismRate,
            operationName: name,
        };
    }, [data]);
    
    if (!currentOperation) {
        return (
            <div className="text-center p-10">
                <h2 className="text-2xl font-bold text-slate-700">Nenhuma Operação Selecionada</h2>
                <p className="text-slate-500">Por favor, selecione uma operação no menu para visualizar o dashboard.</p>
            </div>
        );
    }
    
    if (isLoading || !data) return <div className="text-center">Carregando Dashboard para {currentOperation.name}...</div>;
    if (error) return <div className="text-center text-red-500">{error}</div>;

    const GAUGE_MAX = 150;
    const gaugeValue = Math.min(data.overallProductivity, GAUGE_MAX);
    const endAngle = 180 - (gaugeValue * (180 / GAUGE_MAX));
    const performanceColor = data.overallProductivity > 100 ? '#10b981' : '#3b82f6';
    const performanceTextColor = data.overallProductivity > 100 ? 'text-emerald-500' : 'text-blue-500';
    const markerAngle = 180 - (100 * (180 / GAUGE_MAX));

    return (
        <div>
            <Header title="Dashboard" operationName={currentOperation.name} />
            <Card className="mb-6">
                 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                     <div className="flex items-center justify-center space-x-2 bg-slate-100 p-1.5 rounded-lg w-full lg:w-auto">
                        <div className="flex space-x-1 bg-white p-1 rounded-md shadow-sm">
                            {(['day', 'week', 'month'] as PeriodType[]).map(p => (
                                <button key={p} onClick={() => setPeriodType(p)} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${periodType === p ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => handleDateChange('prev')} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-200" aria-label="Anterior">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span className="font-semibold text-slate-800 w-48 text-center tabular-nums">{displayDateRange}</span>
                        <button onClick={() => handleDateChange('next')} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-200" aria-label="Próximo">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                     <div className="flex items-center flex-wrap gap-2 justify-center">
                        <button onClick={() => setSelectedActivities([])} className={`px-3 py-1 text-xs font-semibold rounded-full border ${selectedActivities.length === 0 ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}>Todas</button>
                        {Object.values(ActivityType).map(activity => (
                            <button key={activity} onClick={() => handleActivityToggle(activity)} className={`px-3 py-1 text-xs font-semibold rounded-full border ${selectedActivities.includes(activity) ? 'bg-blue-600 text-white' : 'bg-white text-slate-700'}`}>
                                {activity}
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            <div className={`grid grid-cols-1 md:grid-cols-2 ${absenteeismData ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6 mb-6`}>
                <Card title="Funcionários Ativos"><p className="text-4xl font-bold text-blue-600">{data.activeEmployees}</p><p className="text-slate-500">Em tempo real</p></Card>
                <Card title="Progresso de Tarefas">
                    <div className="flex justify-between items-baseline">
                        <p className="text-4xl font-bold text-emerald-500">{data.tasksProgress.toFixed(1)}%</p>
                        <p className="text-slate-500">{data.totalTasksToday.toFixed(0)} / {data.plannedTasksToday.toFixed(0)}</p>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 mt-2"><div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${Math.min(data.tasksProgress, 100)}%` }}></div></div>
                </Card>
                <Card title="Eficiência Operacional">
                    <div style={{ height: '80px', position: 'relative' }}>
                        <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                                <Pie data={[{v: GAUGE_MAX}]} dataKey="v" startAngle={180} endAngle={0} innerRadius="70%" outerRadius="100%" fill="#e2e8f0" stroke="none" />
                                <Pie data={[{v: gaugeValue}]} dataKey="v" startAngle={180} endAngle={endAngle} innerRadius="70%" outerRadius="100%" fill={performanceColor} stroke="none" cornerRadius={10} />
                                <Pie data={[{v: 1}]} dataKey="v" startAngle={markerAngle+1} endAngle={markerAngle-1} innerRadius="60%" outerRadius="110%" fill="#94a3b8" stroke="none" />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center -bottom-4"><p className={`text-3xl font-bold ${performanceTextColor}`}>{data.overallProductivity}%</p></div>
                    </div>
                    <p className="text-slate-500 text-center mt-2">Horas Padrão vs. Reais</p>
                </Card>
                {absenteeismData && (
                    <Card title="Análise de Headcount">
                        <div className="space-y-3">
                             <div className="flex justify-between items-center text-sm"><span className="font-medium text-slate-600">Total Planejado</span><span className="font-bold text-slate-800">{absenteeismData.planned}</span></div>
                             <div className="flex justify-between items-center text-sm"><span className="font-medium text-slate-600">Em Férias</span><span className="font-bold text-slate-800">{absenteeismData.onVacation}</span></div>
                             <div className="flex justify-between items-center text-sm"><span className="font-medium text-emerald-600">Presentes Hoje</span><span className="font-bold text-emerald-600">{absenteeismData.active}</span></div>
                             <div className="flex justify-between items-center text-sm"><span className="font-medium text-rose-600">Ausentes Hoje</span><span className="font-bold text-rose-600">{absenteeismData.absent}</span></div>
                             <div className="pt-2 mt-2 border-t border-slate-200 text-center"><p className="text-lg font-bold text-rose-500">{absenteeismData.rate.toFixed(1)}%</p><p className="text-xs text-slate-500">Taxa de Absenteísmo</p></div>
                        </div>
                    </Card>
                )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card title="Demanda vs. Execução"><ResponsiveContainer width="100%" height={300}><BarChart data={data.demandVsExecutionByActivity}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="planned" fill="#94a3b8" name="Planejado" /><Bar dataKey="actual" fill="#3b82f6" name="Realizado" /></BarChart></ResponsiveContainer></Card>
                <Card title="Distribuição de Funcionários">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie 
                                data={data.employeeDistribution} 
                                cx="50%" 
                                cy="50%" 
                                labelLine={false} 
                                innerRadius={70} 
                                outerRadius={110} 
                                fill="#8884d8" 
                                dataKey="value" 
                                nameKey="name" 
                                paddingAngle={5}
                                label={({ name, percent }) => {
                                    const numericPercent = Number(percent);
                                    if (name === undefined || isNaN(numericPercent)) {
                                        return null;
                                    }
                                    const percentage = (numericPercent * 100).toFixed(0);
                                    return `${name} ${percentage}%`;
                                }}
                            >
                                {data.employeeDistribution.map((_, i) => <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </Card>
            </div>
             <div className="mb-6">
                <Card title="Headcount vs. Demanda">
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={data.headcountVsDemand}><defs><linearGradient id="cH" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient><linearGradient id="cD" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Legend /><Area type="monotone" dataKey="headcount" name="Headcount" stroke="#3b82f6" fillOpacity={1} fill="url(#cH)" /><Area type="monotone" dataKey="demand" name="Demanda" stroke="#f97316" fillOpacity={1} fill="url(#cD)" /></AreaChart>
                    </ResponsiveContainer>
                </Card>
            </div>
            <Card title="Insights com IA Gemini">
                <button onClick={handleGenerateInsights} disabled={isLoadingInsights || isViewer} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors">
                    {isLoadingInsights ? 'Analisando...' : 'Gerar Insights'}
                </button>
                {isViewer && <p className="text-sm text-slate-500 mt-2">A geração de insights não está disponível para usuários de visualização.</p>}
                {isLoadingInsights && <div className="text-center p-4">Gerando análise...</div>}
                {insights && <div className="mt-4 p-4 bg-slate-50 rounded-lg whitespace-pre-wrap leading-relaxed">{formattedInsights}</div>}
            </Card>
        </div>
    );
};

export default Dashboard;