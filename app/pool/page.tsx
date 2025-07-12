import { PoolInterface } from '@/components/pool-interface';
import { TradeEarnNav } from '@/components/trade-earn-nav';

export default function PoolPage() {
  return (
    <div className="container mx-auto px-4 py-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-center">
          <TradeEarnNav />
        </div>
        <PoolInterface />
      </div>
    </div>
  );
}