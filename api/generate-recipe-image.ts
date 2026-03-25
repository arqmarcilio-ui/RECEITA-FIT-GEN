import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { getFirebaseAdmin } from './_firebase-admin.js';

const FOOD_PLACEHOLDER = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, description, ingredients, recipeId } = req.body;

  if (!title || !recipeId) {
    return res.status(400).json({ error: 'Title and recipeId are required' });
  }

  console.log(`[Image API] chamando geração para: ${title}`);

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const seed = Math.floor(Math.random() * 1000);
    const imagePrompt = `Professional food photography of ${title}. Description: ${description}. Ingredients: ${ingredients}. High quality, professional food styling, top view or restaurant presentation, detailed texture, 4k, appetizing, natural colors. No abstract art, no conceptual images, only real food and ingredients. Style #${seed}`;
    
    console.log(`[Image API] prompt enviado: ${imagePrompt}`);

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url",
    });

    const imageUrl = response.data[0].url;
    if (!imageUrl) {
      throw new Error("OpenAI returned no image URL");
    }

    console.log(`[Image API] sucesso - Imagem gerada pela OpenAI`);

    // Download image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image from OpenAI: ${imageResponse.statusText}`);
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Firebase Storage
    const { storage } = getFirebaseAdmin();
    const bucket = storage.bucket();
    const timestamp = Date.now();
    const fileName = `recipes/${recipeId}-${timestamp}.png`;
    const file = bucket.file(fileName);

    await file.save(buffer, {
      metadata: {
        contentType: 'image/png',
      },
      public: true,
    });

    // Get public URL
    // For Firebase Storage, the public URL format is:
    // https://storage.googleapis.com/[BUCKET_NAME]/[FILE_NAME]
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    console.log(`[Storage Upload] sucesso - Imagem salva em: ${fileName}`);
    console.log(`[Image Source] OpenAI`);

    return res.status(200).json({
      success: true,
      imageUrl: publicUrl,
      storagePath: fileName,
    });

  } catch (error: any) {
    console.error(`[Image API] erro:`, error);
    console.log(`[Image Source] Placeholder`);
    
    return res.status(200).json({
      success: false,
      imageUrl: FOOD_PLACEHOLDER,
      error: error.message || 'Unknown error',
    });
  }
}
