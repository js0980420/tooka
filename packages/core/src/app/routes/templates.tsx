import { LayoutTemplate } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocale } from '@/lib/use-locale';
import { TemplateDetail } from '../components/templates/template-detail';
import { TemplatesGallery } from '../components/templates/templates-gallery';
import { slideTemplates } from '../lib/slides';

export function TemplatesGalleryPage() {
  const navigate = useNavigate();
  const t = useLocale();
  return (
    <>
      <header className="mb-8 md:mb-12">
        <div className="flex flex-wrap items-center gap-2.5">
          <LayoutTemplate className="size-5 text-brand" />
          <h1 className="font-heading text-xl font-bold tracking-tight md:text-2xl">
            {t.templates.title}
          </h1>
          <span className="folio ml-1">{slideTemplates.length.toString().padStart(2, '0')}</span>
        </div>
      </header>
      <TemplatesGallery onOpen={(id) => navigate(`/templates/${encodeURIComponent(id)}`)} />
    </>
  );
}

export function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  if (!templateId) return null;
  return <TemplateDetail templateId={templateId} onBack={() => navigate('/templates')} />;
}
