import { PoolList } from '@/components/pool-list';

export default function PoolPage() {
  return (
    <div className="min-h-screen pt-20 pb-12 bg-gradient-to-b from-gray-900 via-black to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PoolList />
      </div>
    </div>
  );
}