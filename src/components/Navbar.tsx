import React from 'react';
import { Search, ShoppingBag, Menu, X, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  isAdmin: boolean;
  onAdminLogin: () => void;
  onLogout: () => void;
  onOpenSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isAdmin, onAdminLogin, onLogout, onOpenSettings }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-bottom border-black/5" id="main-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
              <ShoppingBag size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900 hidden sm:block">
              Achadinhos <span className="text-orange-500">PH</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">Início</a>
            <a href="#" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">Mais Vendidos</a>
            <a href="#" className="text-sm font-medium text-gray-600 hover:text-black transition-colors">Cupons</a>
            {isAdmin ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={onOpenSettings}
                  className="p-2 text-gray-400 hover:text-black transition-colors"
                  title="Configurações da IA"
                >
                  <Settings size={20} />
                </button>
                <button 
                  onClick={onLogout}
                  className="text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors"
                >
                  Sair
                </button>
              </div>
            ) : (
              <button 
                onClick={onAdminLogin}
                className="text-sm font-bold text-gray-400 hover:text-black transition-colors"
              >
                Admin
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar ofertas..."
                className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full text-sm focus:ring-2 focus:ring-black/5 w-64 transition-all"
              />
            </div>
            
            <button 
              className="md:hidden p-2 text-gray-600"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-black/5 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              <a href="#" className="block px-3 py-4 text-base font-medium text-gray-900 border-b border-black/5">Início</a>
              <a href="#" className="block px-3 py-4 text-base font-medium text-gray-900 border-b border-black/5">Mais Vendidos</a>
              <a href="#" className="block px-3 py-4 text-base font-medium text-gray-900 border-b border-black/5">Cupons</a>
              {isAdmin ? (
                <button 
                  onClick={() => {
                    onLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-4 text-base font-bold border-b border-black/5 text-orange-500"
                >
                  Sair do Painel
                </button>
              ) : (
                <button 
                  onClick={() => {
                    onAdminLogin();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-4 text-base font-bold border-b border-black/5 text-gray-900"
                >
                  Admin
                </button>
              )}
              <a href="#" className="block px-3 py-4 text-base font-medium text-gray-900">Sobre</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
