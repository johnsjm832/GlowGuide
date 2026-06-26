export interface ProductInfo {
  name: string;
  brand?: string;
  ingredientsText?: string;
  imageUrl?: string | null;
  barcode: string;
}

export async function fetchProductByBarcode(barcode: string): Promise<ProductInfo | null> {
  try {
    const res = await fetch(`/api/product/barcode/${barcode}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
