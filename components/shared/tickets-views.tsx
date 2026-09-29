import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TicketCreateForm } from './ticket-create-form';
import { TicketThreadActions } from './ticket-thread-actions';
import type { Role } from '@prisma/client';

export async function TicketsListView({
  basePath,
  allowCreate = true,
}: {
  basePath: string;
  allowCreate?: boolean;
}) {
  const user = await requireUser([
    'ADMIN',
    'DISTRIBUTOR',
    'RETAILER',
  ]);

  const where =
    user.role === 'ADMIN'
      ? {}
      : {
          OR: [
            { createdById: user.id },
            { assignedToId: user.id },
          ],
        };

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      createdBy: true,
      _count: {
        select: {
          messages: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Support Tickets
        </h1>
        <p className="text-sm text-muted-foreground">
          Track and respond to support requests.
        </p>
      </div>

      {allowCreate && <TicketCreateForm />}

      <Card>
        <CardHeader>
          <CardTitle>
            Tickets ({tickets.length})
          </CardTitle>
        </CardHeader>

        <CardContent className="divide-y divide-border">
          {tickets.map((t: any) => (
            <Link
              key={t.id}
              href={`${basePath}/${t.id}`}
              className="flex items-center justify-between py-3 hover:bg-accent/40"
            >
              <div>
                <p className="font-medium">
                  #{t.ticketNumber} · {t.subject}
                </p>

                <p className="text-xs text-muted-foreground">
                  {t.createdBy.name} · {t.category} ·{' '}
                  {t._count.messages} messages
                </p>
              </div>

              <div className="flex gap-2">
                <Badge variant="secondary">
                  {t.priority}
                </Badge>

                <Badge
                  variant={
                    t.status === 'CLOSED'
                      ? 'destructive'
                      : t.status === 'ANSWERED'
                        ? 'success'
                        : 'default'
                  }
                >
                  {t.status.replace('_', ' ')}
                </Badge>
              </div>
            </Link>
          ))}

          {tickets.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              No tickets yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export async function TicketDetailView({
  ticketId,
  backPath,
}: {
  ticketId: string;
  backPath: string;
}) {
  const user = await requireUser([
    'ADMIN',
    'DISTRIBUTOR',
    'RETAILER',
  ]);

  const ticket = await prisma.ticket.findUnique({
    where: {
      id: ticketId,
    },
    include: {
      createdBy: true,
      messages: {
        include: {
          sender: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (!ticket) notFound();

  const allowed =
    user.role === 'ADMIN' ||
    ticket.createdById === user.id ||
    ticket.assignedToId === user.id;

  if (!allowed) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={backPath}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to tickets
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">
          #{ticket.ticketNumber} · {ticket.subject}
        </h1>

        <div className="flex gap-2">
          <Badge variant="secondary">
            {ticket.priority}
          </Badge>

          <Badge>
            {ticket.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          {ticket.messages.map((m: any) => (
            <div
              key={m.id}
              className={`rounded-lg p-3 text-sm ${
                m.senderId === user.id
                  ? 'bg-primary/10'
                  : 'bg-muted'
              }`}
            >
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {m.sender.name} ·{' '}
                {m.createdAt.toLocaleString()}
              </p>

              <p className="whitespace-pre-wrap">
                {m.message}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <TicketThreadActions
        ticketId={ticket.id}
        closed={ticket.status === 'CLOSED'}
      />
    </div>
  );
}