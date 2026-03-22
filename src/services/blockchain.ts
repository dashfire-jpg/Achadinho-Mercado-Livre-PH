import { ethers } from 'ethers';

/**
 * Blockchain Service for Achadinhos PH
 * Provides decentralized security layers:
 * 1. Wallet Authentication (Web3 Login)
 * 2. Product Integrity Verification (Hash Chain)
 */

export interface BlockchainState {
  address: string | null;
  isConnected: boolean;
  network: string | null;
}

export class BlockchainService {
  private static instance: BlockchainService;
  private provider: ethers.BrowserProvider | null = null;

  private constructor() {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      this.provider = new ethers.BrowserProvider((window as any).ethereum);
    }
  }

  public static getInstance(): BlockchainService {
    if (!BlockchainService.instance) {
      BlockchainService.instance = new BlockchainService();
    }
    return BlockchainService.instance;
  }

  /**
   * Connects to a Web3 Wallet (MetaMask, etc.)
   */
  public async connectWallet(): Promise<string | null> {
    if (!this.provider) {
      throw new Error('Nenhuma carteira Web3 (como MetaMask) encontrada.');
    }

    try {
      const accounts = await this.provider.send('eth_requestAccounts', []);
      return accounts[0];
    } catch (error) {
      console.error('Erro ao conectar carteira:', error);
      return null;
    }
  }

  /**
   * Signs a message to verify ownership of the address
   */
  public async signMessage(message: string): Promise<string | null> {
    if (!this.provider) return null;
    
    try {
      const signer = await this.provider.getSigner();
      return await signer.signMessage(message);
    } catch (error) {
      console.error('Erro ao assinar mensagem:', error);
      return null;
    }
  }

  /**
   * Generates a cryptographic hash for a product to ensure its integrity.
   * This simulates a "Proof of Authenticity" on the blockchain.
   */
  public async generateProductHash(product: any): Promise<string> {
    const data = JSON.stringify({
      id: product.id,
      title: product.title,
      price: product.price,
      link: product.link,
      timestamp: product.createdAt
    });
    
    // Using SHA-256 via ethers
    return ethers.id(data);
  }

  /**
   * Verifies if a product's data matches its stored hash.
   */
  public async verifyIntegrity(product: any, storedHash: string): Promise<boolean> {
    const currentHash = await this.generateProductHash(product);
    return currentHash === storedHash;
  }
}

export const blockchain = BlockchainService.getInstance();
