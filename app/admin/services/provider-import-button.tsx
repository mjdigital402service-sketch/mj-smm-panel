'use client';

import { useState, useTransition } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { importProviderServicesAction } from '@/server/actions/catalog.actions';

type Props = {
  providerId: string;
  providerName: string;
};

export function ProviderImportButton({
  providerId,
  providerName,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  const handleImport = () => {
    setMessage('');

    startTransition(async () => {
      try {
        const result = await importProviderServicesAction(providerId);

        setMessage(
          `Imported: ${result.imported}, Updated: ${result.updated}, Total: ${result.total}`,
        );
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : 'Failed to import provider services.',
        );
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        onClick={handleImport}
        disabled={isPending}
        className="gap-2 bg-blue-600 hover:bg-blue-700"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}

        {isPending
          ? 'Importing...'
          : `Import ${providerName} Services`}
      </Button>

      {message && (
        <p className="max-w-xs text-right text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );
}