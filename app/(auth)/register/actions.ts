'use server';

import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { createUserSchema } from '@/lib/validations/auth';
import { getSettings } from '@/server/services/settings.service';
import { recordAudit } from '@/server/services/audit.service';

export interface RegisterState {
  error?: string;
  success?: string;
}

export async function registerAction(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  try {
    const settings = await getSettings();

    if (!settings.registrationOpen) {
      return {
        error: 'Registration is currently closed. Please contact support.',
      };
    }

    const parsed = createUserSchema.safeParse({
      name: formData.get('name'),
      username: formData.get('username'),
      email: String(formData.get('email') ?? '').trim().toLowerCase(),
      phone: String(formData.get('phone') ?? '').trim() || undefined,
      password: formData.get('password'),
    });

    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? 'Invalid registration details.',
      };
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: parsed.data.username },
          { email: parsed.data.email },
        ],
      },
      select: {
        username: true,
        email: true,
      },
    });

    if (existingUser) {
      return {
        error:
          existingUser.username === parsed.data.username
            ? 'This username is already taken.'
            : 'This email address is already registered.',
      };
    }

    const passwordHash = await hashPassword(parsed.data.password);

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name.trim(),
        username: parsed.data.username,
        email: parsed.data.email,
        phone: parsed.data.phone,
        passwordHash,
        role: 'RETAILER',
        status: 'PENDING',
        distributorId: null,
        wallet: {
          create: {
            balance: 0,
          },
        },
      },
      select: {
        id: true,
      },
    });

    try {
      await recordAudit({
        action: 'REGISTRATION_SUBMITTED',
        entityType: 'User',
        entityId: user.id,
      });
    } catch (auditError) {
      console.error('Registration audit logging failed:', auditError);
    }

    return {
      success:
        'Registration submitted successfully. Your account is waiting for administrator approval.',
    };
  } catch (error) {
    console.error('Registration failed:', error);

    return {
      error: 'Registration could not be completed. Please try again or contact support.',
    };
  }
}