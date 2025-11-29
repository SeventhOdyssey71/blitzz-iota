import { IotaClient } from '@iota/iota-sdk/client';
import { Transaction } from '@iota/iota-sdk/transactions';
import { blitz_PACKAGE_ID } from '@/config/iota.config';

export class DexContract {
  private client: IotaClient;
  private packageId: string;

  constructor(client: IotaClient, network: 'mainnet' | 'testnet' | 'devnet' = 'testnet') {
    this.client = client;
    this.packageId = blitz_PACKAGE_ID[network];
  }

  async createPool(
    coinTypeA: string,
    coinTypeB: string,
    coinA: any,
    coinB: any,
    feePercentage: number
  ) {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.packageId}::dex::create_pool`,
      typeArguments: [coinTypeA, coinTypeB],
      arguments: [
        tx.object(coinA),
        tx.object(coinB),
        tx.pure.u64(feePercentage),
      ],
    });

    return tx;
  }

  async swap(
    poolId: string,
    coinTypeA: string,
    coinTypeB: string,
    coinIn: any,
    minAmountOut: bigint,
    isAToB: boolean
  ) {
    const tx = new Transaction();
    
    const functionName = isAToB ? 'swap_a_to_b' : 'swap_b_to_a';
    
    tx.moveCall({
      target: `${this.packageId}::dex::${functionName}`,
      typeArguments: [coinTypeA, coinTypeB],
      arguments: [
        tx.object(poolId),
        tx.object(coinIn),
        tx.pure.u64(minAmountOut),
      ],
    });

    return tx;
  }

  async addLiquidity(
    poolId: string,
    coinTypeA: string,
    coinTypeB: string,
    coinA: any,
    coinB: any
  ) {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${this.packageId}::dex::add_liquidity`,
      typeArguments: [coinTypeA, coinTypeB],
      arguments: [
        tx.object(poolId),
        tx.object(coinA),
        tx.object(coinB),
      ],
    });

    return tx;
  }

  async getPoolReserves(poolId: string): Promise<{ reserveA: bigint; reserveB: bigint }> {
    try {
      const pool = await this.client.getObject({
        id: poolId,
        options: {
          showContent: true,
        },
      });

      if (pool.data?.content?.dataType === 'moveObject') {
        const fields = pool.data.content.fields as any;
        return {
          reserveA: BigInt(fields.reserve_a),
          reserveB: BigInt(fields.reserve_b),
        };
      }

      throw new Error('Invalid pool object');
    } catch (error) {
      console.error('Failed to get pool reserves:', error);
      throw error;
    }
  }

  calculateSwapOutput(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    feePercentage: bigint = BigInt(30) // 0.3%
  ): bigint {
    const amountInWithFee = amountIn * (BigInt(10000) - feePercentage) / BigInt(10000);
    return (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
  }

  async findBestPool(
    coinTypeA: string,
    coinTypeB: string
  ): Promise<string | null> {
    // In a real implementation, this would query available pools
    // and return the one with best liquidity/rates
    // For now, return a mock pool ID
    return '0x1234...'; // Mock pool ID
  }
}