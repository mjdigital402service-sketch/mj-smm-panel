import { TransactionsView } from '@/components/shared/transactions-view';

export default function Page({ searchParams }: { searchParams: { page?: string; type?: string } }) {
  return <TransactionsView basePath="/distributor/transactions" searchParams={searchParams} />;
}
