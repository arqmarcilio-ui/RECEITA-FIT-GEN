import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { getFirebaseAdmin } from './_firebase-admin.js';

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 2000): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, description, ingredients, recipeId } = req.body;

  if (!title || !recipeId) {
    return res.status(400).json({ error: 'Title and recipeId are required' });
  }

  console.log(`[Image API] chamando geração para: ${title}`);
  const startTime = Date.now();

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const seed = Math.floor(Math.random() * 1000);

    // 🔥 Prompt otimizado (menos pesado = mais rápido)
    const imagePrompt = `Realistic food photography of ${title}. ${description}. Ingredients: ${ingredients}. Natural lighting, appetizing, restaurant style presentation. No abstract or artistic styles. Style #${seed}`;
    
    console.log(`[OpenAI Prompt] ${imagePrompt}`);

    const response = await withRetry(() =>
      openai.images.generate({
        model: "gpt-image-1",
        prompt: imagePrompt,
        size: "1024x1024",
        quality: "medium" // 🔥 melhora tempo de geração
      })
    );

    const openaiTime = Date.now();
    console.log(`[Image API] OpenAI levou ${openaiTime - startTime}ms`);

    let buffer: Buffer;

    if (response.data[0].b64_json) {
      // 🔥 já usa base64 direto (mais rápido que baixar URL)
      buffer = Buffer.from(response.data[0].b64_json, 'base64');
    } else if (response.data[0].url) {
      const imageResponse = await fetch(response.data[0].url);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.statusText}`);
      }
      const arrayBuffer = await imageResponse.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      throw new Error("OpenAI returned no image data");
    }

    console.log(`[Image API] sucesso - Imagem gerada`);

    const downloadTime = Date.now();
    console.log(`[Image API] Processamento levou ${downloadTime - openaiTime}ms`);

    const { storage } = getFirebaseAdmin();
    const bucket = storage.bucket();

    console.log(`[Storage Upload] usando bucket: ${bucket.name}`);
    const timestamp = Date.now();

    // 🔥 agora salva como JPG (mais leve)
    const fileName = `recipes/${recipeId}-${timestamp}.jpg`;
    const file = bucket.file(fileName);

    await file.save(buffer, {
      metadata: {
        contentType: 'image/jpeg', // 🔥 mais leve que PNG
      },
      resumable: false,
    });

    const uploadTime = Date.now();
    console.log(`[Image API] Upload levou ${uploadTime - downloadTime}ms`);

    const { getDownloadURL } = await import('firebase-admin/storage');
    const publicUrl = await getDownloadURL(file);

    const finalTime = Date.now();
    console.log(`[Image API] Total: ${finalTime - startTime}ms`);

    return res.status(200).json({
      success: true,
      imageUrl: publicUrl,
      storagePath: fileName,
    });

  } catch (error: any) {
    console.error(`[Image API] erro:`, error);
    
    return res.status(200).json({
      success: false,
      imageUrl: '',
      error: error.message || 'Unknown error',
    });
  }
}
