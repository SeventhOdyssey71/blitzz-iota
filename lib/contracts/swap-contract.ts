'use client';

import { Transaction } from '@iota/iota-sdk/transactions';
import { STAKING_POOL_ADDRESS } from '@/config/iota.config';

export class SwapContract {
  static swapIotaToStIota(
    tx: Transaction,
    iotaCoin: any,
    amount: bigint
  ) {
    const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0xd84fe8b6622ff910dc5e097c06de5ac31055c169453435d162ff999c8fb65202';
    const SWAP_MODULE = process.env.NEXT_PUBLIC_SWAP_MODULE || 'simple_staking';
    
    // Call the stake function which effectively swaps IOTA for stIOTA
    const result = tx.moveCall({
      target: `${PACKAGE_ID}::${SWAP_MODULE}::stake`,
      arguments: [
        tx.object(STAKING_POOL_ADDRESS),
        iotaCoin,
      ],
    });
    
    console.log('Swap IOTA to stIOTA transaction built:', {
      packageId: PACKAGE_ID,
      module: SWAP_MODULE,
      poolAddress: STAKING_POOL_ADDRESS,
      amount: amount.toString()
    });
    
    return result;
  }
  
  static swapStIotaToIota(
    tx: Transaction,
    stIotaCoin: any,
    amount: bigint
  ) {
    const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0xd84fe8b6622ff910dc5e097c06de5ac31055c169453435d162ff999c8fb65202';
    const SWAP_MODULE = process.env.NEXT_PUBLIC_SWAP_MODULE || 'simple_staking';
    
    // For now, unstaking is not implemented in the simple contract
    throw new Error('Unstaking (stIOTA to IOTA) not yet implemented. Please use the staking function for IOTA to stIOTA swaps.');
  }
}