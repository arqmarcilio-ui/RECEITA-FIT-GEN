import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';
import { getFirebaseAdmin } from './firebase-admin';

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
  const startTime = Date.now();

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const seed = Math.floor(Math.random() * 1000);
    const imagePrompt = `Professional food photography of ${title}. Description: ${description}. Ingredients: ${ingredients}. High quality, professional food styling, top view or restaurant presentation, detailed texture, 4k, appetizing, natural colors. No abstract art, no conceptual images, only real food and ingredients. Style #${seed}`;
    
    console.log(`[OpenAI Prompt] ${imagePrompt}`);

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url",
    });

    const openaiTime = Date.now();
    console.log(`[Image API] OpenAI levou ${openaiTime - startTime}ms`);

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

    const downloadTime = Date.now();
    console.log(`[Image API] Download levou ${downloadTime - openaiTime}ms`);

    // Use the bucket from Firebase Admin
    const { storage } = getFirebaseAdmin();
    // Use the default bucket configured in initializeApp
    const bucket = storage.bucket();

    console.log(`[Storage Upload] usando bucket: ${bucket.name}`);
    const timestamp = Date.now();
    const fileName = `recipes/${recipeId}-${timestamp}.png`;
    const file = bucket.file(fileName);

    try {
      await file.save(buffer, {
        metadata: {
          contentType: 'image/png',
        },
        resumable: false,
      });
    } catch (saveError: any) {
      console.error(`[Storage Upload] erro ao salvar arquivo no bucket ${bucket.name}:`, saveError);
      if (saveError.code) {
        console.error(`[Storage Upload] código do erro:`, saveError.code);
      }
      if (saveError.response) {
        console.error(`[Storage Upload] dados da resposta:`, JSON.stringify(saveError.response.data));
      }
      throw saveError;
    }

    const uploadTime = Date.now();
    console.log(`[Image API] Upload levou ${uploadTime - downloadTime}ms`);

    // Get public URL using getDownloadURL (more robust than ACL-based public:true)
    const { getDownloadURL } = await import('firebase-admin/storage');
    const publicUrl = await getDownloadURL(file);

    const finalTime = Date.now();
    console.log(`[Image API] Total: ${finalTime - startTime}ms`);

    console.log(`[Storage Upload] ${fileName}`);
    console.log(`[Image URL] ${publicUrl}`);
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
