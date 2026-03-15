import { Product } from './types';

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '5DNTYH-75YR',
    title: 'Smartphone Motorola Moto G06 - 128GB 12GB (4GB + 8GB RAM Boost)',
    description: 'Câmera 50MP com AI, bateria de 5200 mAh e tela de 6.9 polegadas. Processador Octa-Core e 128GB de memória.',
    price: 666.00,
    originalPrice: 1253.55,
    imageUrl: 'https://http2.mlstatic.com/D_NQ_NP_633465-MLB61424002_012024-O.webp',
    affiliateLink: 'https://meli.la/2tkzPdU',
    platform: 'Mercado Livre',
    category: 'Eletrônicos',
    isHot: true,
  }
];

export const CATEGORIES: string[] = ['Todos', 'Eletrônicos', 'Casa', 'Moda', 'Beleza', 'Games'];
