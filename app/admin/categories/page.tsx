import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createCategoryAction } from '@/server/actions/catalog.actions';
import { CategoryToggle } from './category-toggle';

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { services: true } } },
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">Group services into browsable categories.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Add Category</CardTitle></CardHeader>
        <CardContent>
          <form action={createCategoryAction} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Category name</Label>
              <Input id="name" name="name" placeholder="e.g. Instagram Followers" required />
            </div>
            <Button type="submit">Add</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All Categories ({categories.length})</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c._count.services} services</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={c.isActive ? 'success' : 'destructive'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                <CategoryToggle id={c.id} isActive={c.isActive} />
              </div>
            </div>
          ))}
          {categories.length === 0 && <p className="py-6 text-center text-muted-foreground">No categories yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
