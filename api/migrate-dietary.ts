import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirebaseAdmin } from './_firebase-admin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const secret = req.headers['x-migration-secret'] || req.query.secret;
  if (secret !== 'fit-gen-retroclassify-2026') {
    return res.status(403).json({ error: 'Unauthorized: Invalid migration secret.' });
  }

  const { updates, dryRun } = req.body || {};

  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ error: 'Payload must contain a non-empty "updates" array.' });
  }

  const { db } = getFirebaseAdmin();
  const results = {
    total: updates.length,
    dryRun: !!dryRun,
    successCount: 0,
    failCount: 0,
    successfulIds: [] as string[],
    failed: [] as { documentId: string; error: string }[]
  };

  for (const item of updates) {
    const { documentId, dietaryFilters } = item;
    if (!documentId || !Array.isArray(dietaryFilters)) {
      results.failCount++;
      results.failed.push({ documentId: documentId || 'unknown', error: 'Invalid documentId or dietaryFilters format' });
      continue;
    }

    if (dryRun) {
      results.successCount++;
      results.successfulIds.push(documentId);
      continue;
    }

    try {
      const docRef = db.collection('public_recipes').doc(documentId);
      await docRef.update({ dietaryFilters });
      results.successCount++;
      results.successfulIds.push(documentId);
      console.log(`[Migrate] Doc ${documentId} atualizado com dietaryFilters:`, dietaryFilters);
    } catch (err: any) {
      console.error(`[Migrate] Erro ao atualizar doc ${documentId}:`, err);
      results.failCount++;
      results.failed.push({ documentId, error: err.message || String(err) });
    }
  }

  return res.status(200).json({
    success: true,
    ...results
  });
}
