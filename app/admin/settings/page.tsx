import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { getSettings } from '@/server/services/settings.service';
import { saveSettingsAction } from '@/server/actions/settings.actions';
import { BRAND } from '@/lib/brand.config';

export default async function AdminSettingsPage() {
  const s = await getSettings();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Platform-wide configuration. Branding lives in <code>lib/brand.config.ts</code> (currently “{BRAND.name}”).</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Platform Settings</CardTitle>
          <CardDescription>Controls what distributors may do and system behaviour.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveSettingsAction} className="grid max-w-2xl gap-5">
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="distributorCanSetRetailerPricing" defaultChecked={s.distributorCanSetRetailerPricing} /> Distributors may set retailer pricing</label>
            <div className="space-y-1.5">
              <Label htmlFor="maxRetailerMarkupPercent">Max retailer markup over distributor price (%)</Label>
              <Input id="maxRetailerMarkupPercent" name="maxRetailerMarkupPercent" type="number" step="0.01" defaultValue={s.maxRetailerMarkupPercent} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lowBalanceThreshold">Low-balance alert threshold</Label>
              <Input id="lowBalanceThreshold" name="lowBalanceThreshold" type="number" step="0.01" defaultValue={s.lowBalanceThreshold} />
            </div>
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="registrationOpen" defaultChecked={s.registrationOpen} /> Registration open</label>
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="maintenanceMode" defaultChecked={s.maintenanceMode} /> Maintenance mode</label>
            <div><Button type="submit">Save Settings</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
