import React, { useState, useMemo, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ProductCard } from './components/ProductCard';
import { LoginModal } from './components/LoginModal';
import { ConfirmModal } from './components/ConfirmModal';
import { CATEGORIES } from './constants';
import { Product, Category } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Star, Zap, Bell, Plus, X, Link as LinkIcon, Tag, Image as ImageIcon, Info, Sparkles, Wand2, AlertCircle, Pencil, Upload } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  // Form State
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    platform: 'Mercado Livre',
    category: 'Eletrônicos'
  });

  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [dynamicAiKey, setDynamicAiKey] = useState<string | null>(null);

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    setToast({ message: 'Erro de permissão ou conexão com o banco de dados.', type: 'error' });
    return errInfo;
  };

  // Handle Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email === 'dashfire@gmail.com') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Test connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();
  }, []);

  // Load products from Firestore
  useEffect(() => {
    // Fetch dynamic config (API Key)
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.geminiApiKey) setDynamicAiKey(data.geminiApiKey);
      })
      .catch(err => console.error("Erro ao carregar configuração:", err));

    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const productsData: Product[] = [];
      snapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(productsData);
      setIsInitialLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
      setIsInitialLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'Todos') return products;
    return products.filter(p => p.category === selectedCategory);
  }, [selectedCategory, products]);

  const handleSmartImport = async () => {
    if (!importText.trim()) return;
    
    setIsImporting(true);
    try {
      let pageContent = "";
      let targetUrl = importText;

      // If it's a link, try to fetch content first
      if (importText.includes('http')) {
        try {
          const scrapeRes = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: importText })
          });
          if (scrapeRes.ok) {
            const scrapeData = await scrapeRes.json();
            pageContent = `Conteúdo da página: ${scrapeData.content}`;
            if (scrapeData.imageUrl) {
              setNewProduct(prev => ({ ...prev, imageUrl: scrapeData.imageUrl }));
            }
          }
        } catch (e) {
          console.warn("Falha ao raspar conteúdo, tentando apenas com o link", e);
        }
      }

      const aiKey = process.env.GEMINI_API_KEY || dynamicAiKey;
      if (!aiKey) {
        console.error("GEMINI_API_KEY não encontrada no ambiente.");
        setToast({ message: 'IA indisponível: Chave não configurada.', type: 'error' });
        setIsImporting(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: aiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extraia as informações do produto deste texto ou link: "${importText}". 
        ${pageContent ? `Aqui está o conteúdo real da página para ajudar: ${pageContent}` : ''}
        
        Retorne APENAS um JSON no formato: 
        { "title": "nome", "price": 0.0, "originalPrice": 0.0, "imageUrl": "url", "platform": "Mercado Livre ou Shopee", "category": "Eletrônicos/Casa/Moda/Beleza/Games", "description": "breve" }
        
        IMPORTANTE:
        1. Se for um link de afiliado, tente encontrar o preço real e a imagem original do produto no conteúdo fornecido.
        2. Se não encontrar a imagem, use uma URL do Picsum.
        3. A descrição deve ser curta e atrativa.`,
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        
        setNewProduct(prev => {
          const updated = {
            ...prev,
            ...data,
            affiliateLink: importText.includes('http') ? importText : (prev.affiliateLink || '')
          };
          
          // Se a IA retornou uma imagem genérica (picsum) mas já temos uma imagem real do scraper, mantém a real
          if (data.imageUrl?.includes('picsum.photos') && prev.imageUrl && !prev.imageUrl.includes('picsum.photos')) {
            updated.imageUrl = prev.imageUrl;
          }
          
          return updated;
        });

        setImportText('');
        setToast({ message: "Dados extraídos com sucesso!", type: 'success' });
      } else {
        setToast({ message: "Não foi possível extrair os dados automaticamente.", type: 'error' });
      }
    } catch (error) {
      console.error("Erro na importação inteligente:", error);
      setToast({ message: "Erro ao processar importação.", type: 'error' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.title || !newProduct.price || !newProduct.affiliateLink || !newProduct.imageUrl) {
      setToast({ message: 'Por favor, preencha os campos obrigatórios.', type: 'error' });
      return;
    }

    const productData = {
      title: newProduct.title!,
      description: newProduct.description || '',
      price: Number(newProduct.price),
      originalPrice: newProduct.originalPrice ? Number(newProduct.originalPrice) : null,
      imageUrl: newProduct.imageUrl!,
      affiliateLink: newProduct.affiliateLink!,
      platform: newProduct.platform,
      category: newProduct.category,
      isHot: newProduct.isHot || false,
      createdAt: editingProductId ? (newProduct as any).createdAt : serverTimestamp(),
    };

    try {
      if (editingProductId) {
        await updateDoc(doc(db, 'products', editingProductId), productData);
        setToast({ message: 'Produto atualizado com sucesso!', type: 'success' });
      } else {
        await addDoc(collection(db, 'products'), productData);
        setToast({ message: 'Produto cadastrado com sucesso!', type: 'success' });
      }
      
      setIsModalOpen(false);
      setEditingProductId(null);
      setNewProduct({ platform: 'Mercado Livre', category: 'Eletrônicos' });
    } catch (error) {
      handleFirestoreError(error, editingProductId ? OperationType.UPDATE : OperationType.CREATE, `products/${editingProductId || ''}`);
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProductId(product.id);
    setNewProduct(product);
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      setToast({ message: 'Produto removido com sucesso!', type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const clearAllProducts = async () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Remover Tudo',
      message: 'Tem certeza que deseja remover TODOS os produtos? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          const deletePromises = products.map(p => deleteDoc(doc(db, 'products', p.id)));
          await Promise.all(deletePromises);
          setToast({ message: 'Todos os produtos foram removidos.', type: 'success' });
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'products/all');
        }
      }
    });
  };

  const handleAdminLogin = () => {
    setIsLoginModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      setToast({ message: 'Sessão encerrada.', type: 'success' });
    } catch (error) {
      console.error('Erro ao sair:', error);
    }
  };

  const onLoginSuccess = (password: string) => {
    setIsAdmin(true);
    setIsLoginModalOpen(false);
    setToast({ message: 'Acesso concedido! Modo administrador ativado.', type: 'success' });
  };

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full"
        />
        <p className="text-gray-500 font-medium animate-pulse">Carregando as melhores ofertas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-900">
      <Navbar isAdmin={isAdmin} onAdminLogin={handleAdminLogin} onLogout={handleLogout} />
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-white ${
              toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          >
            {toast.type === 'success' ? <Zap size={20} /> : <AlertCircle size={20} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
        onLogin={onLoginSuccess} 
      />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white pt-16 pb-24 border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-xs font-bold uppercase tracking-wider mb-6">
                <Zap size={14} fill="currentColor" />
                Ofertas Atualizadas Hoje
              </span>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-900 mb-6 leading-[1.1]">
                Achadinhos do <span className="text-orange-500 underline decoration-orange-200 underline-offset-8">Mercado Livre</span> PH Indicações.
              </h1>
              <p className="text-xl text-gray-500 mb-10 leading-relaxed">
                As melhores indicações e achadinhos do Mercado Livre selecionados cuidadosamente para você economizar tempo e dinheiro.
              </p>
              
              <div className="flex flex-wrap gap-4">
                {isAdmin && (
                  <>
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      className="px-8 py-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg shadow-black/10"
                    >
                      <Plus size={20} />
                      Cadastrar Novo Produto
                    </button>
                    {products.length > 0 && (
                      <button 
                        onClick={clearAllProducts}
                        className="px-8 py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center gap-2"
                      >
                        <X size={20} />
                        Limpar Tudo
                      </button>
                    )}
                  </>
                )}
                <button className="px-8 py-4 bg-white text-black border border-black/10 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center gap-2">
                  <Bell size={20} />
                  Receber Alertas
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[600px] h-[600px] bg-orange-50 rounded-full blur-3xl opacity-50 -z-0" />
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[400px] h-[400px] bg-blue-50 rounded-full blur-3xl opacity-50 -z-0" />
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Category Filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4 overflow-x-auto pb-2 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat as Category)}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat 
                    ? 'bg-black text-white shadow-md' 
                    : 'bg-white text-gray-600 border border-black/5 hover:border-black/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
            <Star size={16} className="text-yellow-400 fill-yellow-400" />
            <span>Mostrando {filteredProducts.length} ofertas selecionadas</span>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="relative group">
              <ProductCard product={product} />
              {isAdmin && (
                <div className="absolute top-2 right-2 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => openEditModal(product)}
                    className="bg-white text-black p-2 rounded-full shadow-lg hover:bg-gray-100"
                    title="Editar Produto"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={() => removeProduct(product.id)}
                    className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600"
                    title="Remover Produto"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
              <ShoppingBag size={40} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma oferta encontrada</h3>
            <p className="text-gray-500">Tente mudar a categoria ou adicione novos produtos.</p>
          </div>
        )}
      </main>

      {/* Modal de Cadastro */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="p-6 border-b border-black/5 flex justify-between items-center sticky top-0 bg-white z-10">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  {editingProductId ? <Tag className="text-orange-500" /> : <Plus className="text-orange-500" />}
                  {editingProductId ? 'Editar Produto' : 'Novo Produto'}
                </h2>
                <button onClick={() => {
                  setIsModalOpen(false);
                  setEditingProductId(null);
                  setNewProduct({ platform: 'Mercado Livre', category: 'Eletrônicos' });
                }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 space-y-8">
                {/* Smart Import Section */}
                <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100">
                  <h3 className="text-sm font-bold text-orange-800 flex items-center gap-2 mb-3">
                    <Sparkles size={16} /> Importação Inteligente (IA)
                  </h3>
                  <p className="text-xs text-orange-600 mb-4">
                    Cole o link do produto ou o texto copiado da sua lista de desejos abaixo.
                  </p>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Cole o link ou texto aqui..."
                      className="flex-1 px-4 py-3 bg-white border border-orange-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-300"
                      value={importText}
                      onChange={e => setImportText(e.target.value)}
                    />
                    <button 
                      onClick={handleSmartImport}
                      disabled={isImporting}
                      className="bg-orange-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isImporting ? <Wand2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                      {isImporting ? 'Lendo...' : 'Importar'}
                    </button>
                  </div>
                  <div className="mt-3 flex items-start gap-2 text-[10px] text-orange-500">
                    <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                    <span>Atenção: Links que começam com "myaccount" são privados. Tente copiar o nome do produto e o preço da sua lista e colar aqui para a IA identificar!</span>
                  </div>
                </div>

                <form onSubmit={handleAddProduct} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <Tag size={16} /> Título do Produto *
                      </label>
                      <input 
                        required
                        type="text" 
                        placeholder="Ex: Smartphone Samsung Galaxy S23"
                        className="w-full px-4 py-3 bg-gray-50 border border-black/5 rounded-xl focus:ring-2 focus:ring-black/5 outline-none"
                        value={newProduct.title || ''}
                        onChange={e => setNewProduct({...newProduct, title: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <Info size={16} /> Plataforma
                      </label>
                      <select 
                        className="w-full px-4 py-3 bg-gray-50 border border-black/5 rounded-xl focus:ring-2 focus:ring-black/5 outline-none"
                        value={newProduct.platform}
                        onChange={e => setNewProduct({...newProduct, platform: e.target.value as any})}
                      >
                        <option value="Mercado Livre">Mercado Livre</option>
                        <option value="Shopee">Shopee</option>
                        <option value="Amazon">Amazon</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Preço Atual (R$) *</label>
                      <input 
                        required
                        type="number" 
                        step="0.01"
                        placeholder="0,00"
                        className="w-full px-4 py-3 bg-gray-50 border border-black/5 rounded-xl focus:ring-2 focus:ring-black/5 outline-none"
                        value={newProduct.price || ''}
                        onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Preço Original (Opcional)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0,00"
                        className="w-full px-4 py-3 bg-gray-50 border border-black/5 rounded-xl focus:ring-2 focus:ring-black/5 outline-none"
                        value={newProduct.originalPrice || ''}
                        onChange={e => setNewProduct({...newProduct, originalPrice: Number(e.target.value)})}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <LinkIcon size={16} /> Link de Afiliado *
                      </label>
                      <input 
                        required
                        type="url" 
                        placeholder="https://mercadolivre.com.br/..."
                        className="w-full px-4 py-3 bg-gray-50 border border-black/5 rounded-xl focus:ring-2 focus:ring-black/5 outline-none"
                        value={newProduct.affiliateLink || ''}
                        onChange={e => setNewProduct({...newProduct, affiliateLink: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <ImageIcon size={16} /> Imagem do Produto *
                      </label>
                      <div className="flex gap-2">
                        <input 
                          required
                          type="text" 
                          placeholder="URL da imagem ou faça upload..."
                          className="flex-1 px-4 py-3 bg-gray-50 border border-black/5 rounded-xl focus:ring-2 focus:ring-black/5 outline-none"
                          value={newProduct.imageUrl || ''}
                          onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})}
                        />
                        <label className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl cursor-pointer hover:bg-gray-200 transition-colors flex items-center gap-2 border border-black/5">
                          <Upload size={18} />
                          <span className="text-xs font-bold hidden sm:inline">Upload</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageUpload}
                          />
                        </label>
                      </div>
                      {newProduct.imageUrl && (
                        <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border border-black/5">
                          <img src={newProduct.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Categoria</label>
                      <select 
                        className="w-full px-4 py-3 bg-gray-50 border border-black/5 rounded-xl focus:ring-2 focus:ring-black/5 outline-none"
                        value={newProduct.category}
                        onChange={e => setNewProduct({...newProduct, category: e.target.value as any})}
                      >
                        {CATEGORIES.filter(c => c !== 'Todos').map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-3 pt-8">
                      <input 
                        type="checkbox" 
                        id="isHot"
                        className="w-5 h-5 accent-orange-500"
                        checked={newProduct.isHot || false}
                        onChange={e => setNewProduct({...newProduct, isHot: e.target.checked})}
                      />
                      <label htmlFor="isHot" className="text-sm font-bold text-gray-700 cursor-pointer">Destacar como "Em Alta"</label>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button 
                      type="submit"
                      className="w-full bg-black text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-xl shadow-black/10"
                    >
                      Salvar Produto
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-white border-t border-black/5 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
                  <ShoppingBag size={18} />
                </div>
                <span className="text-lg font-bold tracking-tight text-gray-900">
                  Achadinhos<span className="text-orange-500">.</span>
                </span>
              </div>
              <p className="text-gray-500 max-w-sm mb-6">
                O seu portal definitivo para encontrar as melhores ofertas da internet. Nós garimpamos, você economiza.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-gray-900 mb-6">Plataformas</h4>
              <ul className="space-y-4 text-sm text-gray-500">
                <li><a href="#" className="hover:text-black transition-colors">Shopee</a></li>
                <li><a href="#" className="hover:text-black transition-colors">Mercado Livre</a></li>
                <li><a href="#" className="hover:text-black transition-colors">Amazon</a></li>
                <li><a href="#" className="hover:text-black transition-colors">AliExpress</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-900 mb-6">Institucional</h4>
              <ul className="space-y-4 text-sm text-gray-500">
                <li><a href="#" className="hover:text-black transition-colors">Sobre Nós</a></li>
                <li><a href="#" className="hover:text-black transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-black transition-colors">Privacidade</a></li>
                <li><a href="#" className="hover:text-black transition-colors">Contato</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-black/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              © 2026 Achadinhos. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-4">
              <button 
                onClick={handleAdminLogin}
                className="text-[10px] text-gray-300 uppercase tracking-widest font-bold hover:text-orange-500 transition-colors"
              >
                {isAdmin ? 'Modo Admin Ativo' : 'Área do Admin'}
              </button>
              <p className="text-[10px] text-gray-300 uppercase tracking-widest font-bold">
                Desenvolvido com ❤️ para economizadores
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
