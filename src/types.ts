export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  affiliateLink: string;
  platform: 'Mercado Livre' | 'Shopee' | 'Amazon' | 'Outros';
  category: string;
  isHot?: boolean;
  blockchainHash?: string;
  createdAt?: any;
  updatedAt?: any;
}

export type Category = 'Eletrônicos' | 'Casa' | 'Moda' | 'Beleza' | 'Games' | 'Todos';
