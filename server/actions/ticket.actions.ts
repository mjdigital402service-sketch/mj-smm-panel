'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { notify } from '@/server/services/notification.service';

export async function createTicketAction(formData: FormData) {
  const user = await requireUser(['ADMIN', 'DISTRIBUTOR', 'RETAILER']);

  const subject = String(formData.get('subject') ?? '').trim();
  const category = String(formData.get('category') ?? 'General').trim();
  const priority = String(formData.get('priority') ?? 'MEDIUM') as any;
  const message = String(formData.get('message') ?? '').trim();

  if (!subject || !message) {
    throw new Error('Subject and message are required.');
  }

  // Retailers escalate to their own distributor.
  // Distributors escalate to an active admin.
  // Admins can open internal tickets.
  let assignedToId: string | undefined;

  if (user.role === 'RETAILER') {
    assignedToId = user.distributorId ?? undefined;
  } else if (user.role === 'DISTRIBUTOR') {
    const admin = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    assignedToId = admin?.id;
  }

  const ticket = await prisma.ticket.create({
    data: {
      createdById: user.id,
      assignedToId,
      subject,
      category,
      priority,
      messages: {
        create: {
          senderId: user.id,
          message,
        },
      },
    },
  });

  if (assignedToId) {
    await notify({
      userId: assignedToId,
      type: 'TICKET_REPLY',
      title: 'New support ticket',
      message: subject,
    });
  }

  revalidatePath('/admin/tickets');
  revalidatePath('/distributor/support');
  revalidatePath('/retailer/tickets');

  return ticket.id;
}

/**
 * Ensures that the current user is allowed to manage a ticket.
 *
 * Access rules:
 * - ADMIN: can manage every ticket.
 * - Ticket creator: can manage their own ticket.
 * - Assigned user: can manage the ticket assigned to them.
 * - Everyone else: denied.
 */
async function requireTicketParticipant(
  ticketId: string,
  user: Awaited<ReturnType<typeof requireUser>>,
) {
  const ticket = await prisma.ticket.findUniqueOrThrow({
    where: {
      id: ticketId,
    },
  });

  const isParticipant =
    user.role === 'ADMIN' ||
    ticket.createdById === user.id ||
    ticket.assignedToId === user.id;

  if (!isParticipant) {
    throw new Error('Not authorized to manage this ticket.');
  }

  return ticket;
}

export async function replyTicketAction(
  ticketId: string,
  message: string,
) {
  const user = await requireUser(['ADMIN', 'DISTRIBUTOR', 'RETAILER']);

  const ticket = await requireTicketParticipant(ticketId, user);

  const cleanMessage = message.trim();

  if (!cleanMessage) {
    throw new Error('Message is required.');
  }

  await prisma.ticketMessage.create({
    data: {
      ticketId,
      senderId: user.id,
      message: cleanMessage,
    },
  });

  const newStatus =
    user.id === ticket.createdById ? 'CUSTOMER_REPLIED' : 'ANSWERED';

  await prisma.ticket.update({
    where: {
      id: ticketId,
    },
    data: {
      status: newStatus,
    },
  });

  const notifyTarget =
    user.id === ticket.createdById
      ? ticket.assignedToId
      : ticket.createdById;

  if (notifyTarget) {
    await notify({
      userId: notifyTarget,
      type: 'TICKET_REPLY',
      title: 'Ticket reply',
      message: `New reply on: ${ticket.subject}`,
    });
  }

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/distributor/support/${ticketId}`);
  revalidatePath(`/retailer/tickets/${ticketId}`);

  revalidatePath('/admin/tickets');
  revalidatePath('/distributor/support');
  revalidatePath('/retailer/tickets');
}

export async function closeTicketAction(ticketId: string) {
  const user = await requireUser(['ADMIN', 'DISTRIBUTOR', 'RETAILER']);

  await requireTicketParticipant(ticketId, user);

  await prisma.ticket.update({
    where: {
      id: ticketId,
    },
    data: {
      status: 'CLOSED',
    },
  });

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/distributor/support/${ticketId}`);
  revalidatePath(`/retailer/tickets/${ticketId}`);

  revalidatePath('/admin/tickets');
  revalidatePath('/distributor/support');
  revalidatePath('/retailer/tickets');
}

export async function reopenTicketAction(ticketId: string) {
  const user = await requireUser(['ADMIN', 'DISTRIBUTOR', 'RETAILER']);

  await requireTicketParticipant(ticketId, user);

  await prisma.ticket.update({
    where: {
      id: ticketId,
    },
    data: {
      status: 'OPEN',
    },
  });

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath(`/distributor/support/${ticketId}`);
  revalidatePath(`/retailer/tickets/${ticketId}`);

  revalidatePath('/admin/tickets');
  revalidatePath('/distributor/support');
  revalidatePath('/retailer/tickets');
}