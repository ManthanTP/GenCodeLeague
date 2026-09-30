import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import CertificatePreview from '../components/CertificatePreview';
import type { Certificate, CertificateType } from '../types/certificates';

/**
 * Global certificate template image path.
 * This is the single official GCL certificate background.
 */
export const CERTIFICATE_TEMPLATE_PATH = '/gcl-certificate-template.png';

/**
 * Preloads the certificate template image into browser cache.
 * Call this early so PDF generation doesn't wait for image loading.
 */
export function preloadCertificateTemplate(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = CERTIFICATE_TEMPLATE_PATH;
  });
}

/**
 * Generates an A4 landscape PDF blob from a rendered certificate DOM element.
 * Uses 2x pixel ratio for crisp print-quality output.
 * Resets any active scale transform on the preview before capture.
 */
export async function generateCertificatePdfBlob(
  element: HTMLElement,
  _certificateId: string
): Promise<{ blob: Blob; doc: jsPDF }> {
  const targetNode =
    element.id === 'offscreen-render-cert' && element.firstElementChild
      ? (element.firstElementChild as HTMLElement)
      : element;

  // Temporarily reset any preview scale transform
  const prevTransform = targetNode.style.transform;
  const prevTransformOrigin = targetNode.style.transformOrigin;
  if (prevTransform && prevTransform.includes('scale')) {
    targetNode.style.transform = 'none';
  }

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(targetNode, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1000,
      windowHeight: 707,
    });
  } finally {
    targetNode.style.transform = prevTransform;
    targetNode.style.transformOrigin = prevTransformOrigin;
  }

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
 * Downloads a certificate PDF directly from an existing DOM element.
 * No Supabase upload — purely client-side.
 */
export async function downloadCertificatePdf(
  element: HTMLElement,
  certificateId: string
): Promise<void> {
  const { doc } = await generateCertificatePdfBlob(element, certificateId);
  doc.save(`${certificateId}.pdf`);
}

/**
 * Renders a certificate offscreen using React, captures it, and generates a PDF blob.
 * Does NOT upload to Supabase Storage.
 * Returns the blob for direct download or ZIP bundling.
 */
export async function renderCertificatePdfBlob(certData: {
  recipient_name: string;
  certificate_type: CertificateType;
  certificate_id: string;
  template_version: number;
  edition_id?: string;
  edition_name?: string;
  team_name?: string | null;
  achievement?: string | null;
  issued_at?: string;
  settings?: any;
}): Promise<Blob> {
  const offscreenContainer = document.createElement('div');
  offscreenContainer.style.position = 'fixed';
  offscreenContainer.style.left = '-9999px';
  offscreenContainer.style.top = '-9999px';
  offscreenContainer.style.width = '1000px';
  offscreenContainer.style.height = '707px';
  offscreenContainer.style.overflow = 'hidden';
  offscreenContainer.style.zIndex = '-9999';
  document.body.appendChild(offscreenContainer);

  const root = createRoot(offscreenContainer);

  try {
    root.render(
      createElement(CertificatePreview, {
        recipientName: certData.recipient_name,
        certificateType: certData.certificate_type,
        certificateId: certData.certificate_id,
        editionId: certData.edition_id,
        templateVersion: certData.template_version,
        editionName: certData.edition_name || 'GenCode League 2026',
        teamName: certData.team_name || null,
        achievement: certData.achievement || null,
        issuedAt: certData.issued_at,
        settings: certData.settings,
        scale: 1,
      })
    );

    // Allow time for QR code generation and image loading
    await new Promise((resolve) => setTimeout(resolve, 500));

    const renderedChild = offscreenContainer.firstElementChild as HTMLElement;
    if (!renderedChild) {
      throw new Error('Offscreen certificate container failed to render.');
    }

    const { blob } = await generateCertificatePdfBlob(
      renderedChild,
      certData.certificate_id
    );

    return blob;
  } finally {
    root.unmount();
    offscreenContainer.remove();
  }
}

/**
 * Downloads a certificate PDF for a given certificate record.
 * Attempts to use an existing DOM element first, falls back to offscreen rendering.
 * NO Supabase Storage upload — purely client-side generation and download.
 */
export async function downloadOrRegenerateCertificate(
  cert: Certificate,
  existingElement?: HTMLElement | null
): Promise<void> {
  // Strategy 1: If element already rendered in DOM, capture it directly
  const targetElement =
    existingElement ||
    document.getElementById(`certificate-${cert.certificate_id}`) ||
    document.getElementById(`offscreen-${cert.certificate_id}`);

  if (targetElement) {
    const { doc } = await generateCertificatePdfBlob(
      targetElement,
      cert.certificate_id
    );
    doc.save(`${cert.certificate_id}.pdf`);
    return;
  }

  // Strategy 2: Render offscreen and generate
  const blob = await renderCertificatePdfBlob({
    recipient_name: cert.recipient_name,
    certificate_type: cert.certificate_type,
    certificate_id: cert.certificate_id,
    template_version: cert.template_version,
    edition_id: cert.edition_id,
    edition_name: cert.edition?.name,
    team_name: cert.team?.name,
    achievement: cert.achievement,
    issued_at: cert.issued_at,
  });

  // Trigger download
  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = downloadUrl;
  anchor.download = `${cert.certificate_id}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  window.URL.revokeObjectURL(downloadUrl);
  document.body.removeChild(anchor);
}
