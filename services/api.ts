import { User, Operation, Employee, TimeLog, TaskExecution, EngineeringStandard, DashboardData } from '../types';
import { ActivityType, Role, DriverType, ProcessType } from '../enums';

// =============================================================================
// PRODUCTION NOTE
// =============================================================================
// This is a mock API using browser localStorage for demonstration purposes.
// In a real application, these functions would make authenticated HTTP requests
// to a secure backend server (e.g., using fetch or axios).
// =============================================================================

const getLocalStorageItem = <T>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        if (item) {
            return JSON.parse(item);
        }
        // If no item, initialize with default and return it
        localStorage.setItem(key, JSON.stringify(defaultValue));
        return defaultValue;
    } catch (error) {
        console.error(`Error reading from localStorage key “${key}”:`, error);
        return defaultValue;
    }
};

const setLocalStorageItem = <T>(key: string, value: T): void => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error writing to localStorage key “${key}”:`, error);
    }
};

const initializeData = () => {
    if (!localStorage.getItem('laborsync_initialized')) {
        console.log("Initializing seed data in localStorage...");
        setLocalStorageItem('laborsync_users', [
            { id: 'U1', username: 'admin', password: 'admin', role: Role.ADMIN, accessibleOperationIds: ['op1', 'op2'] },
            { id: 'U2', username: 'manager', password: 'password', role: Role.MANAGER, accessibleOperationIds: [] },
            { id: 'U3', username: 'viewer', password: 'password', role: Role.VIEWER, managerId: 'U2', accessibleOperationIds: ['op1'] },
        ]);
        setLocalStorageItem('laborsync_operations', [
            { id: 'op1', name: 'CD São Paulo', location: 'São Paulo, SP', latitude: -23.5505, longitude: -46.6333, managerId: 'U2', totalHeadcount: 0, employeesOnVacation: 0 },
            { id: 'op2', name: 'CD Rio de Janeiro', location: 'Rio de Janeiro, RJ', latitude: -22.9068, longitude: -43.1729, managerId: 'U2', totalHeadcount: 0, employeesOnVacation: 0 },
        ]);
        setLocalStorageItem('laborsync_employees', []);
        setLocalStorageItem('laborsync_time_logs', []);
        setLocalStorageItem('laborsync_task_executions', []);
        setLocalStorageItem('laborsync_eng_standards', [
            // OP1 Standards
            { id: 'S1', activity: ActivityType.PICKING, processType: ProcessType.SYSTEMIC, driver: DriverType.LINES, cycleTime: 60, hourlyProductivity: 60, dailyDemand: 1000, workTime: 8, breakTime: 1, headcounts: 3, executionDate: new Date().toLocaleDateString('pt-BR') },
            { id: 'S2', activity: ActivityType.PACKING, processType: ProcessType.MANUAL, driver: DriverType.EACH, cycleTime: 30, hourlyProductivity: 120, dailyDemand: 1500, workTime: 8, breakTime: 1, headcounts: 2, executionDate: new Date().toLocaleDateString('pt-BR') },
            // OP2 Standards
            { id: 'S3', activity: ActivityType.RECEIVING, processType: ProcessType.SYSTEMIC, driver: DriverType.VOLUME, cycleTime: 120, hourlyProductivity: 30, dailyDemand: 400, workTime: 8, breakTime: 1, headcounts: 2, executionDate: new Date().toLocaleDateString('pt-BR') },
            { id: 'S4', activity: ActivityType.DISPATCH, processType: ProcessType.MANUAL, driver: DriverType.VOLUME, cycleTime: 180, hourlyProductivity: 20, dailyDemand: 300, workTime: 8, breakTime: 1, headcounts: 3, executionDate: new Date().toLocaleDateString('pt-BR') },
        ]);
        setLocalStorageItem('laborsync_api_key', 'ls_key_demokey123abc456def789ghi');
        localStorage.setItem('laborsync_initialized', 'true');
    }
};

initializeData();

// --- User Management ---
export const getUsers = async (): Promise<User[]> => {
    return getLocalStorageItem<User[]>('laborsync_users', []);
};

export const saveUsers = async (users: User[]): Promise<void> => {
    setLocalStorageItem('laborsync_users', users);
};

export const addUser = async (userData: Omit<User, 'id'>): Promise<User> => {
    const users = await getUsers();
    const newUser: User = { ...userData, id: `U${Date.now()}` };
    await saveUsers([...users, newUser]);
    return newUser;
};

export const updateUser = async (userToUpdate: User): Promise<User> => {
    const users = await getUsers();
    const userIndex = users.findIndex(u => u.id === userToUpdate.id);
    if (userIndex === -1) throw new Error("User not found");

    // Preserve original password if not provided
    const originalUser = users[userIndex];
    if (!userToUpdate.password) {
        userToUpdate.password = originalUser.password;
    }
    
    const updatedUsers = users.map(u => u.id === userToUpdate.id ? userToUpdate : u);
    await saveUsers(updatedUsers);
    return userToUpdate;
};

export const deleteUser = async (userId: string): Promise<void> => {
    const users = await getUsers();
    const updatedUsers = users.filter(u => u.id !== userId);
    await saveUsers(updatedUsers);
};

// --- Operation Management ---
export const getOperations = async (): Promise<Operation[]> => {
    const ops = getLocalStorageItem<Operation[]>('laborsync_operations', []);
    const users = await getUsers();
    // Add manager display name
    return ops.map(op => ({
        ...op,
        manager: users.find(u => u.id === op.managerId)?.username || 'N/A'
    }));
};

export const saveOperations = async (operations: Operation[]): Promise<void> => {
    // Remove temporary 'manager' display name before saving
    const opsToSave = operations.map(({ manager, ...rest }) => rest);
    setLocalStorageItem('laborsync_operations', opsToSave);
};

// --- Employee Management ---
export const getEmployees = async (operationId: string): Promise<Employee[]> => {
    const allEmployees = getLocalStorageItem<Employee[]>('laborsync_employees', []);
    return allEmployees.filter(e => e.operationIds.includes(operationId));
};

export const addEmployee = async (employee: Employee): Promise<void> => {
    const allEmployees = getLocalStorageItem<Employee[]>('laborsync_employees', []);
    setLocalStorageItem('laborsync_employees', [...allEmployees, employee]);
};

export const updateEmployee = async (employee: Employee): Promise<void> => {
    const allEmployees = getLocalStorageItem<Employee[]>('laborsync_employees', []);
    const updated = allEmployees.map(e => e.id === employee.id ? employee : e);
    setLocalStorageItem('laborsync_employees', updated);
};

export const deleteEmployee = async (employeeId: string): Promise<void> => {
    const allEmployees = getLocalStorageItem<Employee[]>('laborsync_employees', []);
    const updated = allEmployees.filter(e => e.id !== employeeId);
    setLocalStorageItem('laborsync_employees', updated);
};

// --- Time Logs ---
export const getTimeLogs = async (operationId: string): Promise<TimeLog[]> => {
    // In a real app, this would filter by operationId on the backend. Here we simulate.
    const allLogs = getLocalStorageItem<TimeLog[]>('laborsync_time_logs', []);
    const operationEmployees = await getEmployees(operationId);
    const operationEmployeeIds = new Set(operationEmployees.map(e => e.id));
    
    // Filter logs for employees within the current operation
    const filteredLogs = allLogs.filter(log => operationEmployeeIds.has(log.employeeId));

    return filteredLogs.sort((a, b) => {
        const dateA = new Date(a.timestamp.replace(/(\d{2})\/(\d{2})\/(\d{4}),/, '$2/$1/$3')).getTime();
        const dateB = new Date(b.timestamp.replace(/(\d{2})\/(\d{2})\/(\d{4}),/, '$2/$1/$3')).getTime();
        return dateB - dateA;
    });
};

export const saveTimeLogs = async (operationId: string, logs: TimeLog[]): Promise<void> => {
    const allLogs = getLocalStorageItem<TimeLog[]>('laborsync_time_logs', []);
    const operationEmployees = await getEmployees(operationId);
    const operationEmployeeIds = new Set(operationEmployees.map(e => e.id));

    // Get logs from other operations
    const otherLogs = allLogs.filter(log => !operationEmployeeIds.has(log.employeeId));

    // Combine updated logs for the current op with logs from other ops
    setLocalStorageItem('laborsync_time_logs', [...logs, ...otherLogs]);
};

// --- Task Executions ---
export const getTaskExecutions = async (operationId: string): Promise<TaskExecution[]> => {
    const allTasks = getLocalStorageItem<TaskExecution[]>('laborsync_task_executions', []);
    const operationEmployees = await getEmployees(operationId);
    const operationEmployeeIds = new Set(operationEmployees.map(e => e.id));

    const filteredTasks = allTasks.filter(task => operationEmployeeIds.has(task.employeeId));

    return filteredTasks.sort((a,b) => new Date(b.executionDate.split('/').reverse().join('-')).getTime() - new Date(a.executionDate.split('/').reverse().join('-')).getTime());
};

export const saveTaskExecutions = async (operationId: string, tasks: TaskExecution[]): Promise<void> => {
     const allTasks = getLocalStorageItem<TaskExecution[]>('laborsync_task_executions', []);
    const operationEmployees = await getEmployees(operationId);
    const operationEmployeeIds = new Set(operationEmployees.map(e => e.id));

    const otherTasks = allTasks.filter(task => !operationEmployeeIds.has(task.employeeId));

    setLocalStorageItem('laborsync_task_executions', [...tasks, ...otherTasks]);
};

// --- Engineering Standards ---
export const getEngineeringStandards = async (operationId: string): Promise<EngineeringStandard[]> => {
    const allStandards = getLocalStorageItem<EngineeringStandard[]>('laborsync_eng_standards', []);
    // In a real app, standards might be linked to operations. Here we assume they are global for simplicity.
    return allStandards;
};

export const saveEngineeringStandards = async (operationId: string, standards: EngineeringStandard[]): Promise<void> => {
    // Here we are overwriting all standards, assuming they are managed globally for now.
    setLocalStorageItem('laborsync_eng_standards', standards);
};

// --- API Key ---
export const getApiKey = async (): Promise<string | null> => {
    return getLocalStorageItem<string | null>('laborsync_api_key', null);
};

export const generateApiKey = async (): Promise<string> => {
    const newKey = `ls_key_${[...Array(32)].map(() => Math.random().toString(36)[2]).join('')}`;
    setLocalStorageItem('laborsync_api_key', newKey);
    return newKey;
};

export const deleteApiKey = async (): Promise<void> => {
    localStorage.removeItem('laborsync_api_key');
};

// --- Data Reset ---
export const resetData = (): void => {
    console.log("Resetting all app data in localStorage...");
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('laborsync_')) {
            localStorage.removeItem(key);
        }
    });
};

// --- Dashboard Data Generation ---
// This function simulates backend data aggregation for the dashboard
export const getDashboardData = async (operationId: string, startDate: Date, endDate: Date, activityFilter: ActivityType[]): Promise<DashboardData> => {
    const op = getLocalStorageItem<Operation[]>('laborsync_operations', []).find(o => o.id === operationId);
    if (!op) throw new Error("Operation not found");

    const logs = await getTimeLogs(operationId);
    const tasks = await getTaskExecutions(operationId);
    const standards = await getEngineeringStandards(operationId);
    const employees = await getEmployees(operationId);
    
    // Filter data by date range
    const filterByDate = <T extends { executionDate: string }>(item: T) => {
        const [day, month, year] = item.executionDate.split('/').map(Number);
        const itemDate = new Date(year, month - 1, day);
        return itemDate >= startDate && itemDate <= endDate;
    };
    const relevantTasks = tasks.filter(filterByDate);
    const relevantStandards = standards.filter(filterByDate);

    // Active Employees
    const activeEmployeeIds = new Set<string>();
    const statusMap = new Map<string, TimeLog>();
    logs.forEach(log => {
      if (!statusMap.has(log.employeeId)) {
        statusMap.set(log.employeeId, log);
      }
    });
    statusMap.forEach(log => {
        if(log.type === 'Check-in') activeEmployeeIds.add(log.employeeId)
    })


    // Employee Distribution
    const employeeDistributionMap = new Map<ActivityType, number>();
    employees.forEach(emp => {
        const log = logs.find(l => l.employeeId === emp.id);
        if (log?.type === 'Check-in') {
            const currentCount = employeeDistributionMap.get(log.activity) || 0;
            employeeDistributionMap.set(log.activity, currentCount + 1);
        }
    });

    const demandVsExecutionByActivity = Object.values(ActivityType).map(activity => {
        const relevantStandardsForActivity = relevantStandards.filter(s => s.activity === activity);
        const relevantTasksForActivity = relevantTasks.filter(t => t.activity === activity);
        
        const planned = relevantStandardsForActivity.reduce((sum, s) => sum + s.dailyDemand, 0);
        const actual = relevantTasksForActivity.reduce((sum, t) => sum + t.quantity, 0);
        const driver = relevantStandardsForActivity[0]?.driver || DriverType.LINES;
        return { name: activity, planned, actual, driver };
    });
    
    const plannedTasksToday = demandVsExecutionByActivity.reduce((sum, d) => sum + d.planned, 0);
    const totalTasksToday = demandVsExecutionByActivity.reduce((sum, d) => sum + d.actual, 0);
    
    const tasksProgress = plannedTasksToday > 0 ? (totalTasksToday / plannedTasksToday) * 100 : 0;
    
    // Overall Productivity
    const totalStandardHours = relevantTasks.reduce((sum, task) => {
        const standard = relevantStandards.find(s => s.activity === task.activity && s.hourlyProductivity > 0);
        return standard ? sum + (task.quantity / standard.hourlyProductivity) : sum;
    }, 0);
    const totalActualHours = relevantTasks.reduce((sum, task) => sum + task.executionHours, 0);
    const overallProductivity = totalActualHours > 0 ? (totalStandardHours / totalActualHours) * 100 : 0;

    // Headcount vs Demand (mock for last 7 days)
    const headcountVsDemand = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(endDate);
        d.setDate(d.getDate() - i);
        const day = d.toLocaleDateString('pt-BR', { weekday: 'short' });
        
        // Mock data, in a real app this would be historical
        const demand = relevantStandards.reduce((sum, s) => sum + s.headcounts, 0) * (1 - Math.random() * 0.2);
        const headcount = employees.length * (1 - Math.random() * 0.1);
        
        return { day, headcount: Math.round(headcount), demand: Math.round(demand) };
    }).reverse();

    return {
        activeEmployees: activeEmployeeIds.size,
        tasksProgress: isNaN(tasksProgress) ? 0 : tasksProgress,
        totalTasksToday,
        plannedTasksToday,
        overallProductivity: isNaN(overallProductivity) ? 100 : Math.round(overallProductivity),
        demandVsExecutionByActivity,
        employeeDistribution: Array.from(employeeDistributionMap.entries()).map(([name, value]) => ({ name, value })),
        headcountVsDemand,
        operation: {
            totalHeadcount: op.totalHeadcount,
            employeesOnVacation: op.employeesOnVacation,
            name: op.name,
        },
    };
};