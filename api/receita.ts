import type { VercelRequest, VercelResponse } from '@vercel/node';

const PROJECT_ID = firebaseConfig.projectId;
const DATABASE_ID = firebaseConfig.firestoreDatabaseId;

function parseFirestore(fields: any) {
  const result: any = {};
  for (const key in fields) {
    const valueObj = fields[key];
    const type = Object.keys(valueObj)[0];
    let value = valueObj[type];
    
    if (type === 'mapValue') {
      value = parseFirestore(value.fields);
    } else if (type === 'arrayValue') {
      value = (value.values || []).map((v: any) => {
        const innerType = Object.keys(v)[0];
        return innerType === 'mapValue' ? parseFirestore(v[innerType].fields) : v[innerType];
      });
    }
    result[key] = value;
  }
  return result;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).send('ID da receita não fornecido.');
  }

  try {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/recipes/${id}`;
    const response = await fetch(firestoreUrl);

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).send('Receita não encontrada.');
      }
      throw new Error(`Erro ao buscar receita: ${response.statusText}`);
    }

    const doc = await response.json();
    const recipe = parseFirestore(doc.fields);

    const title = recipe.title || 'Receita Fit';
    const description = recipe.description || 'Confira esta receita deliciosa e saudável!';
    
    // Use the recipe's image, or a unique fallback based on the recipe ID
    const imageUrl = recipe.imageUrl || `https://picsum.photos/seed/${id}/1200/630`;
    const ingredients = recipe.ingredients || [];
    const instructions = recipe.instructions || [];
    const macros = recipe.macros || { calories: 'N/A', protein: 'N/A', carbs: 'N/A', fats: 'N/A' };

    const imageMimeType = imageUrl.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | Receita Fit Gen</title>
    
    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://receita-fit-gen.vercel.app/receita/${id}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:secure_url" content="${imageUrl}">
    <meta property="og:image:type" content="${imageMimeType}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${title}">
    <meta property="og:locale" content="pt_BR">
    <meta property="og:site_name" content="Receita Fit Gen">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="https://receita-fit-gen.vercel.app/receita/${id}">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${imageUrl}">

    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #1a202c;
            background-color: #f7fafc;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .card {
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            overflow: hidden;
            margin-bottom: 20px;
        }
        .hero-image {
            width: 100%;
            height: 400px;
            object-fit: cover;
        }
        .content {
            padding: 24px;
        }
        h1 {
            margin-top: 0;
            color: #2d3748;
            font-size: 2rem;
        }
        .description {
            color: #4a5568;
            font-size: 1.1rem;
            margin-bottom: 24px;
        }
        .macros {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            background: #f0fff4;
            padding: 16px;
            border-radius: 12px;
            margin-bottom: 24px;
            text-align: center;
        }
        .macro-item span {
            display: block;
            font-size: 0.8rem;
            color: #2f855a;
            text-transform: uppercase;
            font-weight: bold;
        }
        .macro-item strong {
            font-size: 1.1rem;
            color: #22543d;
        }
        h2 {
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
            margin-top: 32px;
            color: #2d3748;
        }
        ul, ol {
            padding-left: 20px;
        }
        li {
            margin-bottom: 8px;
        }
        .btn {
            display: block;
            background: #48bb78;
            color: white;
            text-align: center;
            padding: 16px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: bold;
            font-size: 1.1rem;
            margin-top: 40px;
            transition: background 0.2s;
        }
        .btn:hover {
            background: #38a169;
        }
        .footer {
            text-align: center;
            color: #718096;
            font-size: 0.9rem;
            padding: 20px 0;
        }
        .preview-badge {
            background: #ebf8ff;
            color: #2b6cb0;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: bold;
            display: inline-block;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <img src="${imageUrl}" alt="${title}" class="hero-image">
            <div class="content">
                <div class="preview-badge">Preview Receita Fit</div>
                <h1>${title}</h1>
                <p class="description">${description}</p>
                
                <div class="macros">
                    <div class="macro-item">
                        <span>Calorias</span>
                        <strong>${macros.calories}</strong>
                    </div>
                    <div class="macro-item">
                        <span>Proteínas</span>
                        <strong>${macros.protein}</strong>
                    </div>
                    <div class="macro-item">
                        <span>Carbos</span>
                        <strong>${macros.carbs}</strong>
                    </div>
                    <div class="macro-item">
                        <span>Gorduras</span>
                        <strong>${macros.fats}</strong>
                    </div>
                </div>

                <h2>Ingredientes</h2>
                <ul>
                    ${ingredients.map((ing: string) => `<li>${ing}</li>`).join('')}
                </ul>

                <h2>Modo de Preparo</h2>
                <ol>
                    ${instructions.map((step: string) => `<li>${step}</li>`).join('')}
                </ol>

                <a href="https://receita-fit-gen.vercel.app/?id=${id}" class="btn">Abrir no App</a>
            </div>
        </div>
        <div class="footer">
            Gerado por Receita Fit Gen
        </div>
    </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).send(html);

  } catch (error) {
    console.error('Erro na função serverless:', error);
    return res.status(500).send('Erro interno ao carregar a receita.');
  }
}
