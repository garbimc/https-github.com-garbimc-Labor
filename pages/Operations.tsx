import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { Operation } from '../types';
import { Role } from '../enums';
import { EditIcon } from '../components/icons/EditIcon';
import { TrashIcon } from '../components/icons/TrashIcon';

const Operations: React.FC = () => {
    const { user, allOperations, allUsers, addOperation, updateOperation, deleteOperation } = useAuth();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    
    const [editingOperation, setEditingOperation] = useState<Operation | null>(null);
    const [operationToDelete, setOperationToDelete] = useState<Operation | null>(null);
    
    const initialFormState: Omit<Operation, 'id' | 'manager'> = {
        name: '',
        location: '',
        managerId: '',
        totalHeadcount: 0,
        employeesOnVacation: 0
    };
    const [operationForm, setOperationForm] = useState(initialFormState);

    const managers = useMemo(() => allUsers.filter(u => u.role === Role.MANAGER || u.role === Role.ADMIN), [allUsers]);

    const handleOpenModal = (operation: Operation | null = null) => {
        setEditingOperation(operation);
        setOperationForm(operation ? { ...operation } : initialFormState);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingOperation(null);
        setOperationForm(initialFormState);
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumeric = ['totalHeadcount', 'employeesOnVacation'].includes(name);
        setOperationForm(prev => ({ ...prev, [name]: isNumeric ? Number(value) : value }));
    };

    const handleSubmit = async () => {
        if (!operationForm.name.trim() || !operationForm.location.trim() || !operationForm.managerId) {
            return alert("Todos os campos são obrigatórios.");
        }
        
        if (editingOperation) {
            await updateOperation({ ...editingOperation, ...operationForm });
        } else {
            await addOperation(operationForm);
        }
        handleCloseModal();
    };

    const handleOpenDeleteConfirm = (operation: Operation) => {
        setOperationToDelete(operation);
        setIsDeleteConfirmOpen(true);
    };

    const handleCloseDeleteConfirm = () => {
        setOperationToDelete(null);
        setIsDeleteConfirmOpen(false);
    };

    const handleConfirmDelete = async () => {
        if (operationToDelete) {
            await deleteOperation(operationToDelete.id);
            handleCloseDeleteConfirm();
        }
    };

    if (user?.role !== Role.ADMIN) {
        return (
            <div className="text-center p-10">
                <h2 className="text-2xl font-bold text-slate-700">Acesso Restrito</h2>
                <p className="text-slate-500">Você não tem permissão para gerenciar operações.</p>
            </div>
        );
    }
    
    const tableHeaders = ["Nome da Operação", "Localização", "Gerente Responsável", "Headcount Total", "Ações"];

    return (
        <div>
            <Header title="Gerenciamento de Operações">
                <button onClick={() => handleOpenModal()} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">
                    Adicionar Operação
                </button>
            </Header>
            <Card>
                <Table headers={tableHeaders}>
                    {allOperations.map(op => (
                        <tr key={op.id}>
                            <td className="px-6 py-4 font-medium">{op.name}</td>
                            <td className="px-6 py-4">{op.location}</td>
                            <td className="px-6 py-4">{op.manager || 'N/A'}</td>
                            <td className="px-6 py-4">{op.totalHeadcount}</td>
                            <td className="px-6 py-4">
                                <div className="flex space-x-3">
                                    <button onClick={() => handleOpenModal(op)}><EditIcon /></button>
                                    <button onClick={() => handleOpenDeleteConfirm(op)}><TrashIcon /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </Table>
            </Card>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingOperation ? 'Editar Operação' : 'Adicionar Operação'}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Nome da Operação</label>
                        <input type="text" name="name" value={operationForm.name} onChange={handleFormChange} className="mt-1 block w-full p-2 border border-slate-300 rounded-md" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700">Localização</label>
                        <input type="text" name="location" value={operationForm.location} onChange={handleFormChange} className="mt-1 block w-full p-2 border border-slate-300 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Gerente Responsável</label>
                        <select name="managerId" value={operationForm.managerId} onChange={handleFormChange} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white">
                            <option value="">Selecione um gerente</option>
                            {managers.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Headcount Total</label>
                            <input type="number" name="totalHeadcount" value={operationForm.totalHeadcount} onChange={handleFormChange} className="mt-1 block w-full p-2 border border-slate-300 rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Funcionários em Férias</label>
                            <input type="number" name="employeesOnVacation" value={operationForm.employeesOnVacation} onChange={handleFormChange} className="mt-1 block w-full p-2 border border-slate-300 rounded-md" />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4 space-x-2">
                        <button onClick={handleCloseModal} className="bg-slate-200 py-2 px-4 rounded-lg">Cancelar</button>
                        <button onClick={handleSubmit} className="bg-blue-600 text-white py-2 px-4 rounded-lg">Salvar</button>
                    </div>
                </div>
            </Modal>
            
            {operationToDelete && (
                <Modal isOpen={isDeleteConfirmOpen} onClose={handleCloseDeleteConfirm} title="Confirmar Exclusão">
                    <div className="text-center">
                        <p>Deseja realmente excluir a operação <strong>{operationToDelete.name}</strong>? Esta ação é irreversível.</p>
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

export default Operations;
