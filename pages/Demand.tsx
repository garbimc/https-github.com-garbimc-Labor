import React, { useState, useEffect, useMemo } from 'react';
import Header from '../components/Header';
import Modal from '../components/Modal';
import Card from '../components/Card';
import Table from '../components/Table';
import InfoTooltip from '../components/InfoTooltip';
import { getEngineeringStandards, saveEngineeringStandards } from '../services/api';
import { EngineeringStandard } from '../types';
import { ActivityType, ProcessType, DriverType, Role } from '../enums';
import { TrashIcon } from '../components/icons/TrashIcon';
import { EditIcon } from '../components/icons/EditIcon';
import { ReplicateIcon } from '../components/icons/ReplicateIcon';
import { useAuth } from '../context/AuthContext';

const Demand: React.FC = () => {
    const { user, currentOperation } = useAuth();
    const [standards, setStandards] = useState<EngineeringStandard[]>([]);
    const [filteredStandards, setFilteredStandards] = useState<EngineeringStandard[]>([]);
    const [filters, setFilters] = useState({ activity: '', processType: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [standardToDelete, setStandardToDelete] = useState<EngineeringStandard | null>(null);
    const [isReplicateModalOpen, setIsReplicateModalOpen] = useState(false);
    
    const [editingStandard, setEditingStandard] = useState<EngineeringStandard | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    const [editingCell, setEditingCell] = useState<{ rowId: string; columnKey: keyof EngineeringStandard } | null>(null);
    const [editValue, setEditValue] = useState<string | number>('');

    const [calendarViewDate, setCalendarViewDate] = useState(new Date());
    const [selectedReplicationDates, setSelectedReplicationDates] = useState<Date[]>([]);

    type PeriodType = 'day' | 'week' | 'month';
    const [periodType, setPeriodType] = useState<PeriodType>('week');
    const [referenceDate, setReferenceDate] = useState(() => new Date());

    const isViewer = user?.role === Role.VIEWER;

    const { startDate, endDate } = useMemo(() => {
        const start = new Date(referenceDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(referenceDate);
        end.setHours(23, 59, 59, 999);

        if (periodType === 'week') {
            const dayOfWeek = start.getDay();
            const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // week starts on Monday
            start.setDate(diff);
            end.setDate(start.getDate() + 6);
        } else if (periodType === 'month') {
            start.setDate(1);
            end.setMonth(end.getMonth() + 1);
            end.setDate(0);
        }
        return { startDate: start, endDate: end };
    }, [referenceDate, periodType]);

    const parseDateString = (dateStr: string): Date => {
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
    };
    
    const initialFormState: Omit<EngineeringStandard, 'id' | 'executionDate'> = {
        activity: ActivityType.PICKING,
        processType: ProcessType.SYSTEMIC,
        cycleTime: 0, hourlyProductivity: 0, dailyDemand: 0,
        driver: DriverType.LINES, breakTime: 1, headcounts: 0, workTime: 8,
    };
    const [currentStandard, setCurrentStandard] = useState(initialFormState);

    useEffect(() => {
        if (currentOperation) {
            getEngineeringStandards(currentOperation.id).then(setStandards);
        } else {
            setStandards([]);
        }
    }, [currentOperation]);

    useEffect(() => {
        let dateFilteredData = standards.filter(standard => {
            const standardDate = parseDateString(standard.executionDate);
            if (isNaN(standardDate.getTime())) return false;
            standardDate.setHours(0, 0, 0, 0);
            return standardDate >= startDate && standardDate <= endDate;
        });

        if (filters.activity) {
            dateFilteredData = dateFilteredData.filter(s => s.activity === filters.activity);
        }
        if (filters.processType) {
            dateFilteredData = dateFilteredData.filter(s => s.processType === filters.processType);
        }
        setFilteredStandards(dateFilteredData);
    }, [standards, filters, startDate, endDate]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        setCurrentStandard(prevStandard => {
            const isNumeric = !['activity', 'processType', 'driver'].includes(name);
            const numericValue = isNaN(Number(value)) ? 0 : Number(value);
            const newFieldValue = isNumeric ? numericValue : value;

            // 1. Create a new state object with the user's direct change
            let updatedStandard = {
                ...prevStandard,
                [name]: newFieldValue
            };

            // 2. Handle linked calculations (Cycle Time <=> Productivity)
            if (name === 'cycleTime') {
                const cycleTime = newFieldValue as number;
                updatedStandard.hourlyProductivity = cycleTime > 0 ? parseFloat((3600 / cycleTime).toFixed(2)) : 0;
            } else if (name === 'hourlyProductivity') {
                const productivity = newFieldValue as number;
                updatedStandard.cycleTime = productivity > 0 ? parseFloat((3600 / productivity).toFixed(2)) : 0;
            }

            // 3. Recalculate headcounts based on the potentially updated state
            const { hourlyProductivity, dailyDemand, workTime, breakTime } = updatedStandard;
            const effectiveWorkTime = workTime - breakTime;

            if (hourlyProductivity > 0 && dailyDemand > 0 && effectiveWorkTime > 0) {
                const productivityPerEmployeePerDay = hourlyProductivity * effectiveWorkTime;
                const requiredHeadcounts = dailyDemand / productivityPerEmployeePerDay;
                updatedStandard.headcounts = Math.ceil(requiredHeadcounts);
            } else {
                updatedStandard.headcounts = 0;
            }

            return updatedStandard;
        });
    };
    
    const handleOpenModal = (standard: EngineeringStandard | null = null) => {
        setEditingStandard(standard);
        setCurrentStandard(standard ? { ...standard } : initialFormState);
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!currentOperation) return;
        
        const standardToSave = { 
            ...currentStandard, 
            executionDate: new Date().toLocaleDateString('pt-BR') 
        };

        const updatedStandards = editingStandard 
            ? standards.map(s => s.id === editingStandard.id ? { ...standardToSave, id: editingStandard.id } : s)
            : [...standards, { id: `S${Date.now()}`, ...standardToSave }];

        setStandards(updatedStandards);
        await saveEngineeringStandards(currentOperation.id, updatedStandards);
        setIsModalOpen(false);
    };
    
    const handleOpenDeleteConfirm = (standard: EngineeringStandard) => {
        setStandardToDelete(standard);
        setIsDeleteConfirmOpen(true);
    };

    const handleCloseDeleteConfirm = () => {
        setStandardToDelete(null);
        setIsDeleteConfirmOpen(false);
    };

    const handleConfirmDelete = async () => {
        if (!standardToDelete || !currentOperation) return;
        const updatedStandards = standards.filter(s => s.id !== standardToDelete.id);
        setStandards(updatedStandards);
        await saveEngineeringStandards(currentOperation.id, updatedStandards);
        handleCloseDeleteConfirm();
    };


    const handleSaveEdit = async () => {
        if (!editingCell || !currentOperation) return;
        const updatedStandards = standards.map(s => 
            s.id === editingCell.rowId ? { ...s, [editingCell.columnKey]: Number(editValue) } : s
        );
        setStandards(updatedStandards);
        await saveEngineeringStandards(currentOperation.id, updatedStandards);
        setEditingCell(null);
    };
    
    const handleOpenReplicateModal = () => {
        setCalendarViewDate(new Date());
        setSelectedReplicationDates([]);
        setIsReplicateModalOpen(true);
    };

    const handleCloseReplicateModal = () => {
        setIsReplicateModalOpen(false);
    };

    const handleDateSelect = (date: Date) => {
        setSelectedReplicationDates(prev => {
            const dateString = date.toDateString();
            const isSelected = prev.some(d => d.toDateString() === dateString);
            if (isSelected) {
                return prev.filter(d => d.toDateString() !== dateString);
            } else {
                return [...prev, date].sort((a, b) => a.getTime() - b.getTime());
            }
        });
    };

    const handleReplicate = async () => {
        if (!currentOperation) return;

        const standardsToReplicate = standards.filter(s => selectedIds.includes(s.id));
        
        if (standardsToReplicate.length === 0 || selectedReplicationDates.length === 0) {
            alert("Selecione pelo menos um padrão e uma data para replicar.");
            return;
        }

        const newStandards: EngineeringStandard[] = [];
        selectedReplicationDates.forEach(date => {
            const executionDate = date.toLocaleDateString('pt-BR');
            standardsToReplicate.forEach(standard => {
                newStandards.push({
                    ...standard,
                    id: `S${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    executionDate: executionDate
                });
            });
        });

        const updatedStandards = [...standards, ...newStandards];
        setStandards(updatedStandards);
        await saveEngineeringStandards(currentOperation.id, updatedStandards);
        
        handleCloseReplicateModal();
        setSelectedIds([]);
    };
    
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

    const Calendar = () => {
        const month = calendarViewDate.getMonth();
        const year = calendarViewDate.getFullYear();
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

        const dayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
        const calendarDays = [];

        for (let i = 0; i < startDayOfWeek; i++) {
            calendarDays.push(<div key={`pad-${i}`} />);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateString = date.toDateString();
            const isSelected = selectedReplicationDates.some(d => d.toDateString() === dateString);
            const isToday = new Date().toDateString() === dateString;

            calendarDays.push(
                <button
                    key={day}
                    onClick={() => handleDateSelect(date)}
                    className={`w-10 h-10 flex items-center justify-center rounded-full text-sm transition-colors duration-200
                        ${isSelected ? 'bg-blue-600 text-white font-bold shadow-md' : 'hover:bg-slate-200'}
                        ${!isSelected && isToday ? 'border-2 border-blue-500' : ''}
                        ${!isSelected && !isToday ? 'text-slate-700' : ''}
                    `}
                >
                    {day}
                </button>
            );
        }

        return (
            <div>
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setCalendarViewDate(new Date(year, month - 1, 1))} className="p-2 rounded-full hover:bg-slate-200">&lt;</button>
                    <span className="font-bold text-lg text-slate-800">{calendarViewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={() => setCalendarViewDate(new Date(year, month + 1, 1))} className="p-2 rounded-full hover:bg-slate-200">&gt;</button>
                </div>
                <div className="grid grid-cols-7 gap-2 text-center text-xs text-slate-500 font-semibold mb-2">
                    {dayLabels.map((label, i) => <div key={i}>{label}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-2 justify-items-center">
                    {calendarDays}
                </div>
            </div>
        );
    };

    if (!currentOperation) return <div className="text-center p-10">Selecione uma operação para gerenciar as demandas.</div>;
    
    const tableHeaders = ["", "Atividade", "Processo", "Driver", "Produtividade/h", "Demanda/dia", "Headcounts", "Data", "Ações"];

    return (
        <div>
            <Header title="Padrões de Engenharia" operationName={currentOperation.name}>
                {!isViewer && (
                    <button onClick={() => handleOpenModal()} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Adicionar Padrão</button>
                )}
            </Header>

            <Card className="mb-6">
                 <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-4 pb-4 border-b border-slate-200">
                    <div className="flex items-center justify-center space-x-2 bg-slate-100 p-1.5 rounded-lg w-full lg:w-auto">
                        <div className="flex space-x-1 bg-white p-1 rounded-md shadow-sm">
                            {(['day', 'week', 'month'] as PeriodType[]).map(p => (
                                <button key={p} onClick={() => setPeriodType(p)} className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${periodType === p ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
                                    {p === 'day' ? 'Dia' : p === 'week' ? 'Semana' : 'Mês'}
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
                     <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-slate-600">Filtrar por:</span>
                        <select name="activity" value={filters.activity} onChange={(e) => setFilters(f => ({...f, activity: e.target.value}))} className="px-3 py-2 border rounded-lg bg-white text-sm focus:ring-blue-500 focus:border-blue-500"><option value="">Atividade</option>{Object.values(ActivityType).map(t => <option key={t} value={t}>{t}</option>)}</select>
                        <select name="processType" value={filters.processType} onChange={(e) => setFilters(f => ({...f, processType: e.target.value}))} className="px-3 py-2 border rounded-lg bg-white text-sm focus:ring-blue-500 focus:border-blue-500"><option value="">Processo</option>{Object.values(ProcessType).map(t => <option key={t} value={t}>{t}</option>)}</select>
                     </div>
                </div>
                
                {!isViewer && (
                    <div><button onClick={handleOpenReplicateModal} disabled={selectedIds.length === 0} className="bg-sky-500 text-white font-bold py-2 px-4 rounded-lg disabled:bg-slate-300 flex items-center"><ReplicateIcon /><span className="ml-2">Replicar ({selectedIds.length})</span></button></div>
                )}
            </Card>

            <Table headers={tableHeaders.filter(h => isViewer ? h !== "Ações" : true)}>
                {filteredStandards.map(standard => (
                    <tr key={standard.id} className={selectedIds.includes(standard.id) ? 'bg-blue-50' : ''}>
                        <td className="p-4"><input type="checkbox" checked={selectedIds.includes(standard.id)} onChange={() => setSelectedIds(p => p.includes(standard.id) ? p.filter(id => id !== standard.id) : [...p, standard.id])} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/></td>
                        <td className="px-6 py-4">{standard.activity}</td>
                        <td className="px-6 py-4">{standard.processType}</td>
                        <td className="px-6 py-4">{standard.driver}</td>
                        <td className="px-6 py-4" onDoubleClick={() => { if(!isViewer) { setEditingCell({ rowId: standard.id, columnKey: 'hourlyProductivity' }); setEditValue(standard.hourlyProductivity); } }}>{editingCell?.rowId === standard.id && editingCell?.columnKey === 'hourlyProductivity' ? <input type="number" value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={handleSaveEdit} autoFocus className="w-20 p-1 border rounded" /> : standard.hourlyProductivity}</td>
                        <td className="px-6 py-4" onDoubleClick={() => { if(!isViewer) { setEditingCell({ rowId: standard.id, columnKey: 'dailyDemand' }); setEditValue(standard.dailyDemand); } }}>{editingCell?.rowId === standard.id && editingCell?.columnKey === 'dailyDemand' ? <input type="number" value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={handleSaveEdit} autoFocus className="w-20 p-1 border rounded" /> : standard.dailyDemand}</td>
                        <td className="px-6 py-4" onDoubleClick={() => { if(!isViewer) { setEditingCell({ rowId: standard.id, columnKey: 'headcounts' }); setEditValue(standard.headcounts); } }}>{editingCell?.rowId === standard.id && editingCell?.columnKey === 'headcounts' ? <input type="number" value={editValue} onChange={e=>setEditValue(e.target.value)} onBlur={handleSaveEdit} autoFocus className="w-20 p-1 border rounded" /> : standard.headcounts}</td>
                        <td className="px-6 py-4">{standard.executionDate}</td>
                        {!isViewer && (
                            <td className="px-6 py-4"><div className="flex space-x-3"><button onClick={() => handleOpenModal(standard)}><EditIcon /></button><button onClick={() => handleOpenDeleteConfirm(standard)}><TrashIcon /></button></div></td>
                        )}
                    </tr>
                ))}
            </Table>
             <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingStandard ? `Editar Padrão` : `Adicionar Padrão`}>
                <div className="space-y-4">
                    <div><label className="block text-sm font-medium text-slate-700">Atividade</label><select name="activity" value={currentStandard.activity} onChange={handleFormChange} className="mt-1 block w-full p-2 border border-slate-300 rounded-md">{Object.values(ActivityType).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div><label className="block text-sm font-medium text-slate-700">Tipo de Processo</label><select name="processType" value={currentStandard.processType} onChange={handleFormChange} className="mt-1 block w-full p-2 border border-slate-300 rounded-md">{Object.values(ProcessType).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div><label className="block text-sm font-medium text-slate-700">Driver</label><select name="driver" value={currentStandard.driver} onChange={handleFormChange} className="mt-1 block w-full p-2 border border-slate-300 rounded-md">{Object.values(DriverType).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex items-center space-x-2 mb-1">
                                <label className="block text-sm font-medium text-slate-700">Tempo de Ciclo (s)</label>
                                <InfoTooltip text="Tempo médio em segundos para completar uma unidade da atividade (ex: uma linha, um item)." />
                            </div>
                            <input type="number" name="cycleTime" value={currentStandard.cycleTime} onChange={handleFormChange} className="block w-full p-2 border border-slate-300 rounded-md" />
                        </div>
                        <div>
                             <div className="flex items-center space-x-2 mb-1">
                                <label className="block text-sm font-medium text-slate-700">Produtividade / Hora</label>
                                <InfoTooltip text="Unidades produzidas por hora. Calculado como (3600 / Tempo de Ciclo)." />
                            </div>
                            <input type="number" name="hourlyProductivity" value={currentStandard.hourlyProductivity} onChange={handleFormChange} className="block w-full p-2 border border-slate-300 rounded-md" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <div className="flex items-center space-x-2 mb-1">
                                <label className="block text-sm font-medium text-slate-700">Demanda Diária</label>
                                <InfoTooltip text="Total de unidades (linhas, itens) necessárias para o dia." />
                            </div>
                            <input type="number" name="dailyDemand" value={currentStandard.dailyDemand} onChange={handleFormChange} className="block w-full p-2 border border-slate-300 rounded-md" />
                        </div>
                        <div>
                            <div className="flex items-center space-x-2 mb-1">
                                <label className="block text-sm font-medium text-slate-700">Tempo de Trabalho (h)</label>
                                <InfoTooltip text="Total de horas de trabalho no turno, excluindo pausas." />
                            </div>
                            <input type="number" name="workTime" value={currentStandard.workTime} onChange={handleFormChange} className="block w-full p-2 border border-slate-300 rounded-md" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <div className="flex items-center space-x-2 mb-1">
                                <label className="block text-sm font-medium text-slate-700">Pausa (h)</label>
                                <InfoTooltip text="Tempo total de pausas e descansos em horas durante o turno." />
                            </div>
                            <input type="number" name="breakTime" value={currentStandard.breakTime} onChange={handleFormChange} className="block w-full p-2 border border-slate-300 rounded-md" />
                        </div>
                        <div>
                            <div className="flex items-center space-x-2 mb-1">
                                <label className="block text-sm font-medium text-slate-700">Headcounts</label>
                                <InfoTooltip text="Número de funcionários necessários para atender a demanda. Este valor é calculado automaticamente." />
                            </div>
                            <input type="number" name="headcounts" value={currentStandard.headcounts} className="block w-full p-2 border border-slate-300 rounded-md bg-slate-100" readOnly />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4 space-x-2">
                        <button onClick={() => setIsModalOpen(false)} className="bg-slate-200 py-2 px-4 rounded-lg">Cancelar</button>
                        <button onClick={handleSubmit} className="bg-blue-600 text-white py-2 px-4 rounded-lg">Salvar</button>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={isReplicateModalOpen} onClose={handleCloseReplicateModal} title="Replicar Padrões">
                <div className="space-y-4">
                    <p>Selecione os dias no calendário para replicar os <strong>{selectedIds.length}</strong> padrões selecionados.</p>
                    <div className="p-4 border rounded-lg bg-slate-50">
                        <Calendar />
                    </div>
                    <div className="flex justify-end pt-4 space-x-2">
                        <button onClick={handleCloseReplicateModal} className="bg-slate-200 py-2 px-4 rounded-lg">Cancelar</button>
                        <button onClick={handleReplicate} className="bg-sky-600 text-white py-2 px-4 rounded-lg" disabled={selectedReplicationDates.length === 0}>
                            Replicar ({selectedReplicationDates.length})
                        </button>
                    </div>
                </div>
            </Modal>

            {standardToDelete && (
                <Modal isOpen={isDeleteConfirmOpen} onClose={handleCloseDeleteConfirm} title="Confirmar Exclusão">
                    <div className="text-center">
                        <p>Deseja realmente excluir o padrão de <strong>{standardToDelete.activity}</strong> ({standardToDelete.processType})? Esta ação é irreversível.</p>
                        <div className="flex justify-center mt-6 space-x-4">
                            <button onClick={handleCloseDeleteConfirm} className="bg-slate-200 py-2 px-6 rounded-lg">Cancelar</button>
                            <button onClick={handleConfirmDelete} className="bg-rose-600 text-white py-2 px-6 rounded-lg">Excluir</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Demand;