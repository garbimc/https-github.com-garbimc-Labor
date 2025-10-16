import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Gear3DIcon } from '../components/icons/Gear3DIcon';
import { resetData } from '../services/api';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const [isResetting, setIsResetting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const success = await login(username, password);
    if (!success) {
      setError('Usuário ou senha inválidos.');
    }
    setIsLoading(false);
  };

  const handleReset = () => {
    if (window.confirm('Tem certeza que deseja restaurar os dados para o padrão? Todas as alterações salvas serão perdidas.')) {
        setIsResetting(true);
        resetData();
        window.location.reload();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
            <div className="mx-auto mb-4">
                 <Gear3DIcon className="w-20 h-20 mx-auto text-blue-600" />
            </div>
          <h1 className="text-3xl font-bold text-slate-900">LaborSync</h1>
          <p className="mt-2 text-slate-600">Gestão de Mão de Obra</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Usuário
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password-input" className="sr-only">
                Senha
              </label>
              <input
                id="password-input"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-center text-red-600">{error}</p>}
          
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
         <div className="text-center border-t border-slate-200 pt-6">
            <button
                onClick={handleReset}
                disabled={isResetting}
                className="text-sm font-medium text-slate-500 hover:text-blue-600 focus:outline-none transition-colors disabled:text-slate-400 disabled:cursor-wait"
            >
                {isResetting ? 'Restaurando dados...' : 'Resetar dados para o padrão'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default Login;