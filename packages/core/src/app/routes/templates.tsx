import { useNavigate, useParams } from 'react-router-dom';
import { useLocale } from '@/lib/use-locale';
import { FolderIconChip } from '../components/sidebar/folder-item';
import { TemplateDetail } from '../components/templates/template-detail';
import { TemplatesGallery } from '../components/templates/templates-gallery';
import { slideTemplates } from '../lib/slides';

export function TemplatesGalleryPage() {
  const navigate = useNavigate();
  const t = useLocale();
  return (
    <>
      <header className="mb-8 md:mb-12">
        <div className="flex flex-wrap items-center gap-3">
          <FolderIconChip icon={{ type: 'emoji', value: '🎨' }} className="size-7 text-2xl" />
          <h1 className="font-heading text-[32px] font-semibold leading-[1.05] tracking-[-0.025em] md:text-[44px]">
            {t.templates.title}
          </h1>
          <span className="folio ml-1 self-end pb-2">
            {slideTemplates.length.toString().padStart(2, '0')}
          </span>
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
