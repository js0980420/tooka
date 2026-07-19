import { useState } from 'react';
import { toast } from 'sonner';
import { useLocale } from '@/lib/use-locale';
// PDF 匯出暫時停用：恢復時取消下方註解（含 exportPdf handler 與選單項）
// import { PdfProgressToast } from '../../components/pdf-progress-toast';
import { PngProgressToast } from '../../components/png-progress-toast';
// import { exportSlideAsPdf, isSafari } from '../../lib/export-pdf';
import { exportSlideAsPng } from '../../lib/export-png';
import type { PngExportVariant, SlideModule } from '../../lib/sdk';

export function usePngExport(
  slide: SlideModule | null,
  slideId: string,
  pages: SlideModule['default'],
) {
  const [exporting, setExporting] = useState(false);
  const t = useLocale();

  /* PDF 匯出暫時停用
  const exportPdf = async () => {
    if (!slide || exporting) return;
    if (isSafari()) {
      toast.error(t.slide.pdfExportSafariUnsupported, { duration: 5000 });
      return;
    }
    setExporting(true);
    const toastId = `pdf-export-${slideId}`;
    toast.custom(
      () => (
        <PdfProgressToast
          progress={{ phase: 'processing', current: 0, total: pages.length, percent: 0 }}
        />
      ),
      { id: toastId, duration: Infinity },
    );
    try {
      await exportSlideAsPdf(slide, slideId, (p) => {
        toast.custom(() => <PdfProgressToast progress={p} />, { id: toastId, duration: Infinity });
      });
    } catch (err) {
      console.error('[tooka] pdf export failed', err);
      toast.error(t.slide.pdfExportFailed, { id: toastId, duration: 4000 });
    } finally {
      setExporting(false);
      toast.dismiss(toastId);
    }
  };
  */

  const exportPng = async (variant?: PngExportVariant) => {
    if (!slide || exporting) return;
    setExporting(true);
    const toastId = `png-export-${slideId}-${variant?.id ?? 'default'}`;
    toast.custom(
      () => (
        <PngProgressToast
          progress={{ phase: 'processing', current: 0, total: pages.length, percent: 0 }}
        />
      ),
      { id: toastId, duration: Infinity },
    );
    try {
      await exportSlideAsPng(
        slide,
        slideId,
        (p) => {
          toast.custom(() => <PngProgressToast progress={p} />, {
            id: toastId,
            duration: Infinity,
          });
        },
        variant,
      );
    } catch (err) {
      console.error('[tooka] png export failed', err);
      toast.error(t.slide.pngExportFailed, { id: toastId, duration: 4000 });
    } finally {
      setExporting(false);
      toast.dismiss(toastId);
    }
  };

  return { exporting, exportPng };
}
