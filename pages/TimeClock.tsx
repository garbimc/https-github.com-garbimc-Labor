import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { TimeLog, Employee } from '../types';
import { getTimeLogs, saveTimeLogs, getEmployees } from '../services/api';
import { identifyEmployeeByFace } from '../services/geminiService';
import { useAuth } from '../context/AuthContext';
import { Role, ActivityType } from '../enums';

type IdentificationStatus = 'idle' | 'searching' | 'identifying' | 'identified' | 'error' | 'no_match' | 'disabled';
type ClockStatus = 'Check-in' | 'Check-out';
type DateFilter = 'all' | 'day' | 'week' | 'month';

const CameraOffIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.55a1 1 0 01.55.89V14a1 1 0 01-1.55.89L15 12.5M15 10l-3 3m0 0l-3-3m3 3V3a1 1 0 00-1-1H4a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1v-4.5" />
    </svg>
);

const StatusIndicator: React.FC<{ status: IdentificationStatus }> = ({ status }) => {
    const messages: Record<IdentificationStatus, { text: string; color: string; spinner?: boolean }> = {
        idle: { text: 'Câmera Desligada', color: 'text-slate-400' },
        searching: { text: 'Procurando rosto...', color: 'text-white' },
        identifying: { text: 'Analisando rosto...', color: 'text-amber-300', spinner: true },
        identified: { text: 'Funcionário Identificado!', color: 'text-emerald-300' },
        no_match: { text: 'Ninguém reconhecido. Tente novamente.', color: 'text-orange-300' },
        error: { text: 'Erro na Câmera', color: 'text-red-400' },
        disabled: { text: 'Funcionalidade desabilitada para visualização.', color: 'text-slate-300'}
    };

    if (status === 'identified' || status === 'idle') return null;

    const current = messages[status];
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 rounded-lg pointer-events-none">
            <div className="flex flex-col items-center space-y-4 p-4 text-center">
                {current.spinner && <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-300"></div>}
                <p className={`font-semibold text-2xl ${current.color}`}>{current.text}</p>
            </div>
        </div>
    );
};


const TimeClock: React.FC = () => {
    const { user, currentOperation } = useAuth();
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [logs, setLogs] = useState<TimeLog[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [filters, setFilters] = useState({ employeeName: '', type: '' });
    const [dateFilter, setDateFilter] = useState<DateFilter>('day');
    const [confirmationLogData, setConfirmationLogData] = useState<TimeLog | null>(null);
    const [identificationStatus, setIdentificationStatus] = useState<IdentificationStatus>('idle');
    const [identifiedEmployee, setIdentifiedEmployee] = useState<Employee | null>(null);
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    const [clockType, setClockType] = useState<ClockStatus | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const identificationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isViewer = user?.role === Role.VIEWER;

    useEffect(() => {
        if (isViewer) {
            setIdentificationStatus('disabled');
        }
    }, [isViewer]);

    useEffect(() => {
        const fetchData = async () => {
            if (!currentOperation) return;
            const timeLogs = await getTimeLogs(currentOperation.id);
            setLogs(timeLogs);
            const employeeData = await getEmployees(currentOperation.id);
            setEmployees(employeeData);
        };
        fetchData();
    }, [currentOperation]);

    const employeeStatusMap = useMemo(() => {
        const statusMap = new Map<string, ClockStatus>();
        logs.forEach(log => {
            if (!statusMap.has(log.employeeId)) statusMap.set(log.employeeId, log.type);
        });
        return statusMap;
    }, [logs]);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const nameMatch = log.employeeName.toLowerCase().includes(filters.employeeName.toLowerCase());
            const typeMatch = filters.type ? log.type === filters.type : true;
            return nameMatch && typeMatch;
        });
    }, [logs, filters, dateFilter]);

    const captureFrame = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg', 0.8);
        }
        return null;
    }, []);

    const runIdentification = useCallback(async () => {
        if (identificationStatus === 'identifying' || employees.length === 0) return;
        setIdentificationStatus('identifying');
        const frame = captureFrame();
        if (!frame) { setIdentificationStatus('searching'); return; }

        const employeeId = await identifyEmployeeByFace(frame, employees);
        if (employeeId) {
            const foundEmployee = employees.find(e => e.id === employeeId);
            if (foundEmployee) {
                setIdentifiedEmployee(foundEmployee);
                setIdentificationStatus('identified');
                if (identificationIntervalRef.current) clearInterval(identificationIntervalRef.current);
            } else { setIdentificationStatus('no_match'); }
        } else {
            setIdentificationStatus('no_match');
            setTimeout(() => setIdentificationStatus('searching'), 2000);
        }
    }, [captureFrame, employees, identificationStatus]);

    const stopCamera = useCallback(() => {
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        if (identificationIntervalRef.current) clearInterval(identificationIntervalRef.current);
        setIsCameraOn(false);
        setIdentificationStatus('idle');
        setIdentifiedEmployee(null);
    }, []);
    
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setIsCameraOn(true);
                setIdentificationStatus('searching');
                identificationIntervalRef.current = setInterval(runIdentification, 1500);
            }
        } catch (error) { setIdentificationStatus('error'); }
    };
    
    useEffect(() => () => stopCamera(), [stopCamera]);
    
    const handleCheckInOrOut = async (employee: Employee, type: ClockStatus, activity: ActivityType) => {
        if (!currentOperation) return;
        const newLog: TimeLog = {
            id: `L${Date.now()}`, employeeId: employee.id, employeeName: employee.name,
            type, timestamp: new Date().toLocaleString('pt-BR'), activity,
        };
        const updatedLogs = [newLog, ...logs];
        setLogs(updatedLogs);
        await saveTimeLogs(currentOperation.id, updatedLogs);
        setConfirmationLogData(newLog);
        setIsActivityModalOpen(false);
        setClockType(null);
    };

    const handleOpenActivityModal = (type: ClockStatus) => {
        setClockType(type);
        setIsActivityModalOpen(true);
    };

    const handleCloseConfirmation = () => {
        setConfirmationLogData(null);
        if (isCameraOn) {
            setIdentifiedEmployee(null);
            setIdentificationStatus('searching');
            identificationIntervalRef.current = setInterval(runIdentification, 1500);
        }
    };
    
    if (!currentOperation) return <div className="text-center p-10">Selecione uma operação para usar o controle de ponto.</div>;

    return (
        <div>
            <Header title="Controle de Ponto" operationName={currentOperation.name} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <div className="relative w-full aspect-video bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden">
                        <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${!isCameraOn && 'hidden'}`}></video>
                        <canvas ref={canvasRef} className="hidden" />
                        <StatusIndicator status={identificationStatus} />
                        {(identificationStatus === 'idle' || identificationStatus === 'disabled') && <div className="text-center"><CameraOffIcon /><p className="mt-4 text-xl font-semibold text-slate-400">Câmera Desligada</p></div>}
                    </div>
                    <div className="mt-4">
                        {identifiedEmployee && !isViewer ? (
                            <div className="text-center">
                                <img src={identifiedEmployee.photo} alt={identifiedEmployee.name} className="w-24 h-24 rounded-full mx-auto mb-4"/>
                                <p className="text-2xl font-bold">{identifiedEmployee.name}</p>
                                <div className="flex w-full space-x-4 mt-4">
                                    <button onClick={() => handleOpenActivityModal('Check-in')} className="flex-1 bg-emerald-500 text-white font-bold py-3 rounded-lg">Check-in</button>
                                    <button onClick={() => handleOpenActivityModal('Check-out')} className="flex-1 bg-rose-500 text-white font-bold py-3 rounded-lg">Check-out</button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={isCameraOn ? stopCamera : startCamera} disabled={isViewer} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg disabled:bg-slate-400">
                                {isViewer ? 'Câmera Desabilitada' : (isCameraOn ? 'Desligar Câmera' : 'Ativar Câmera')}
                            </button>
                        )}
                    </div>
                </Card>
                <Card title="Registros Recentes">
                     <div className="space-y-2 mb-4">
                        <input type="text" name="employeeName" onChange={(e) => setFilters(f => ({...f, employeeName: e.target.value}))} placeholder="Filtrar por nome..." className="w-full p-2 border rounded" />
                     </div>
                     <div className="max-h-[500px] overflow-y-auto">
                        <ul className="space-y-2">
                            {filteredLogs.map(log => <li key={log.id} className="flex justify-between items-center p-2 border-b"><span>{log.employeeName}</span><span className={log.type === 'Check-in' ? 'text-emerald-500' : 'text-rose-500'}>{log.type}</span><span>{log.activity}</span><span>{log.timestamp}</span></li>)}
                        </ul>
                    </div>
                </Card>
            </div>
            {confirmationLogData && <Modal isOpen={!!confirmationLogData} onClose={handleCloseConfirmation} title="Ponto Registrado!"><div className="text-center"><p className="text-xl font-bold">{confirmationLogData.employeeName}</p><p>{confirmationLogData.type} para <strong>{confirmationLogData.activity}</strong> às {confirmationLogData.timestamp.split(', ')[1]}</p><button onClick={handleCloseConfirmation} className="mt-4 bg-blue-600 text-white py-2 px-6 rounded-lg">OK</button></div></Modal>}
            {identifiedEmployee && clockType && (
                <Modal isOpen={isActivityModalOpen} onClose={() => setIsActivityModalOpen(false)} title={`Selecione a Atividade para ${clockType}`}>
                    <div className="grid grid-cols-2 gap-4">
                        {identifiedEmployee.activities.map(activity => (
                            <button
                                key={activity}
                                onClick={() => handleCheckInOrOut(identifiedEmployee, clockType, activity)}
                                className="p-4 bg-slate-100 hover:bg-blue-100 text-slate-800 font-semibold rounded-lg text-center"
                            >
                                {activity}
                            </button>
                        ))}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default TimeClock;