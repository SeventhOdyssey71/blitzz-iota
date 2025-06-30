'use client';

import { Transaction } from '@iota/iota-sdk/transactions';
import { IotaClient } from '@iota/iota-sdk/client';
import { STAKING_POOL_ADDRESS, STIOTA_TYPE } from '@/config/iota.config';

export class StakingPoolContract {
  static stake(
    tx: Transaction,
    iotaCoin: any,
    amount: bigint
  ) {
    const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0xd84fe8b6622ff910dc5e097c06de5ac31055c169453435d162ff999c8fb65202';
    const STAKING_MODULE = process.env.NEXT_PUBLIC_STAKING_MODULE || 'simple_staking';
    
    // The coin is already split to the exact amount, just use it directly
    
    // Call the stake function
    const result = tx.moveCall({
      target: `${PACKAGE_ID}::${STAKING_MODULE}::stake`,
      arguments: [
        tx.object(STAKING_POOL_ADDRESS),
        iotaCoin, // This is already the split coin with exact amount
      ],
    });
    
    console.log('Stake transaction built:', {
      packageId: PACKAGE_ID,
      module: STAKING_MODULE,
      poolAddress: STAKING_POOL_ADDRESS,
      amount: amount.toString()
    });
    
    return result;
  }

  static async getExchangeRate(client: IotaClient): Promise<number> {
    try {
      const pool = await client.getObject({
        id: STAKING_POOL_ADDRESS,
        options: {
          showContent: true,
        },
      });

      if (pool.data?.content?.dataType === 'moveObject') {
        const fields = pool.data.content.fields as any;
        const exchangeRate = BigInt(fields.exchange_rate || 1000000000);
        // Convert to decimal (exchange rate is stored as u64 with 9 decimals)
        return Number(exchangeRate) / 1_000_000_000;
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
    }
    
    return 1.0; // Default 1:1 rate
  }

  static calculateStIOTAAmount(iotaAmount: bigint, exchangeRate: number): bigint {
    // stIOTA = IOTA * 1e9 / exchangeRate
    const rateAsBigInt = BigInt(Math.floor(exchangeRate * 1_000_000_000));
    return (iotaAmount * BigInt(1_000_000_000)) / rateAsBigInt;
  }

  static calculateIOTAAmount(stiotaAmount: bigint, exchangeRate: number): bigint {
    // IOTA = stIOTA * exchangeRate / 1e9
    const rateAsBigInt = BigInt(Math.floor(exchangeRate * 1_000_000_000));
    return (stiotaAmount * rateAsBigInt) / BigInt(1_000_000_000);
  }
}