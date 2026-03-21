
import { RecipeResult } from '../types';

/**
 * Safely saves data to localStorage, handling QuotaExceededError.
 * If the quota is exceeded, it tries to prune the data by:
 * 1. Removing images from older items.
 * 2. Reducing the number of items.
 */
export const safeSaveToLocalStorage = (key: string, data: any[], maxItems: number = 20) => {
  try {
    // Limit items first
    const limitedData = data.slice(0, maxItems);
    localStorage.setItem(key, JSON.stringify(limitedData));
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.warn(`LocalStorage quota exceeded for key "${key}". Pruning data...`);
      
      try {
        // Strategy 1: Remove images from all but the most recent 3 items
        const prunedData = data.slice(0, maxItems).map((item, index) => {
          if (index >= 3 && item.imageUrl && item.imageUrl.startsWith('data:')) {
            // Fallback image único baseado no título para evitar repetição
            return { ...item, imageUrl: `https://picsum.photos/seed/${encodeURIComponent(item.title)}/800/600` };
          }
          return item;
        });
        localStorage.setItem(key, JSON.stringify(prunedData));
      } catch (innerError) {
        // Strategy 2: Remove ALL base64 images
        try {
          const noImageData = data.slice(0, maxItems).map(item => {
            if (item.imageUrl && item.imageUrl.startsWith('data:')) {
              return { ...item, imageUrl: undefined };
            }
            return item;
          });
          localStorage.setItem(key, JSON.stringify(noImageData));
        } catch (finalError) {
          // Strategy 3: Just save the most recent item
          try {
            localStorage.setItem(key, JSON.stringify(data.slice(0, 1)));
          } catch (lastError) {
            console.error("Failed to save even a single item to localStorage", lastError);
          }
        }
      }
    } else {
      console.error("Error saving to localStorage", error);
    }
  }
};
