import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { getApiKey, generateApiKey, deleteApiKey } from '../services/api';
import { CopyIcon } from '../components/icons/CopyIcon';
import { KeyIcon } from '../components/icons/KeyIcon';
import { CheckIcon } from '../components/icons/CheckIcon';
import { useAuth } from '../context/AuthContext';

const ApiConfig: React.FC = () => {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const { allOperations } = useAuth();

    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    useEffect(() => {
        const fetchKey = async () => {
            const key = await getApiKey();
            setApiKey(key);
        };
        fetchKey();
    }, []);

    const handleConfirmGenerate = async () => {
        const newKey = await generateApiKey();
        setNewlyGeneratedKey(newKey);
    };

    const handleCloseGenerateModal = () => {
        if (newlyGeneratedKey) {
            setApiKey(newlyGeneratedKey);
            setIsCopied(false);
        }
        setIsGenerateModalOpen(false);
        setNewlyGeneratedKey(null);
    };

    const handleConfirmDelete = async () => {
        await deleteApiKey();
        setApiKey(null);
        setIsCopied(false);
        setIsDeleteModalOpen(false);
    };

    const handleCopy = (keyToCopy: string) => {
        if (keyToCopy) {
            navigator.clipboard.writeText(keyToCopy);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    return (
        <div>
            <Header title="Configuração de API" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <div className="flex flex-col items-center text-center">
                        <KeyIcon className="w-16 h-16 text-blue-500 mb-4" />
                        <h2 className="text-xl font-bold text-slate-800">Sua Chave de API</h2>
                        <p className="text-slate-500 mt-2">Use esta chave para integrar sistemas externos e enviar dados de atividades para o LaborSync.</p>
                        
                        {apiKey ? (
                            <div className="mt-6 w-full max-w-md">
                                <div className="relative p-3 bg-slate-100 border border-slate-300 rounded-lg font-mono text-sm break-all">
                                    <span>{apiKey}</span>
                                    <button onClick={() => handleCopy(apiKey)} className="absolute top-1/2 right-2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-md">
                                        {isCopied ? <CheckIcon /> : <CopyIcon />}
                                    </button>
                                </div>
                                <div className="flex space-x-4 mt-6">
                                    <button onClick={() => setIsGenerateModalOpen(true)} className="flex-1 bg-amber-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-amber-600">
                                        Gerar Nova Chave
                                    </button>
                                    <button onClick={() => setIsDeleteModalOpen(true)} className="flex-1 bg-rose-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-rose-600">
                                        Excluir Chave
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-6">
                                <p className="text-slate-600 mb-4">Nenhuma chave de API ativa.</p>
                                <button onClick={() => setIsGenerateModalOpen(true)} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700">
                                    Gerar Chave de API
                                </button>
                            </div>
                        )}
                    </div>
                </Card>

                <Card title="Como Usar a API">
                    <div className="space-y-6 text-slate-600">
                        <p>Para integrar seus sistemas com o LaborSync, você pode enviar dados de execução de tarefas para o nosso endpoint de API.</p>
                        <div>
                            <h4 className="font-semibold text-slate-800">Endpoint</h4>
                            <code className="block bg-slate-100 p-2 rounded-md text-sm mt-1">POST /api/v1/operations/{'{operationId}'}/tasks</code>
                             <p className="text-xs mt-2 text-slate-500">
                                O <strong>{'{operationId}'}</strong> deve ser substituído pelo ID da operação para a qual você está enviando os dados.
                            </p>
                        </div>
                        
                        {allOperations.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-slate-800">IDs das Operações Disponíveis</h4>
                                <div className="mt-2 max-h-32 overflow-y-auto rounded-md border bg-slate-50 p-2">
                                    <ul className="divide-y divide-slate-200">
                                        {allOperations.map(op => (
                                            <li key={op.id} className="flex justify-between items-center p-2 text-sm">
                                                <span className="font-medium text-slate-700">{op.name}</span>
                                                <code className="text-xs text-slate-600 bg-slate-200 px-2 py-1 rounded">{op.id}</code>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        <div>
                            <h4 className="font-semibold text-slate-800">Autenticação</h4>
                            <p>Inclua sua chave de API no cabeçalho da requisição:</p>
                            <code className="block bg-slate-100 p-2 rounded-md text-sm mt-1">Authorization: Bearer {'<SUA_CHAVE_DE_API>'}</code>
                        </div>
                         <div>
                            <h4 className="font-semibold text-slate-800">Corpo da Requisição (JSON)</h4>
                            <pre className="block bg-slate-100 p-2 rounded-md text-xs overflow-x-auto mt-1">
{`[
  {
    "employeeId": "E1721598123456", 
    "activity": "Picking",
    "quantity": 150,
    "driver": "Lines",
    "executionHours": 2.5,
    "executionDate": "DD/MM/YYYY"
  }
]`}
                            </pre>
                            <p className="text-xs mt-2 text-slate-500">O endpoint aceita um array de objetos de tarefa para importação em lote.</p>
                        </div>
                    </div>
                </Card>
            </div>
            
            <Modal isOpen={isGenerateModalOpen} onClose={handleCloseGenerateModal} title={newlyGeneratedKey ? "Chave Gerada com Sucesso" : "Gerar Nova Chave de API"}>
                {newlyGeneratedKey ? (
                    <div className="text-center">
                        <p className="mb-4 text-slate-600">Copie sua nova chave. Por segurança, ela não será exibida novamente.</p>
                        <div className="relative p-3 bg-slate-100 border border-slate-300 rounded-lg font-mono text-sm break-all mb-6">
                            <span>{newlyGeneratedKey}</span>
                            <button onClick={() => handleCopy(newlyGeneratedKey)} className="absolute top-1/2 right-2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-md">
                                {isCopied ? <CheckIcon /> : <CopyIcon />}
                            </button>
                        </div>
                        <button onClick={handleCloseGenerateModal} className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">
                            Concluído
                        </button>
                    </div>
                ) : (
                    <div className="text-center">
                        <p className="mb-6 text-slate-600">
                            {apiKey ? "Gerar uma nova chave irá invalidar a chave atual. Deseja continuar?" : "Deseja gerar uma nova chave de API?"}
                        </p>
                        <div className="flex justify-center mt-6 space-x-4">
                            <button onClick={handleCloseGenerateModal} className="bg-slate-200 py-2 px-6 rounded-lg">Cancelar</button>
                            <button onClick={handleConfirmGenerate} className="bg-blue-600 text-white py-2 px-6 rounded-lg">Gerar Chave</button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Exclusão">
                <div className="text-center">
                    <p className="mb-6 text-slate-600">Tem certeza que deseja excluir a chave de API? Todas as integrações pararão de funcionar. Esta ação é irreversível.</p>
                    <div className="flex justify-center mt-6 space-x-4">
                        <button onClick={() => setIsDeleteModalOpen(false)} className="bg-slate-200 py-2 px-6 rounded-lg">Cancelar</button>
                        <button onClick={handleConfirmDelete} className="bg-rose-600 text-white py-2 px-6 rounded-lg">Excluir Chave</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ApiConfig;