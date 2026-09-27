import React, { createContext, useContext, useState } from 'react';

// Cria o contexto de autenticacao global da aplicacao
const AuthContext = createContext(null);

// Provedor que encapsula os estados e metodos de sessao do usuario
export function AuthProvider({ children }) {
  // Estado que armazena os dados do usuario logado ou nulo quando deslogado
  const [user, setUser] = useState(null);

  // Armazena os dados do usuario autenticado na sessao
  const signIn = (userData) => {
    setUser(userData);
  };

  // Limpa os dados do usuario desconectando a sessao
  const signOut = () => {
    setUser(null);
  };

  // Variavel booleana que indica se existe uma sessao ativa
  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, signIn, signOut }}>
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
      signIn: () => {},
      signOut: () => {},
    };
  }
  return ctx;
}
