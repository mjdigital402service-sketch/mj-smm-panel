import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { NotificationsView } from '@/components/shared/notifications-view';
import { broadcastAnnouncementAction } from '@/server/actions/notification.actions';

export default function AdminNotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">Your notifications and system announcements.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Broadcast Announcement</CardTitle></CardHeader>
        <CardContent>
          <form action={broadcastAnnouncementAction} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5"><Label htmlFor="title">Title</Label><Input id="title" name="title" required /></div>
            <div className="space-y-1.5">
              <Label htmlFor="audience">Audience</Label>
              <select id="audience" name="audience" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option value="ALL">Everyone</option><option value="DISTRIBUTOR">Distributors</option><option value="RETAILER">Retailers</option>
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-3"><Label htmlFor="message">Message</Label><Input id="message" name="message" required /></div>
            <div><Button type="submit">Send</Button></div>
          </form>
        </CardContent>
      </Card>
      <NotificationsView />
    </div>
  );
}
