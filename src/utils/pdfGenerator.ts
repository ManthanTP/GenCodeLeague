import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { supabase } from '../lib/supabase';

/**
 * Generates an A4 landscape PDF from a DOM element.
 * Returns the jsPDF instance and PDF Blob.
 */
export async function generateCertificatePdfBlob(
  element: HTMLElement,
  certificateId: string
): Promise<{ blob: Blob; doc: jsPDF }> {
  // Capture high-DPI canvas
  const canvas = await html2canvas(element, {
    scale: 2, // 2x for sharp 300+ DPI equivalent rendering
    useCORS: true,
    logging: false,
    backgroundColor: '#050811',
    windowWidth: 1000,
    windowHeight: 707,
  });

  const imgData = canvas.toDataURL('image/png', 1.0);

  // A4 Landscape dimensions in mm: 297mm x 210mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = doc.internal.pageSize.getWidth();
  const pdfHeight = doc.internal.pageSize.getHeight();

  doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

  const blob = doc.output('blob');
  return { blob, doc };
}

/**
 * Uploads a generated PDF to Supabase Storage bucket 'certificates'
 * and returns the public URL.
 */
export async function uploadCertificatePdf(
  certificateId: string,
  pdfBlob: Blob
): Promise<string | null> {
  try {
    const filePath = `${certificateId}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.warn('Storage upload error (fallback to local download):', uploadError);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from('certificates')
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.error('Failed to upload certificate PDF to Supabase Storage:', err);
    return null;
  }
}

/**
 * Downloads a generated certificate PDF directly to the client browser.
 */
export async function downloadCertificatePdf(
  element: HTMLElement,
  certificateId: string
): Promise<void> {
  const { doc } = await generateCertificatePdfBlob(element, certificateId);
  doc.save(`${certificateId}.pdf`);
}
