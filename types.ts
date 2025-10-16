import { ActivityType, DriverType, ProcessType, Role } from "./enums";

export interface User {
  id: string;
  username: string;
  password?: string; // Should not be present in client-side state after login
  role: Role;
  managerId?: string; // For Viewers managed by a Manager
  accessibleOperationIds: string[];
}

export interface Operation {
  id: string;
  name: string;
  location: string;
  latitude?: number;
  longitude?: number;
  managerId: string;
  manager?: string; // Display name
  totalHeadcount: number;
  employeesOnVacation: number;
}

export interface Employee {
  id: string;
  name: string;
  activities: ActivityType[];
  registrationDate: string;
  photo: string; // base64 data URL
  operationIds: string[];
}

export interface TimeLog {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'Check-in' | 'Check-out';
  timestamp: string; // e.g., "21/07/2024, 08:00:15"
  activity: ActivityType;
}

export interface TaskExecution {
    id: string;
    employeeId: string;
    employeeName?: string;
    activity: ActivityType;
    quantity: number;
    driver: DriverType;
    executionHours: number;
    executionDate: string; // "DD/MM/YYYY"
}

export interface EngineeringStandard {
    id: string;
    activity: ActivityType;
    processType: ProcessType;
    driver: DriverType;
    cycleTime: number; // in seconds
    hourlyProductivity: number;
    dailyDemand: number;
    workTime: number; // in hours
    breakTime: number; // in hours
    headcounts: number;
    executionDate: string; // "DD/MM/YYYY"
}

export interface DashboardData {
    activeEmployees: number;
    tasksProgress: number;
    totalTasksToday: number;
    plannedTasksToday: number;
    overallProductivity: number;
    demandVsExecutionByActivity: { name: ActivityType; planned: number; actual: number; driver: DriverType }[];
    employeeDistribution: { name: ActivityType; value: number }[];
    headcountVsDemand: { day: string; headcount: number; demand: number }[];
    operation: {
        totalHeadcount: number;
        employeesOnVacation: number;
        name: string;
    };
}

export interface EmployeeSchedule {
  employeeName: string;
  schedule: {
    Segunda: ActivityType | 'Folga';
    Terça: ActivityType | 'Folga';
    Quarta: ActivityType | 'Folga';
    Quinta: ActivityType | 'Folga';
    Sexta: ActivityType | 'Folga';
  };
}

export type ShiftPlan = EmployeeSchedule[];