import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService, LoginPayload, RegisterPayload } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  signup: (payload: RegisterPayload) => Promise<{ message: string; email: string }>;
  verifyEmail: (token: string) => Promise<User>;
  requestPasswordReset: (email: string) => Promise<string>;
  resetPassword: (token: string, newPassword: string) => Promise<string>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    setIsLoading(true);
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
    setIsLoading(false);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (payload: LoginPayload): Promise<User> => {
    const loggedInUser = await authService.login(payload);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const signup = async (payload: RegisterPayload) => {
    return await authService.signup(payload);
  };

  const verifyEmail = async (token: string): Promise<User> => {
    const verifiedUser = await authService.verifyEmail(token);
    setUser(verifiedUser);
    return verifiedUser;
  };

  const requestPasswordReset = async (email: string) => {
    return await authService.requestPasswordReset(email);
  };

  const resetPassword = async (token: string, newPassword: string) => {
    return await authService.resetPassword(token, newPassword);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        verifyEmail,
        requestPasswordReset,
        resetPassword,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
