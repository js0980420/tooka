import { useLocale } from '@/lib/use-locale';
import { AssetView } from '../components/asset-view';
import { PageTabs } from '../components/page-tabs';

export function AssetsPage() {
  const t = useLocale();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AssetView
        slideId={null}
        headerTabs={
          <PageTabs
            tabs={[
              { label: t.home.slides, path: '/' },
              { label: t.home.assets, path: '/assets' },
            ]}
          />
        }
      />
    </div>
  );
}
