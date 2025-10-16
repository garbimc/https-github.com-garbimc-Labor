import React, { useEffect, useState, useMemo } from 'react';
import Header from '../components/Header';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Card from '../components/Card';
import { getTaskExecutions, saveTaskExecutions, getEmployees, getTimeLogs } from '../services/api';
import { TaskExecution, Employee, TimeLog } from '../types';
import { ActivityType, DriverType, Role } from '../enums';
import { TrashIcon } from '../components/icons/TrashIcon';
import { EditIcon } from '../components/icons/EditIcon';
import { useAuth } from '../context/AuthContext';

const Integration: React.FC = () => {
    const { user, currentOperation } = useAuth();
    const [tasks, setTasks] = useState<TaskExecution[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
    const [filters, setFilters] = useState({ employeeName: '', activity: '' });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<TaskExecution | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<TaskExecution | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    const isViewer = user?.role === Role.VIEWER;

    const initialFormState: Omit<TaskExecution, 'id' | 'executionDate' | 'employeeName'> = {
        activity: ActivityType.PICKING,
        quantity: 0,
        driver: DriverType.LINES,
        executionHours: 0,
        employeeId: '',
    };
    const [newTask, setNewTask] = useState(initialFormState);

    useEffect(() => {
        const fetchData = async () => {
            if (!currentOperation) return;
            const [tasksData, employeesData, logsData] = await Promise.all([
                getTaskExecutions(currentOperation.id),
                getEmployees(currentOperation.id),
                getTimeLogs(currentOperation.id),
            ]);
            setTasks(tasksData);
            setEmployees(employeesData);
            setTimeLogs(logsData);
        };
        fetchData();
    }, [currentOperation]);

    const employeeStatusMap = useMemo(() => {
        const statusMap = new Map<string, { status: 'Check-in' | 'Check-out'; activity: ActivityType | null }>();
        timeLogs.forEach(log => {
            if (!statusMap.has(log.employeeId)) {
                if (log.type === 'Check-in') {
                    statusMap.set(log.employeeId, { status: 'Check-in', activity: log.activity });
                } else {
                    statusMap.set(log.employeeId, { status: 'Check-out', activity: null });
                }
            }
        });
        return statusMap;
    }, [timeLogs]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => 
            (task.employeeName?.toLowerCase().includes(filters.employeeName.toLowerCase()) ?? true) &&
            (filters.activity ? task.activity === filters.activity : true)
        );
    }, [tasks, filters]);

    const handleNewInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewTask(prev => {
            const updated = { ...prev, [name]: ['quantity', 'executionHours'].includes(name) ? +value : value };
            if (name === 'activity') {
                updated.employeeId = ''; // Reset employee when activity changes
            }
            return updated;
        });
    };

    const handleAddTask = async () => {
        setFormError(null);
        if (!currentOperation) return;
        if (!newTask.employeeId) {
            setFormError("Por favor, selecione um funcionário.");
            return;
        }

        const selectedEmployee = employees.find(e => e.id === newTask.employeeId);
        if (!selectedEmployee) {
            setFormError("Funcionário não encontrado.");
            return;
        }

        const employeeStatus = employeeStatusMap.get(selectedEmployee.id);
        if (employeeStatus?.status !== 'Check-in' || employeeStatus?.activity !== newTask.activity) {
            setFormError(`O funcionário ${selectedEmployee.name} não está com check-in ativo para a atividade de ${newTask.activity}.`);
            return;
        }

        const taskToAdd: TaskExecution = {
            id: `T${Date.now()}`, ...newTask,
            employeeName: selectedEmployee.name,
            executionDate: new Date().toLocaleDateString('pt-BR'),
        };
        const updatedTasks = [taskToAdd, ...tasks];
        setTasks(updatedTasks);
        await saveTaskExecutions(currentOperation.id, updatedTasks);
        setIsAddModalOpen(false);
        setNewTask(initialFormState);
    };

    const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!editingTask) return;
        const { name, value } = e.target;
        setEditingTask(prev => {
            if (!prev) return null;
            const updated = { ...prev, [name]: ['quantity', 'executionHours'].includes(name) ? Number(value) : value };
            if (name === 'activity') {
                updated.employeeId = '';
            }
            return updated;
        });
    };

    const handleUpdateTask = async () => {
        setFormError(null);
        if (!currentOperation || !editingTask) return;
        
        const selectedEmployee = employees.find(e => e.id === editingTask.employeeId);
        if (!selectedEmployee) {
            setFormError("Funcionário não encontrado.");
            return;
        }

        const employeeStatus = employeeStatusMap.get(selectedEmployee.id);
        if (employeeStatus?.status !== 'Check-in' || employeeStatus?.activity !== editingTask.activity) {
            setFormError(`O funcionário ${selectedEmployee.name} não está com check-in ativo para a atividade de ${editingTask.activity}.`);
            return;
        }

        const updatedTaskWithEmployeeName = {
            ...editingTask,
            employeeName: selectedEmployee.name
        };

        const updatedTasks = tasks.map(t => t.id === editingTask.id ? updatedTaskWithEmployeeName : t);
        setTasks(updatedTasks);
        await saveTaskExecutions(currentOperation.id, updatedTasks);
        setEditingTask(null);
    };

    const handleOpenDeleteConfirm = (task: TaskExecution) => {
        setTaskToDelete(task);
        setIsDeleteConfirmOpen(true);
    };

    const handleCloseDeleteConfirm = () => {
        setTaskToDelete(null);
        setIsDeleteConfirmOpen(false);
    };

    const handleConfirmDelete = async () => {
        if (!currentOperation || !taskToDelete) return;
        const updatedTasks = tasks.filter(task => task.id !== taskToDelete.id);
        setTasks(updatedTasks);
        await saveTaskExecutions(currentOperation.id, updatedTasks);
        handleCloseDeleteConfirm();
    };
    
    const getEligibleEmployeesForActivity = (activity: ActivityType) => {
        return employees.filter(e => {
            const statusInfo = employeeStatusMap.get(e.id);
            return statusInfo?.status === 'Check-in' && statusInfo?.activity === activity;
        });
    };

    if (!currentOperation) return <div className="text-center p-10">Selecione uma operação para gerenciar as atividades.</div>;
    
    const tableHeaders = ["ID", "Funcionário", "Atividade", "Qtd", "Driver", "Horas", "Data", "Ações"];

    return (
        <div>
            <Header title="Integração de Atividades" operationName={currentOperation.name}>
                 {!isViewer && (
                    <div className="flex space-x-4">
                        <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">Adicionar Manualmente</button>
                    </div>
                 )}
            </Header>
            <Card className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="employeeName" placeholder="Filtrar por Funcionário..." onChange={(e) => setFilters(f => ({...f, employeeName: e.target.value}))} className="w-full px-3 py-2 border rounded-lg" />
                    <select name="activity" onChange={(e) => setFilters(f => ({...f, activity: e.target.value}))} className="w-full px-3 py-2 border rounded-lg"><option value="">Todas Atividades</option>{Object.values(ActivityType).map(t=><option key={t} value={t}>{t}</option>)}</select>
                </div>
            </Card>
            <Table headers={tableHeaders.filter(h => isViewer ? h !== "Ações" : true)}>
                {filteredTasks.map((task) => (
                    <tr key={task.id}>
                        <td className="px-6 py-4">{task.id}</td>
                        <td className="px-6 py-4">{task.employeeName}</td>
                        <td className="px-6 py-4">{task.activity}</td>
                        <td className="px-6 py-4">{task.quantity}</td>
                        <td className="px-6 py-4">{task.driver}</td>
                        <td className="px-6 py-4">{task.executionHours.toFixed(2)}</td>
                        <td className="px-6 py-4">{task.executionDate}</td>
                        {!isViewer && (
                            <td className="px-6 py-4"><div className="flex space-x-2"><button onClick={() => setEditingTask(task)}><EditIcon /></button><button onClick={() => handleOpenDeleteConfirm(task)}><TrashIcon /></button></div></td>
                        )}
                    </tr>
                ))}
            </Table>
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Adicionar Atividade Manual">
                <div className="space-y-4">
                    {formError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{formError}</p>}
                    <div>
                        <label htmlFor="add-activity" className="block text-sm font-medium text-slate-700">Atividade</label>
                        <p className="text-xs text-slate-500 mb-1">Selecione a tarefa que foi realizada.</p>
                        <select id="add-activity" name="activity" value={newTask.activity} onChange={handleNewInputChange} className="w-full p-2 border rounded">{Object.values(ActivityType).map(t=><option key={t} value={t}>{t}</option>)}</select>
                    </div>
                    <div>
                        <label htmlFor="add-employee" className="block text-sm font-medium text-slate-700">Funcionário Ativo</label>
                        <p className="text-xs text-slate-500 mb-1">Apenas funcionários com check-in ativo para esta atividade aparecerão aqui.</p>
                        <select id="add-employee" name="employeeId" value={newTask.employeeId} onChange={handleNewInputChange} className="w-full p-2 border rounded">
                            <option value="">Selecione o funcionário</option>
                            {getEligibleEmployeesForActivity(newTask.activity).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="add-driver" className="block text-sm font-medium text-slate-700">Driver</label>
                        <p className="text-xs text-slate-500 mb-1">Selecione a unidade de medida para a quantidade (ex: Linhas, Unidades).</p>
                        <select id="add-driver" name="driver" value={newTask.driver} onChange={handleNewInputChange} className="w-full p-2 border rounded">{Object.values(DriverType).map(t=><option key={t} value={t}>{t}</option>)}</select>
                    </div>
                    <div>
                        <label htmlFor="add-quantity" className="block text-sm font-medium text-slate-700">Quantidade</label>
                        <p className="text-xs text-slate-500 mb-1">Informe o número total de 'drivers' concluídos (ex: 150 linhas).</p>
                        <input id="add-quantity" type="number" name="quantity" placeholder="Ex: 150" value={newTask.quantity} onChange={handleNewInputChange} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label htmlFor="add-hours" className="block text-sm font-medium text-slate-700">Horas de Execução</label>
                        <p className="text-xs text-slate-500 mb-1">Informe o tempo total gasto (ex: 2.5 para 2h 30min).</p>
                        <input id="add-hours" type="number" step="0.1" name="executionHours" placeholder="Ex: 2.5" value={newTask.executionHours} onChange={handleNewInputChange} className="w-full p-2 border rounded" />
                    </div>
                    <div className="flex justify-end pt-4 space-x-2">
                        <button onClick={() => setIsAddModalOpen(false)} className="bg-slate-200 py-2 px-4 rounded-lg">Cancelar</button>
                        <button onClick={handleAddTask} className="bg-blue-600 text-white py-2 px-4 rounded-lg">Salvar</button>
                    </div>
                </div>
            </Modal>
            {editingTask && <Modal isOpen={!!editingTask} onClose={() => setEditingTask(null)} title="Editar Atividade">
                <div className="space-y-4">
                    {formError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{formError}</p>}
                    <div>
                        <label htmlFor="edit-activity" className="block text-sm font-medium text-slate-700">Atividade</label>
                        <p className="text-xs text-slate-500 mb-1">Selecione a tarefa que foi realizada.</p>
                        <select id="edit-activity" name="activity" value={editingTask.activity} onChange={handleEditInputChange} className="w-full p-2 border rounded">{Object.values(ActivityType).map(t=><option key={t} value={t}>{t}</option>)}</select>
                    </div>
                    <div>
                        <label htmlFor="edit-employee" className="block text-sm font-medium text-slate-700">Funcionário Ativo</label>
                        <p className="text-xs text-slate-500 mb-1">Apenas funcionários com check-in ativo para esta atividade aparecerão aqui.</p>
                        <select id="edit-employee" name="employeeId" value={editingTask.employeeId} onChange={handleEditInputChange} className="w-full p-2 border rounded">
                            <option value="">Selecione o funcionário</option>
                            {getEligibleEmployeesForActivity(editingTask.activity).map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="edit-driver" className="block text-sm font-medium text-slate-700">Driver</label>
                        <p className="text-xs text-slate-500 mb-1">Selecione a unidade de medida para a quantidade (ex: Linhas, Unidades).</p>
                        <select id="edit-driver" name="driver" value={editingTask.driver} onChange={handleEditInputChange} className="w-full p-2 border rounded">{Object.values(DriverType).map(t=><option key={t} value={t}>{t}</option>)}</select>
                    </div>
                    <div>
                        <label htmlFor="edit-quantity" className="block text-sm font-medium text-slate-700">Quantidade</label>
                        <p className="text-xs text-slate-500 mb-1">Informe o número total de 'drivers' concluídos (ex: 150 linhas).</p>
                        <input id="edit-quantity" type="number" name="quantity" placeholder="Ex: 150" value={editingTask.quantity} onChange={handleEditInputChange} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label htmlFor="edit-hours" className="block text-sm font-medium text-slate-700">Horas de Execução</label>
                        <p className="text-xs text-slate-500 mb-1">Informe o tempo total gasto (ex: 2.5 para 2h 30min).</p>
                        <input id="edit-hours" type="number" step="0.1" name="executionHours" placeholder="Ex: 2.5" value={editingTask.executionHours} onChange={handleEditInputChange} className="w-full p-2 border rounded" />
                    </div>
                    <div className="flex justify-end pt-4 space-x-2">
                        <button onClick={() => setEditingTask(null)} className="bg-slate-200 py-2 px-4 rounded-lg">Cancelar</button>
                        <button onClick={handleUpdateTask} className="bg-blue-600 text-white py-2 px-4 rounded-lg">Salvar</button>
                    </div>
                </div>
            </Modal>}
             {taskToDelete && (
                <Modal isOpen={isDeleteConfirmOpen} onClose={handleCloseDeleteConfirm} title="Confirmar Exclusão">
                    <div className="text-center">
                        <p>Deseja realmente excluir a atividade de <strong>{taskToDelete.activity}</strong> executada por <strong>{taskToDelete.employeeName || 'N/A'}</strong>?</p>
                        <p className="text-sm text-slate-500 mt-2">Esta ação é irreversível.</p>
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

export default Integration;