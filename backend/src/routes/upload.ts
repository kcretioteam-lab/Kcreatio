import { Router, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validateBody.js';

const router = Router();

const UploadSignatureSchema = z.object({
  imageBase64: z.string().min(10),
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
});

// POST /api/v1/upload/signature
// Accepts base64-encoded signature image, uploads to Supabase Storage, returns URL
router.post('/signature', authenticate, validateBody(UploadSignatureSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const { imageBase64, mimeType } = req.body;

  // Strip the data URL prefix if present
  const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  // Enforce 500KB limit
  if (buffer.length > 512000) {
    res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Signature image must be under 500KB', statusCode: 422 });
    return;
  }

  const ext = mimeType.split('/')[1];
  const fileName = `${req.userId!}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('invoice-signatures')
    .upload(fileName, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    // Bucket may not exist — return a graceful error
    res.status(500).json({
      error: 'UPLOAD_FAILED',
      message: `Upload failed: ${uploadError.message}. Ensure the 'invoice-signatures' bucket exists in Supabase Storage.`,
      statusCode: 500,
    });
    return;
  }

  const { data: urlData } = supabase.storage
    .from('invoice-signatures')
    .getPublicUrl(fileName);

  res.json({ url: urlData.publicUrl, path: fileName });
});

// POST /api/v1/upload/scanner
// Accepts base64-encoded UPI QR scanner image, uploads to Supabase Storage, returns URL
router.post('/scanner', authenticate, validateBody(UploadSignatureSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const { imageBase64, mimeType } = req.body;

  const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  if (buffer.length > 512000) {
    res.status(422).json({ error: 'VALIDATION_ERROR', message: 'Scanner image must be under 500KB', statusCode: 422 });
    return;
  }

  const ext = mimeType.split('/')[1];
  const fileName = `${req.userId!}/scanner_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('invoice-signatures')
    .upload(fileName, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    res.status(500).json({
      error: 'UPLOAD_FAILED',
      message: `Upload failed: ${uploadError.message}. Ensure the 'invoice-signatures' bucket exists in Supabase Storage.`,
      statusCode: 500,
    });
    return;
  }

  const { data: urlData } = supabase.storage
    .from('invoice-signatures')
    .getPublicUrl(fileName);

  res.json({ url: urlData.publicUrl, path: fileName });
});

export default router;
