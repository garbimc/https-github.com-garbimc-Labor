
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Header from '../components/Header';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Card from '../components/Card';
import { getEmployees, getTimeLogs, addEmployee, updateEmployee, deleteEmployee, getTaskExecutions } from '../services/api';
import { Employee, TimeLog, TaskExecution } from '../types';
import { ActivityType, Role } from '../enums';
import { TrashIcon } from '../components/icons/TrashIcon';
import { EditIcon } from '../components/icons/EditIcon';
import { HistoryIcon } from '../components/icons/HistoryIcon';
import { useAuth } from '../context/AuthContext';

const PhotoPlaceholderIcon: React.FC = () => (
    <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

const Employees: React.FC = () => {
    const { user, currentOperation, allOperations } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
    const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
    const [filters, setFilters] = useState({ name: '', activity: '' });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [employeeHistory, setEmployeeHistory] = useState<{ logs: TimeLog[], tasks: TaskExecution[] }>({ logs: [], tasks: [] });
    
    const initialNewEmployeeState = { name: '', activities: [] as ActivityType[], photo: '', operationIds: [] as string[] };
    const [newEmployee, setNewEmployee] = useState(initialNewEmployeeState);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const isViewer = user?.role === Role.VIEWER;
    const isAdmin = user?.role === Role.ADMIN;
    
    const fetchData = async () => {
        if (!currentOperation) {
            setEmployees([]);
            setTimeLogs([]);
            return;
        }
        const [employeesData, logsData] = await Promise.all([
            getEmployees(currentOperation.id),
            getTimeLogs(currentOperation.id)
        ]);
        setEmployees(employeesData);
        setTimeLogs(logsData);
    };

    useEffect(() => {
        fetchData();
    }, [currentOperation]);
    
    const employeeStatusMap = useMemo(() => {
        const statusMap = new Map<string, { status: 'Check-in' | 'Check-out'; activity: ActivityType | null }>();
        // logs are sorted descending by timestamp in api.ts
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

    useEffect(() => {
        let filteredData = employees;
        if (filters.name) filteredData = filteredData.filter(e => e.name.toLowerCase().includes(filters.name.toLowerCase()));
        if (filters.activity) filteredData = filteredData.filter(e => e.activities.includes(filters.activity as ActivityType));
        setFilteredEmployees(filteredData);
    }, [employees, filters]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (isEditModalOpen && editingEmployee) {
            setEditingEmployee(prev => prev ? { ...prev, [name]: value } : null);
        } else {
            setNewEmployee(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleActivityToggle = (activity: ActivityType, isEditing: boolean) => {
        if (isEditing && editingEmployee) {
            const newActivities = editingEmployee.activities.includes(activity)
                ? editingEmployee.activities.filter(a => a !== activity)
                : [...editingEmployee.activities, activity];
            setEditingEmployee({ ...editingEmployee, activities: newActivities });
        } else {
            const newActivities = newEmployee.activities.includes(activity)
                ? newEmployee.activities.filter(a => a !== activity)
                : [...newEmployee.activities, activity];
            setNewEmployee({ ...newEmployee, activities: newActivities });
        }
    };

    const handleOperationSelection = (opId: string, isEditing: boolean) => {
        if (isEditing && editingEmployee) {
            const newOpIds = editingEmployee.operationIds.includes(opId)
                ? editingEmployee.operationIds.filter(id => id !== opId)
                : [...editingEmployee.operationIds, opId];
            setEditingEmployee({ ...editingEmployee, operationIds: newOpIds });
        } else {
            const newOpIds = newEmployee.operationIds.includes(opId)
                ? newEmployee.operationIds.filter(id => id !== opId)
                : [...newEmployee.operationIds, opId];
            setNewEmployee({ ...newEmployee, operationIds: newOpIds });
        }
    };
    
    const cleanupCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };
    
    const handleOpenCamera = async () => {
        setIsCameraModalOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) videoRef.current.srcObject = stream;
            streamRef.current = stream;
        } catch (err) {
            console.error("Error accessing camera: ", err);
            setFormError("Não foi possível acessar a câmera. Verifique as permissões.");
            setIsCameraModalOpen(false);
        }
    };

    const handleCloseCamera = () => {
        cleanupCamera();
        setIsCameraModalOpen(false);
    };
    
    const handleCapturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
            const photo = canvas.toDataURL('image/jpeg');
            if (isEditModalOpen && editingEmployee) {
                setEditingEmployee({ ...editingEmployee, photo });
            } else {
                setNewEmployee(prev => ({ ...prev, photo }));
            }
            setFormError(null);
            handleCloseCamera();
        }
    };

    const handleAddEmployee = async () => {
        setFormError(null);
        if (!newEmployee.name.trim()) return setFormError('O nome do funcionário é obrigatório.');
        if (!newEmployee.photo) return setFormError('É obrigatório capturar uma foto.');
        if (newEmployee.operationIds.length === 0) return setFormError('Selecione pelo menos uma operação.');
        if (newEmployee.activities.length === 0) return setFormError('Selecione pelo menos uma atividade.');

        const employeeToAdd: Employee = {
            id: `E${Date.now()}`,
            name: newEmployee.name.trim(),
            activities: newEmployee.activities,
            registrationDate: new Date().toLocaleDateString('pt-BR'),
            photo: newEmployee.photo,
            operationIds: newEmployee.operationIds,
        };

        await addEmployee(employeeToAdd);
        await fetchData();
        handleCloseAddModal();
    };
    
    const handleOpenAddModal = () => {
        if (!currentOperation) return;
        setNewEmployee({
            ...initialNewEmployeeState,
            operationIds: [currentOperation.id] // Default to current operation
        });
        setIsAddModalOpen(true);
    };
    
    const handleCloseAddModal = () => {
        setIsAddModalOpen(false);
        setNewEmployee(initialNewEmployeeState);
        setFormError(null);
    }

    const handleOpenEditModal = (employee: Employee) => {
        setEditingEmployee(employee);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingEmployee(null);
    };

    const handleUpdateEmployee = async () => {
        if (!editingEmployee) return;
        if (editingEmployee.operationIds.length === 0) return alert('O funcionário deve pertencer a pelo menos uma operação.');
        if (editingEmployee.activities.length === 0) return alert('O funcionário deve ter pelo menos uma atividade.');

        await updateEmployee(editingEmployee);
        await fetchData();
        handleCloseEditModal();
    };

    const handleOpenDeleteConfirm = (employee: Employee) => {
        setEmployeeToDelete(employee);
        setIsDeleteConfirmOpen(true);
    };

    const handleCloseDeleteConfirm = () => {
        setEmployeeToDelete(null);
        setIsDeleteConfirmOpen(false);
    };

    const handleConfirmDelete = async () => {
        if (!employeeToDelete) return;
        await deleteEmployee(employeeToDelete.id);
        await fetchData();
        handleCloseDeleteConfirm();
    };

    const handleOpenHistoryModal = async (employee: Employee) => {
        if (!currentOperation) return;
        // History is per-operation, so we fetch for the current one
        const [allLogs, allTasks] = await Promise.all([
            getTimeLogs(currentOperation.id),
            getTaskExecutions(currentOperation.id)
        ]);
        setEmployeeHistory({
            logs: allLogs.filter(log => log.employeeId === employee.id),
            tasks: allTasks.filter(task => task.employeeId === employee.id)
        });
        setSelectedEmployee(employee);
        setIsHistoryModalOpen(true);
    };
    
    const handleCloseHistoryModal = () => setIsHistoryModalOpen(false);

    if (!currentOperation) return <div className="text-center p-10">Selecione uma operação para gerenciar funcionários.</div>;
    
    const renderActivitySelector = (isEditing: boolean) => {
        const selectedActivities = isEditing ? editingEmployee?.activities || [] : newEmployee.activities;
        return (
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Atividades</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 border rounded-lg bg-slate-50">
                    {Object.values(ActivityType).map(activity => (
                        <div key={activity} className="flex items-center">
                            <input
                                type="checkbox"
                                id={`act-${activity}-${isEditing ? 'edit' : 'add'}`}
                                checked={selectedActivities.includes(activity)}
                                onChange={() => handleActivityToggle(activity, isEditing)}
                                className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor={`act-${activity}-${isEditing ? 'edit' : 'add'}`} className="ml-2 text-sm text-slate-800 cursor-pointer">
                                {activity}
                            </label>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderOperationsSelector = (isEditing: boolean) => {
        const selectedIds = isEditing ? editingEmployee?.operationIds || [] : newEmployee.operationIds;
        return (
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Operações</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border rounded-lg max-h-32 overflow-y-auto bg-slate-50">
                    {allOperations.map(op => (
                        <div key={op.id} className="flex items-center">
                            <input
                                type="checkbox"
                                id={`op-${op.id}-${isEditing ? 'edit' : 'add'}`}
                                checked={selectedIds.includes(op.id)}
                                onChange={() => handleOperationSelection(op.id, isEditing)}
                                className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor={`op-${op.id}-${isEditing ? 'edit' : 'add'}`} className="ml-2 text-sm text-slate-800 cursor-pointer">
                                {op.name}
                            </label>
                        </div>
                    ))}
                </div>
            </div>
        );
    };
    
    const tableHeaders = ["Foto", "Nome", ...(isAdmin ? ["ID do Funcionário"] : []), "Status", "Atividades", "Cadastro", "Ações"];

    return (
        <div>
            <Header title="Funcionários" operationName={currentOperation.name}>
                {!isViewer && (
                    <button onClick={handleOpenAddModal} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Adicionar Funcionário</button>
                )}
            </Header>
            <Card className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" name="name" value={filters.name} onChange={handleFilterChange} placeholder="Filtrar por Nome..." className="w-full px-3 py-2 border rounded-lg" />
                    <select name="activity" value={filters.activity} onChange={handleFilterChange} className="w-full px-3 py-2 border rounded-lg">
                        <option value="">Todas Atividades</option>
                        {Object.values(ActivityType).map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>
            </Card>
            <Table headers={tableHeaders}>
                {filteredEmployees.map(employee => {
                    const statusInfo = employeeStatusMap.get(employee.id);
                    const isOnline = statusInfo?.status === 'Check-in';
                    return (
                        <tr key={employee.id}>
                            <td className="px-6 py-4"><img src={employee.photo} alt={employee.name} className="w-10 h-10 rounded-full object-cover" /></td>
                            <td className="px-6 py-4 font-medium">{employee.name}</td>
                            {isAdmin && (
                                <td className="px-6 py-4">
                                    <code className="text-xs bg-slate-100 text-slate-600 p-1 rounded-md font-mono">{employee.id}</code>
                                </td>
                            )}
                            <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>{isOnline ? 'Online' : 'Offline'}</span></td>
                            <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1">
                                    {employee.activities.map(act => {
                                        const isActivityActive = isOnline && statusInfo?.activity === act;
                                        return (
                                            <span 
                                                key={act} 
                                                className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                                                    isActivityActive 
                                                        ? 'bg-emerald-500 text-white font-semibold ring-2 ring-emerald-300' 
                                                        : 'bg-slate-200 text-slate-700'
                                                }`}
                                            >
                                                {act}
                                            </span>
                                        );
                                    })}
                                </div>
                            </td>
                            <td className="px-6 py-4">{employee.registrationDate}</td>
                            <td className="px-6 py-4">
                                <div className="flex space-x-3">
                                    {!isViewer && <button onClick={() => handleOpenEditModal(employee)}><EditIcon /></button>}
                                    <button onClick={() => handleOpenHistoryModal(employee)}><HistoryIcon /></button>
                                    {!isViewer && <button onClick={() => handleOpenDeleteConfirm(employee)}><TrashIcon /></button>}
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </Table>
            <Modal isOpen={isAddModalOpen} onClose={handleCloseAddModal} title={`Adicionar Funcionário`}>
                <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                        <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border">{newEmployee.photo ? <img src={newEmployee.photo} alt="Preview" className="w-full h-full object-cover" /> : <PhotoPlaceholderIcon />}</div>
                        <button type="button" onClick={handleOpenCamera} className="bg-slate-200 font-bold py-2 px-4 rounded-lg">Capturar Foto</button>
                    </div>
                    <input type="text" name="name" value={newEmployee.name} onChange={handleInputChange} placeholder="Nome Completo" className="w-full px-3 py-2 border rounded-lg" />
                    {renderActivitySelector(false)}
                    {renderOperationsSelector(false)}
                    {formError && <p className="text-sm text-red-600">{formError}</p>}
                    <div className="flex justify-end pt-4"><button onClick={handleCloseAddModal} className="mr-2 bg-slate-200 py-2 px-4 rounded-lg">Cancelar</button><button onClick={handleAddEmployee} className="bg-blue-600 text-white py-2 px-4 rounded-lg">Salvar</button></div>
                </div>
            </Modal>
            {editingEmployee && <Modal isOpen={isEditModalOpen} onClose={handleCloseEditModal} title={`Editar Funcionário`}><div className="space-y-4">
                <div className="flex items-center space-x-4">
                    <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border">{editingEmployee.photo ? <img src={editingEmployee.photo} alt="Preview" className="w-full h-full object-cover" /> : <PhotoPlaceholderIcon />}</div>
                    <button type="button" onClick={handleOpenCamera} className="bg-slate-200 font-bold py-2 px-4 rounded-lg">Alterar Foto</button>
                </div>
                <input type="text" name="name" value={editingEmployee.name} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                {renderActivitySelector(true)}
                {renderOperationsSelector(true)}
                <div className="flex justify-end pt-4"><button onClick={handleCloseEditModal} className="mr-2 bg-slate-200 py-2 px-4 rounded-lg">Cancelar</button><button onClick={handleUpdateEmployee} className="bg-blue-600 text-white py-2 px-4 rounded-lg">Salvar</button></div></div></Modal>}
            <Modal isOpen={isCameraModalOpen} onClose={handleCloseCamera} title="Capturar Foto"><video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded-lg" /><canvas ref={canvasRef} className="hidden" /><div className="flex justify-center mt-4"><button onClick={handleCapturePhoto} className="bg-blue-600 text-white py-2 px-6 rounded-lg">Tirar Foto</button></div></Modal>
            {selectedEmployee && <Modal isOpen={isHistoryModalOpen} onClose={handleCloseHistoryModal} title={`Histórico de ${selectedEmployee.name}`}><div className="space-y-6"><Card title="Registros de Ponto">{employeeHistory.logs.length>0?<Table headers={["Tipo", "Atividade", "Data/Hora"]}>{employeeHistory.logs.map(l=><tr key={l.id}><td className="px-6 py-3">{l.type}</td><td className="px-6 py-3">{l.activity}</td><td className="px-6 py-3">{l.timestamp}</td></tr>)}</Table>:<p>Nenhum registro.</p>}</Card><Card title="Atividades Executadas">{employeeHistory.tasks.length > 0?<Table headers={["Atividade", "Qtd", "Horas", "Data"]}>{employeeHistory.tasks.map(t=><tr key={t.id}><td className="px-6 py-3">{t.activity}</td><td className="px-6 py-3">{t.quantity}</td><td className="px-6 py-3">{t.executionHours.toFixed(2)}</td><td className="px-6 py-3">{t.executionDate}</td></tr>)}</Table>:<p>Nenhuma atividade.</p>}</Card></div></Modal>}
            {employeeToDelete && <Modal isOpen={isDeleteConfirmOpen} onClose={handleCloseDeleteConfirm} title="Confirmar Exclusão"><div className="text-center"><p>Deseja excluir <strong>{employeeToDelete.name}</strong>? Esta ação é irreversível.</p><div className="flex justify-center mt-6 space-x-4"><button onClick={handleCloseDeleteConfirm} className="bg-slate-200 py-2 px-6 rounded-lg">Cancelar</button><button onClick={handleConfirmDelete} className="bg-rose-600 text-white py-2 px-6 rounded-lg">Excluir</button></div></div></Modal>}
        </div>
    );
};

export default Employees;
