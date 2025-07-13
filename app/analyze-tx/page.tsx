import { AnalyzeTransactionClient } from '@/components/analyze-tx-client';

export default function AnalyzeTransactionPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Transaction Analysis Tool</h1>
      <AnalyzeTransactionClient />
    </div>
  );
}