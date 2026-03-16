import React, { useState } from 'react';
import { X, Lock, AlertCircle, Mail, Key, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (password: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [email, setEmail] = useState('dashfire@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginMethod, setLoginMethod] = useState<'google' | 'email'>('email');

  const handleLocalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Fallback local para não perder acesso ao painel
    if (password === 'Redfire*1') {
      onLogin(password);
      onClose();
    } else {
      setAuthError('Senha incorreta.');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin(password);
      onClose();
    } catch (error: any) {
      console.error('Erro ao fazer login com E-mail:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        // Se o usuário não existe, tentamos o login local apenas para o painel
        if (password === 'Redfire*1') {
          onLogin(password);
          onClose();
          return;
        }
        setAuthError('Usuário não encontrado no Firebase. Use o botão "Criar Minha Conta" abaixo.');
      } else {
        setAuthError('Erro: ' + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!email || !password) {
      setAuthError('Preencha e-mail e senha primeiro.');
      return;
    }
    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setAuthError('Conta criada com sucesso! Agora você pode entrar.');
    } catch (error: any) {
      setAuthError('Erro ao criar conta: ' + error.message + '. Verifique se o login por e-mail está ativado no Firebase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      onClose();
    } catch (error: any) {
      console.error('Erro ao fazer login com Google:', error);
      if (error.code === 'auth/unauthorized-domain') {
        setAuthError('Domínio não autorizado no Firebase. Use o login por E-mail abaixo ou autorize o domínio no console.');
      } else if (error.code === 'auth/popup-blocked') {
        setAuthError('O navegador bloqueou a janela de login. Por favor, permita popups.');
      } else {
        setAuthError('Erro ao conectar com Google.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div className="flex items-center gap-2 text-gray-900 font-bold">
                <Lock size={20} className="text-orange-500" />
                Acesso Administrativo
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl mb-2">
                <p className="text-xs text-blue-700 leading-relaxed">
                  <strong>Nota:</strong> O login com Google está com erro de domínio. Use o <strong>Login por E-mail</strong> abaixo.
                </p>
              </div>

              <div className="flex p-1 bg-gray-100 rounded-xl">
                <button
                  onClick={() => setLoginMethod('email')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    loginMethod === 'email' ? 'bg-white text-black shadow-sm' : 'text-gray-500'
                  }`}
                >
                  E-mail e Senha
                </button>
                <button
                  onClick={() => setLoginMethod('google')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    loginMethod === 'google' ? 'bg-white text-black shadow-sm' : 'text-gray-500'
                  }`}
                >
                  Google
                </button>
              </div>

              {loginMethod === 'google' ? (
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {isLoading ? 'Conectando...' : 'Entrar com Google'}
                </button>
              ) : (
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-2">
                      <Mail size={14} /> E-mail
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:border-orange-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 flex items-center gap-2">
                      <Key size={14} /> Senha
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha"
                      className="w-full px-4 py-3 rounded-xl border border-gray-100 focus:border-orange-500 outline-none transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-lg disabled:opacity-50"
                  >
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateAccount}
                    disabled={isLoading}
                    className="w-full bg-white border border-gray-200 text-gray-600 py-3 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                  >
                    <UserPlus size={14} />
                    Criar Minha Conta no Firebase
                  </button>
                </form>
              )}

              {authError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-600 text-xs leading-relaxed"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  {authError}
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
