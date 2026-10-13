import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import RegistrationReviewActions from '@/components/shared/registration-review-actions';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q?.trim();

  const users = await prisma.user.findMany({
    where: query
      ? {
          OR: [
            {
              name: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              username: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
        }
      : {},
    include: {
      distributor: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 200,
  });

  const pendingRetailers = users.filter(
    (user) => user.role === 'RETAILER' && user.status === 'PENDING',
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Users
        </h1>

        <p className="text-sm text-muted-foreground">
          Every account on the platform.
        </p>
      </div>

      {pendingRetailers > 0 && (
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="font-medium">
                Pending retailer registrations
              </p>
              <p className="text-sm text-muted-foreground">
                {pendingRetailers} retailer
                {pendingRetailers === 1 ? '' : 's'} awaiting review
                in the current results.
              </p>
            </div>

            <Badge variant="destructive">
              {pendingRetailers} Pending
            </Badge>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <form className="flex gap-2">
            <input
              name="q"
              defaultValue={query}
              placeholder="Search name, username or emailâ€¦"
              className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
            />

            <button
              type="submit"
              className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Search
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{users.length} users</CardTitle>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Role</th>
                <th className="pb-2 pr-4 font-medium">Distributor</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium">Last login</th>
                <th className="pb-2 font-medium">Registration review</th>
              </tr>
            </thead>

            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-3 pr-4">
                    <p className="font-medium">{u.name}</p>

                    <p className="text-xs text-muted-foreground">
                      @{u.username} Â· {u.email}
                    </p>
                  </td>

                  <td className="py-3 pr-4 text-xs">
                    {u.role}
                  </td>

                  <td className="py-3 pr-4 text-xs">
                    {u.distributor?.name ?? 'â€”'}
                  </td>

                  <td className="py-3 pr-4">
                    <Badge
                      variant={
                        u.status === 'ACTIVE'
                          ? 'success'
                          : 'destructive'
                      }
                    >
                      {u.status}
                    </Badge>
                  </td>

                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {u.lastLoginAt?.toLocaleString() ?? 'Never'}
                  </td>

                  <td className="py-3">
                    {u.role === 'RETAILER' && u.status === 'PENDING' ? (
                      <RegistrationReviewActions userId={u.id} />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        â€”
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
