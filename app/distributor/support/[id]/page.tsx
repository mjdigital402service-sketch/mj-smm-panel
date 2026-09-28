import { TicketDetailView } from '@/components/shared/tickets-views';

export default function Page({ params }: { params: { id: string } }) {
  return <TicketDetailView ticketId={params.id} backPath="/distributor/support" />;
}
