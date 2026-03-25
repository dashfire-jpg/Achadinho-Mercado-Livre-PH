import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  Timestamp,
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { X, BarChart3, MousePointer2, Users, Calendar, ArrowUpRight, TrendingUp } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell
} from 'recharts';

interface StatsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Visit {
  id: string;
  timestamp: Timestamp;
  userAgent: string;
}

interface Click {
  id: string;
  productId: string;
  productTitle: string;
  timestamp: Timestamp;
  platform: string;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ isOpen, onClose }) => {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<number>(7); // Default to last 7 days

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen, period]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const startDate = subDays(new Date(), period);
      const startTimestamp = Timestamp.fromDate(startOfDay(startDate));

      // Fetch Visits
      const visitsQuery = query(
        collection(db, 'visits'),
        where('timestamp', '>=', startTimestamp),
        orderBy('timestamp', 'desc')
      );
      const visitsSnapshot = await getDocs(visitsQuery);
      const visitsData = visitsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Visit[];
      setVisits(visitsData);

      // Fetch Clicks
      const clicksQuery = query(
        collection(db, 'clicks'),
        where('timestamp', '>=', startTimestamp),
        orderBy('timestamp', 'desc')
      );
      const clicksSnapshot = await getDocs(clicksQuery);
      const clicksData = clicksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Click[];
      setClicks(clicksData);

    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDailyData = () => {
    const data: any[] = [];
    for (let i = period - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayVisits = visits.filter(v => isSameDay(v.timestamp.toDate(), date)).length;
      const dayClicks = clicks.filter(c => isSameDay(c.timestamp.toDate(), date)).length;
      data.push({
        name: format(date, 'dd/MM'),
        visitas: dayVisits,
        cliques: dayClicks
      });
    }
    return data;
  };

  const getProductClicks = () => {
    const productMap: { [key: string]: { title: string, count: number } } = {};
    clicks.forEach(c => {
      if (!productMap[c.productId]) {
        productMap[c.productId] = { title: c.productTitle || 'Produto Desconhecido', count: 0 };
      }
      productMap[c.productId].count++;
    });

    return Object.values(productMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5
  };

  const COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899'];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white w-full max-w-5xl h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                <BarChart3 size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Estatísticas de Acesso</h2>
                <p className="text-xs text-gray-500">Acompanhe o desempenho do seu site</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <select 
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
                className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500/20"
              >
                <option value={7}>Últimos 7 dias</option>
                <option value={15}>Últimos 15 dias</option>
                <option value={30}>Últimos 30 dias</option>
              </select>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500 font-medium">Carregando dados...</p>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <Users size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total de Visitas</p>
                      <p className="text-2xl font-bold text-gray-900">{visits.length}</p>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                      <MousePointer2 size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total de Cliques</p>
                      <p className="text-2xl font-bold text-gray-900">{clicks.length}</p>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Taxa de Conversão</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {visits.length > 0 ? ((clicks.length / visits.length) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <Calendar size={16} className="text-orange-500" />
                      Acessos por Dia
                    </h3>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getDailyData()}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="visitas" 
                            stroke="#3B82F6" 
                            strokeWidth={3} 
                            dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="cliques" 
                            stroke="#F97316" 
                            strokeWidth={3} 
                            dot={{ r: 4, fill: '#F97316', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <ArrowUpRight size={16} className="text-orange-500" />
                      Top 5 Produtos Clicados
                    </h3>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getProductClicks()} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="title" 
                            type="category" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#4b5563' }}
                            width={150}
                          />
                          <Tooltip 
                            cursor={{ fill: '#f9fafb' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                            {getProductClicks().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 mb-6">Cliques Recentes</h3>
                  <div className="space-y-4">
                    {clicks.slice(0, 10).map((click) => (
                      <div key={click.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-orange-500 shadow-sm">
                            <MousePointer2 size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{click.productTitle}</p>
                            <p className="text-[10px] text-gray-500 uppercase font-medium tracking-wider">{click.platform}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-gray-900">
                            {format(click.timestamp.toDate(), "dd 'de' MMMM, HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
