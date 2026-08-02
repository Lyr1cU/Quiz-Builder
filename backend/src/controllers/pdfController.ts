import { NextFunction, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { buildQuizPdf, type PdfVariant } from '../services/pdfExportService';

export async function exportPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const variantRaw = String(req.query.variant || '');
    if (variantRaw !== 'worksheet' && variantRaw !== 'answers') {
      throw new AppError('Query variant must be "worksheet" or "answers"', 400);
    }
    const variant = variantRaw as PdfVariant;

    const { buffer, filename } = await buildQuizPdf(req.params.id, variant, req.user?.id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
