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
    try {
      // Query for pools with these coin types
      // This would typically involve querying dynamic fields or events
      // from the deployed package to find available pools
      const pools = await this.client.queryEvents({
        query: {
          MoveEventType: `${this.packageId}::dex::PoolCreated`
        },
        limit: 50
      });

      // Find pools matching the coin types
      for (const event of pools.data) {
        if (event.parsedJson) {
          const poolData = event.parsedJson as any;
          // Check if this pool matches our coin types (in either direction)
          if ((poolData.coin_type_a === coinTypeA && poolData.coin_type_b === coinTypeB) ||
              (poolData.coin_type_a === coinTypeB && poolData.coin_type_b === coinTypeA)) {
            return poolData.pool_id;
          }
        }
      }

      // No pools found
      return null;
    } catch (error) {
      console.error('Failed to find pools:', error);
      return null;
    }
  }
}