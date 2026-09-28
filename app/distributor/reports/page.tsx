import { ReportsView } from '@/components/shared/reports-view';

export default function Page({ searchParams }: { searchParams: { range?: string; from?: string; to?: string } }) {
  return <ReportsView basePath="/distributor/reports" searchParams={searchParams} />;
}
