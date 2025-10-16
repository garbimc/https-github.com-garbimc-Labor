import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import Table from '../components/Table';
import Modal from '../components/Modal';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { Role } from '../enums';
import { EditIcon } from '../components/icons/EditIcon';
import { TrashIcon } from '../components/icons/TrashIcon';

const Users: React.FC = () => {
    const { user, allUsers, allOperations, operations, addUser, updateUser, deleteUser } = useAuth();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    
    const initialFormState: Omit<User, 'id'> = {
        username: '',
        password: '',
        role: Role.VIEWER,
        accessibleOperationIds: [],
    };
    const [userForm, setUserForm] = useState(initialFormState);
    const [passwordConfirm, setPasswordConfirm] = useState('');

    const isAdmin = user?.role === Role.ADMIN;

    const displayedUsers = useMemo(() => {
        if (isAdmin) {
            return allUsers;
        }
        if (user?.role === Role.MANAGER) {
            return allUsers.filter(u => u.id === user.id || u.managerId === user.id);
        }
        return [];
    }, [allUsers, user, isAdmin]);

    const handleOpenModal = (user: User | null = null) => {
        setEditingUser(user);
        if (user) {
            setUserForm({ ...user, password: '' });
            setPasswordConfirm('');
        } else {
            setUserForm(isAdmin ? { ...initialFormState, role: Role.MANAGER } : initialFormState);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setUserForm(initialFormState);
        setPasswordConfirm('');
    };
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setUserForm(prev => ({ ...prev, [name]: value }));
    };
    
    const handleOperationToggle = (operationId: string) => {
        setUserForm(prev => {
            const newIds = prev.accessibleOperationIds.includes(operationId)
                ? prev.accessibleOperationIds.filter(id => id !== operationId)
                : [...prev.accessibleOperationIds, operationId];
            return { ...prev, accessibleOperationIds: newIds };
        });
    };

    const handleSubmit = async () => {
        if (!userForm.username.trim()) return alert("O nome de usuário é obrigatório.");
        if (!editingUser && !userForm.password) return alert("A senha é obrigatória para novos usuários.");
        if (userForm.password && userForm.password !== passwordConfirm) return alert("As senhas não coincidem.");
        
        let finalForm = { ...userForm };
        
        if (isAdmin) {
            if (finalForm.role === Role.ADMIN) {
                finalForm.accessibleOperationIds = allOperations.map(op => op.id);
            } else if (finalForm.role === Role.MANAGER) {
                finalForm.accessibleOperationIds = [];
            }
        }
        
        if (editingUser) {
            const userToUpdate: User = { ...editingUser, ...finalForm };
            if (!finalForm.password) {
                delete userToUpdate.password;
            }
            await updateUser(userToUpdate);
        } else {
            await addUser(finalForm);
        }
        handleCloseModal();
    };

    const handleOpenDeleteConfirm = (user: User) => {
        setUserToDelete(user);
        setIsDeleteConfirmOpen(true);
    };

    const handleCloseDeleteConfirm = () => {
        setUserToDelete(null);
        setIsDeleteConfirmOpen(false);
    };

    const handleConfirmDelete = async () => {
        if (userToDelete) {
            await deleteUser(userToDelete.id);
            handleCloseDeleteConfirm();
        }
    };
    
    const userOperationsMap = useMemo(() => {
        return allUsers.reduce((acc, user) => {
            if (user.role === Role.ADMIN) {
                 acc[user.id] = 'Todas';
            } else if (user.role === Role.MANAGER) {
                const managedOps = allOperations
                    .filter(op => op.managerId === user.id)
                    .map(op => op.name)
                    .join(', ');
                acc[user.id] = managedOps || 'Nenhuma';
            } else { // Viewer
                 const accessibleOps = user.accessibleOperationIds
                    .map(id => allOperations.find(op => op.id === id)?.name)
                    .filter(Boolean)
                    .join(', ');
                acc[user.id] = accessibleOps || 'Nenhuma';
            }
            return acc;
        }, {} as Record<string, string>);
    }, [allUsers, allOperations]);

    const tableHeaders = ["Usuário", "Perfil", "Operações Acessíveis", "Ações"];

    return (
        <div>
            <Header title="Usuários e Permissões">
                <button onClick={() => handleOpenModal()} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">
                    Adicionar Usuário
                </button>
            </Header>
            <Card>
                <Table headers={tableHeaders}>
                    {displayedUsers.map(u => (
                        <tr key={u.id}>
                            <td className="px-6 py-4 font-medium">{u.username}</td>
                            <td className="px-6 py-4">{u.role}</td>
                            <td className="px-6 py-4 text-sm text-slate-500">{userOperationsMap[u.id]}</td>
                            <td className="px-6 py-4">
                                <div className="flex space-x-3">
                                     {(isAdmin || user?.id === u.id || u.managerId === user?.id) && (
                                        <button onClick={() => handleOpenModal(u)}><EditIcon /></button>
                                    )}
                                    {u.role !== Role.ADMIN && (isAdmin || u.managerId === user?.id) && (
                                        <button onClick={() => handleOpenDeleteConfirm(u)}><TrashIcon /></button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </Table>
            </Card>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingUser ? 'Editar Usuário' : 'Adicionar Usuário'}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Nome de Usuário</label>
                        <input type="text" name="username" value={userForm.username} onChange={handleFormChange} className="mt-1 block w-full p-2 border border-slate-300 rounded-md" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Senha</label>
                        <input type="password" name="password" placeholder={editingUser ? 'Deixe em branco para manter a atual' : ''} value={userForm.password} onChange={handleFormChange} className="mt-1 block w-full p-2 border border-slate-300 rounded-md" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700">Confirmar Senha</label>
                        <input type="password" name="passwordConfirm" placeholder={editingUser ? 'Deixe em branco para manter a atual' : ''} value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} className="mt-1 block w-full p-2 border border-slate-300 rounded-md" />
                    </div>
                    
                    {isAdmin ? (
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Perfil de Acesso</label>
                            <select name="role" value={userForm.role} onChange={handleFormChange} className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-white">
                                {Object.values(Role).map(role => <option key={role} value={role}>{role}</option>)}
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Perfil de Acesso</label>
                            <input type="text" value={Role.VIEWER} disabled className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-slate-100" />
                        </div>
                    )}

                    {userForm.role === Role.VIEWER && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mt-4">Operações Acessíveis</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border rounded-lg max-h-32 overflow-y-auto bg-slate-50 mt-1">
                                {(isAdmin ? allOperations : operations).map(op => (
                                    <div key={op.id} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id={`op-${op.id}-${editingUser?.id || 'new'}`}
                                            checked={userForm.accessibleOperationIds.includes(op.id)}
                                            onChange={() => handleOperationToggle(op.id)}
                                            className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                        />
                                        <label htmlFor={`op-${op.id}-${editingUser?.id || 'new'}`} className="ml-2 text-sm text-slate-800 cursor-pointer">
                                            {op.name}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div className="flex justify-end pt-4 space-x-2">
                        <button onClick={handleCloseModal} className="bg-slate-200 py-2 px-4 rounded-lg">Cancelar</button>
                        <button onClick={handleSubmit} className="bg-blue-600 text-white py-2 px-4 rounded-lg">Salvar</button>
                    </div>
                </div>
            </Modal>
            
            {userToDelete && (
                <Modal isOpen={isDeleteConfirmOpen} onClose={handleCloseDeleteConfirm} title="Confirmar Exclusão">
                    <div className="text-center">
                        <p>Deseja realmente excluir o usuário <strong>{userToDelete.username}</strong>? Esta ação é irreversível.</p>
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

export default Users;