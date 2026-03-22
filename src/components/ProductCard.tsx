import React from 'react';
import { ShoppingCart, ExternalLink, Flame, ShieldCheck } from 'lucide-react';
import { Product } from '../types';
import { motion } from 'motion/react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const discount = product.originalPrice 
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) 
    : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-black/5 hover:shadow-md transition-shadow group relative"
      id={`product-${product.id}`}
    >
      {product.blockchainHash && (
        <div className="absolute top-3 left-3 z-10 bg-blue-500/90 backdrop-blur-sm text-white px-2 py-1 rounded-full text-[9px] font-bold flex items-center gap-1 shadow-sm border border-white/20">
          <ShieldCheck size={10} />
          <span>VERIFICADO BLOCKCHAIN</span>
        </div>
      )}
      
      {product.isHot && !product.blockchainHash && (
        <div className="absolute top-3 left-3 z-10 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
          <Flame size={12} fill="currentColor" />
          <span>EM ALTA</span>
        </div>
      )}
      
      {discount > 0 && (
        <div className="absolute top-3 right-3 z-10 bg-emerald-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-sm">
          -{discount}%
        </div>
      )}

      <div className="aspect-square overflow-hidden bg-gray-100">
        <img 
          src={product.imageUrl} 
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="p-4 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
            product.platform === 'Shopee' ? 'bg-orange-100 text-orange-600' :
            product.platform === 'Mercado Livre' ? 'bg-yellow-100 text-yellow-700' :
            product.platform === 'Amazon' ? 'bg-blue-100 text-blue-600' :
            'bg-gray-100 text-gray-600'
          }`}>
            {product.platform}
          </span>
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
            {product.category}
          </span>
        </div>

        <h3 className="font-semibold text-gray-900 leading-tight mb-2 line-clamp-2 min-h-[2.5rem]">
          {product.title}
        </h3>

        <div className="mt-auto">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-xl font-bold text-gray-900">
              R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-gray-400 line-through">
                R$ {product.originalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>

          <a 
            href={product.affiliateLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-black text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors active:scale-95"
          >
            <ShoppingCart size={18} />
            <span>Ver Oferta</span>
            <ExternalLink size={14} className="opacity-50" />
          </a>
        </div>
      </div>
    </motion.div>
  );
};
