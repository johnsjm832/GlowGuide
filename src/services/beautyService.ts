export interface ProductInfo {
  name: string;
  brand?: string;
  ingredientsText?: string;
  imageUrl?: string | null;
  barcode: string;
}

async function fetchWithTimeout(url: string, ms = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function tryOpenBeautyFacts(barcode: string): Promise<ProductInfo | null> {
  try {
    const res = await fetchWithTimeout(`https://world.openbeautyfacts.org/api/v2/product/${barcode}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 0 || !data.product) return null;
    const p = data.product;
    return {
      name: p.product_name || 'Unknown Product',
      brand: p.brands || undefined,
      ingredientsText: p.ingredients_text || '',
      imageUrl: p.image_url || null,
      barcode
    };
  } catch { return null; }
}

async function tryUpcItemDb(barcode: string): Promise<ProductInfo | null> {
  try {
    const res = await fetchWithTimeout(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
    if (!res.ok) return null;
    const data = await res.json();
    const item = data?.items?.[0];
    if (!item) return null;
    return {
      name: item.title || 'Unknown Product',
      brand: item.brand || undefined,
      ingredientsText: item.description || '',
      imageUrl: item.images?.[0] || null,
      barcode
    };
  } catch { return null; }
}

async function tryOpenFoodFacts(barcode: string): Promise<ProductInfo | null> {
  try {
    const res = await fetchWithTimeout(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 0 || !data.product) return null;
    const p = data.product;
    return {
      name: p.product_name || 'Unknown Product',
      brand: p.brands || undefined,
      ingredientsText: p.ingredients_text || '',
      imageUrl: p.image_url || null,
      barcode
    };
  } catch { return null; }
}

export async function fetchProductByBarcode(barcode: string): Promise<ProductInfo | null> {
  return (
    await tryOpenBeautyFacts(barcode) ||
    await tryUpcItemDb(barcode) ||
    await tryOpenFoodFacts(barcode) ||
    null
  );
}
