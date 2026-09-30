import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

// Chaves utilizadas para armazenamento seguro do token e informacoes basicas do usuario
const TOKEN_KEY = 'certievents_access_token';
const USER_KEY = 'certievents_user_data';

// Cria o contexto de autenticacao global da aplicacao
const AuthContext = createContext(null);

// Provedor que encapsula os estados e metodos de sessao do usuario
export function AuthProvider({ children }) {
  // Estado que armazena os dados do usuario logado ou nulo quando deslogado
  const [user, setUser] = useState(null);
  // Estado que indica se a checagem inicial de token persistido foi concluida
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Ao iniciar a aplicacao, verifica se ja existe um token e dados salvos no SecureStore
  useEffect(() => {
    async function loadStorageData() {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedUser = await SecureStore.getItemAsync(USER_KEY);
        if (token && storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.warn('Falha ao carregar credenciais salvas:', error);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadStorageData();
  }, []);

  // Armazena os dados do usuario e persiste o token com seguranca
  const signIn = async (userData, accessToken) => {
    setUser(userData);
    try {
      if (accessToken) {
        await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
      }
      if (userData) {
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
      }
    } catch (error) {
      console.warn('Falha ao persistir token seguro:', error);
    }
  };

  // Limpa os dados do usuario e remove o token do SecureStore
  const signOut = async () => {
    setUser(null);
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (error) {
      console.warn('Falha ao remover token seguro:', error);
    }
  };

  // Metodo auxiliar para checar se existe um token valido armazenado
  const hasStoredToken = async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      return !!token;
    } catch {
      return false;
    }
  };

  // Variavel booleana que indica se existe uma sessao ativa
  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loadingInitial,
        signIn,
        signOut,
        hasStoredToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para acesso aos metodos e estados de autenticacao
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      user: null,
      isAuthenticated: false,
      loadingInitial: false,
      signIn: async () => {},
      signOut: async () => {},
      hasStoredToken: async () => false,
    };
  }
  return ctx;
}

