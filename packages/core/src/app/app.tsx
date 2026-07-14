import config from 'virtual:open-cards/config';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { useLocale } from './lib/use-locale';
import { AssetsPage } from './routes/assets';
import { ConnectsPage } from './routes/connects';
import { Home } from './routes/home';
import { HomeShell } from './routes/home-shell';
import { Presenter } from './routes/presenter';
import { PromptsPage } from './routes/prompts';
import { PublishPage } from './routes/publish';
import { Slide } from './routes/slide';
import { TemplateDetailPage, TemplatesGalleryPage } from './routes/templates';
import { TutorialsPage } from './routes/tutorials';

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {config.build.showSlideBrowser ? (
          <Route element={<HomeShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/templates" element={<TemplatesGalleryPage />} />
            <Route path="/templates/:templateId" element={<TemplateDetailPage />} />
            <Route path="/assets" element={<AssetsPage />} />
            <Route path="/connects" element={<ConnectsPage />} />
            <Route path="/tutorials" element={<TutorialsPage />} />
            <Route path="/prompts" element={<PromptsPage />} />
            <Route path="/publish" element={<PublishPage />} />
          </Route>
        ) : (
          <Route path="/" element={<NotFound />} />
        )}
        <Route path="/s/:slideId" element={<Slide />} />
        <Route path="/s/:slideId/presenter" element={<Presenter />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

function NotFound() {
  const t = useLocale();
  return (
    <div className="grid h-screen place-items-center bg-background px-6 text-center text-foreground">
      <div>
        <p className="folio">{t.notFound.eyebrow}</p>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">
          {t.notFound.title}
        </h1>
      </div>
    </div>
  );
}
