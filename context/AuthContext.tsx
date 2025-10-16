import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { User, Operation } from '../types';
import { getUsers, getOperations, saveOperations, saveUsers, addUser as apiAddUser, updateUser as apiUpdateUser, deleteUser as apiDeleteUser } from '../services/api';
import { Role } from '../enums';

interface AuthContextType {
  user: User | null;
  allUsers: User[];
  operations: Operation[]; // User-accessible operations
  allOperations: Operation[]; // All operations in the system
  currentOperation: Operation | null;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
  switchOperation: (operationId: string) => void;
  // Operation Management
  addOperation: (operationData: Omit<Operation, 'id'>) => Promise<void>;
  updateOperation: (operation: Operation) => Promise<void>;
  deleteOperation: (operationId: string) => Promise<void>;
  // User Management
  addUser: (userData: Omit<User, 'id'>) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allOperations, setAllOperations] = useState<Operation[]>([]);
  const [currentOperationId, setCurrentOperationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      const ops = await getOperations();
      setAllOperations(ops);
      const users = await getUsers();
      setAllUsers(users);

      try {
        const storedUser = sessionStorage.getItem('laborsync_user');
        if (storedUser) {
          const parsedUser: User = JSON.parse(storedUser);
          setUser(parsedUser);
          
          const storedOpId = sessionStorage.getItem('laborsync_current_op');
          
          // Re-validate accessible operations
          const accessibleOps = ops.filter(op => 
              parsedUser.role === Role.ADMIN || op.managerId === parsedUser.id
          );
          
          if (storedOpId && accessibleOps.some(op => op.id === storedOpId)) {
            setCurrentOperationId(storedOpId);
          } else if (accessibleOps.length > 0) {
            setCurrentOperationId(accessibleOps[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to parse stored user data", error);
        sessionStorage.removeItem('laborsync_user');
        sessionStorage.removeItem('laborsync_current_op');
      }
      setIsLoading(false);
    };
    initialize();
  }, []);

  const login = async (username: string, pass: string): Promise<boolean> => {
    /*
     * =============================================================================
     * PRODUCTION SECURITY NOTE
     * =============================================================================
     * The current login mechanism is for demonstration only. It compares plaintext
     * passwords stored in localStorage, which is highly insecure.
     *
     * In a real online application, this function would make an API call to a
     * backend endpoint (e.g., POST to `https://api.laborsync.com/v1/auth/login`).
     * The backend would verify credentials against a hashed password in the database
     * and return a secure token (like a JWT) upon success. This token would be
     * stored and sent with subsequent API requests to authenticate the user.
     * =============================================================================
     */
    const users = await getUsers();
    const foundUser = users.find(u => u.username === username && u.password === pass);

    if (foundUser) {
      const userToStore = { ...foundUser };
      delete userToStore.password; // Do not store password

      setUser(userToStore);
      sessionStorage.setItem('laborsync_user', JSON.stringify(userToStore));
      
      const accessibleOps = (userToStore.role === Role.ADMIN) 
          ? allOperations
          : allOperations.filter(op => op.managerId === userToStore.id);

      if (accessibleOps.length > 0) {
        const opId = accessibleOps[0].id;
        setCurrentOperationId(opId);
        sessionStorage.setItem('laborsync_current_op', opId);
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setCurrentOperationId(null);
    sessionStorage.removeItem('laborsync_user');
    sessionStorage.removeItem('laborsync_current_op');
    window.location.hash = 'dashboard'; // Reset to default page on logout
  };

  const switchOperation = (operationId: string) => {
     const canSwitch = user?.role === Role.ADMIN || allOperations.find(op => op.id === operationId)?.managerId === user?.id;
    if (canSwitch) {
      setCurrentOperationId(operationId);
      sessionStorage.setItem('laborsync_current_op', operationId);
    }
  };

  // --- User Management ---
  const addUser = async (userData: Omit<User, 'id'>) => {
    let userWithManagerContext = { ...userData };
    
    // If the current user is a manager, they can only create Viewers,
    // and those viewers are assigned to them.
    if (user?.role === Role.MANAGER) {
      userWithManagerContext.role = Role.VIEWER;
      userWithManagerContext.managerId = user.id;
    }

    await apiAddUser(userWithManagerContext);
    const updatedUsers = await getUsers();
    setAllUsers(updatedUsers);
  };

  const updateUser = async (userToUpdate: User) => {
     // Security check: A manager can only edit their own profile or viewers they manage.
    if (user?.role === Role.MANAGER && userToUpdate.id !== user.id && userToUpdate.managerId !== user.id) {
        console.error("Permission denied: Manager cannot update this user.");
        return;
    }
    await apiUpdateUser(userToUpdate);
    const updatedUsers = await getUsers();
    setAllUsers(updatedUsers);

    // If the manager is updating their own info, update the user state as well
    if (user?.id === userToUpdate.id) {
        const updatedSelf = { ...userToUpdate };
        delete updatedSelf.password;
        setUser(updatedSelf);
        sessionStorage.setItem('laborsync_user', JSON.stringify(updatedSelf));
    }
  };

  const deleteUser = async (userId: string) => {
    const userToDelete = allUsers.find(u => u.id === userId);
    // Security check: A manager can only delete viewers they manage.
    if (user?.role === Role.MANAGER && userToDelete?.managerId !== user.id) {
        console.error("Permission denied: Manager cannot delete this user.");
        return;
    }
    await apiDeleteUser(userId);
    const updatedUsers = await getUsers();
    setAllUsers(updatedUsers);
  };


  // --- Operation Management ---
  const addOperation = async (operationData: Omit<Operation, 'id'>) => {
    const manager = allUsers.find(u => u.id === operationData.managerId);

    const newOperation: Operation = { 
        ...operationData, 
        id: `op${Date.now()}`,
        manager: manager ? manager.username : 'N/A', // Set display name
    };
    const updatedOps = [...allOperations, newOperation];
    setAllOperations(updatedOps);
    await saveOperations(updatedOps);

    if (!currentOperationId) {
        setCurrentOperationId(newOperation.id);
        sessionStorage.setItem('laborsync_current_op', newOperation.id);
    }
  };

  const updateOperation = async (operation: Operation) => {
      const manager = allUsers.find(u => u.id === operation.managerId);
      const operationToUpdate = {
        ...operation,
        manager: manager ? manager.username : 'N/A',
      };
      const updatedOps = allOperations.map(op => op.id === operation.id ? operationToUpdate : op);
      setAllOperations(updatedOps);
      await saveOperations(updatedOps);
  };

  const deleteOperation = async (operationId: string) => {
      const updatedOps = allOperations.filter(op => op.id !== operationId);
      setAllOperations(updatedOps);
      await saveOperations(updatedOps);

      if (currentOperationId === operationId) {
          const remainingUserOps = updatedOps.filter(op => user?.role === Role.ADMIN || op.managerId === user?.id);
          const newCurrentId = remainingUserOps.length > 0 ? remainingUserOps[0].id : null;
          setCurrentOperationId(newCurrentId);
          if (newCurrentId) {
              sessionStorage.setItem('laborsync_current_op', newCurrentId);
          } else {
              sessionStorage.removeItem('laborsync_current_op');
          }
      }
  };

  const userOperations = useMemo(() => {
    if (!user) return [];
    if (user.role === Role.ADMIN) return allOperations;
    return allOperations.filter(op => op.managerId === user.id);
  }, [allOperations, user]);

  const currentOperation = useMemo(() => {
    return allOperations.find(op => op.id === currentOperationId) || null;
  }, [allOperations, currentOperationId]);

  const value = {
    user,
    allUsers,
    operations: userOperations,
    allOperations,
    currentOperation,
    login,
    logout,
    switchOperation,
    addOperation,
    updateOperation,
    deleteOperation,
    addUser,
    updateUser,
    deleteUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};