export enum ActivityType {
  RECEIVING = 'Receiving',
  PUTAWAY = 'Putaway',
  PICKING = 'Picking',
  PACKING = 'Packing',
  DISPATCH = 'Dispatch',
  REALLOCATE = 'Reallocate',
}

export enum DriverType {
  LINES = 'Lines',
  EACH = 'Each',
  VOLUME = 'Volume',
}

export enum ProcessType {
  SYSTEMIC = 'Sistêmico',
  MANUAL = 'Manual',
}

export enum Role {
    ADMIN = 'Admin',
    MANAGER = 'Manager',
    VIEWER = 'Viewer',
}