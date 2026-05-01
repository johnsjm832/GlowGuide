
export interface ProductInfo {
  name: string;
  brand?: string;
  ingredientsText?: string;
  imageUrl?: string;
  barcode: string;
}

export async function fetchProductByBarcode(barcode: string): Promise<ProductInfo | null> {
  try {
    const response = await fetch(`https://world.openbeautyfacts.org/api/v2/product/${barcode}.json`);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.status === 0 || !data.product) return null;
    
    const product = data.product;
    return {
      name: product.product_name || 'Unknown Product',
      brand: product.brands || 'Unknown Brand',
      ingredientsText: product.ingredients_text || '',
      imageUrl: product.image_url || null,
      barcode: barcode
    };
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}
