import { ServicesView } from '@/components/shared/services-view';

export default function Page({ searchParams }: { searchParams: { q?: string; category?: string } }) {
  return <ServicesView basePath="/distributor/services" searchParams={searchParams} />;
}
