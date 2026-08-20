export type VariantOption = {
  id: string | number;
  size?: string;
  color?: string;
  stock?: number;
};

export function variantHasSizeStock(variants: VariantOption[], size: string): boolean {
  return variants.some((v) => v.size === size && Number(v.stock ?? 0) > 0);
}

export function variantHasColorStock(variants: VariantOption[], color: string): boolean {
  return variants.some((v) => v.color === color && Number(v.stock ?? 0) > 0);
}

/** Chọn variant theo size; giữ màu hiện tại nếu có tồn, không thì lấy màu đầu tiên còn hàng. */
export function pickVariantBySize(
  variants: VariantOption[],
  size: string,
  prefer?: Pick<VariantOption, 'size' | 'color'> | null,
): VariantOption | undefined {
  const inStock = variants.filter((v) => v.size === size && Number(v.stock ?? 0) > 0);
  if (prefer?.color) {
    const matched = inStock.find((v) => v.color === prefer.color);
    if (matched) return matched;
  }
  return inStock[0];
}

/** Chọn variant theo màu; giữ size hiện tại nếu có tồn, không thì lấy size đầu tiên còn hàng. */
export function pickVariantByColor(
  variants: VariantOption[],
  color: string,
  prefer?: Pick<VariantOption, 'size' | 'color'> | null,
): VariantOption | undefined {
  const inStock = variants.filter((v) => v.color === color && Number(v.stock ?? 0) > 0);
  if (prefer?.size) {
    const matched = inStock.find((v) => v.size === prefer.size);
    if (matched) return matched;
  }
  return inStock[0];
}
