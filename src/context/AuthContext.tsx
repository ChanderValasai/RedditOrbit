import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, LoginPayload, RegisterPayload } from '../types/auth';
import { authClient } from '../services/authClient';

interface LoginEvent {
  user: AuthUser;
  token: string;
  isNewRegistration: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  loginEvent: LoginEvent | null;
  clearLoginEvent: () => void;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(authClient.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [loginEvent, setLoginEvent] = useState<LoginEvent | null>(null);

  // Verify and fetch current user on initial mount
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const currentUser = await authClient.getCurrentUser();
        if (isMounted) {
          setUser(currentUser);
          setToken(authClient.getToken());
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (payload: LoginPayload): Promise<void> => {
    const data = await authClient.login(payload);
    setUser(data.user);
    setToken(data.token);
    setIsAuthModalOpen(false);
    setLoginEvent({
      user: data.user,
      token: data.token,
      isNewRegistration: false,
    });
  };

  const register = async (payload: RegisterPayload): Promise<void> => {
    const data = await authClient.register(payload);
    setUser(data.user);
    setToken(data.token);
    setIsAuthModalOpen(false);
    setLoginEvent({
      user: data.user,
      token: data.token,
      isNewRegistration: true,
    });
  };

  const logout = async (): Promise<void> => {
    await authClient.logout();
    setUser(null);
    setToken(null);
    setLoginEvent(null);
  };

  const clearLoginEvent = () => {
    setLoginEvent(null);
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        isAuthModalOpen,
        authModalMode,
        loginEvent,
        clearLoginEvent,
        login,
        register,
        logout,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
