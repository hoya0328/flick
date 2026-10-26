// Local-only decode/resize. No paid image service and no original/EXIF upload.
export async function pickCorePhoto(): Promise<Blob | null> {
  const file = await new Promise<File | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp';
    input.onchange = () => { resolve(input.files?.[0] ?? null); input.remove(); };
    input.oncancel = () => { resolve(null); input.remove(); };
    input.click();
  });
  if (!file) return null;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error('JPG·PNG·WebP 사진을 8MB 이내로 선택해 주세요.');
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve,reject) => { const img = new Image(); img.onload=()=>resolve(img); img.onerror=()=>reject(new Error('사진을 읽지 못했어요. 다른 사진을 선택해 주세요.')); img.src=url; });
    if (image.width * image.height > 40_000_000) throw new Error('사진 해상도가 너무 커요. 작은 사진을 선택해 주세요.');
    const canvas = document.createElement('canvas');
    const ratio = Math.min(1,1280 / Math.max(image.width,image.height));
    canvas.width=Math.round(image.width*ratio); canvas.height=Math.round(image.height*ratio);
    const context=canvas.getContext('2d');
    if (!context) throw new Error('이 브라우저에서는 사진을 준비할 수 없어요.');
    context.fillStyle='#ffffff'; context.fillRect(0,0,canvas.width,canvas.height); context.drawImage(image,0,0,canvas.width,canvas.height);
    for (const quality of [0.85,0.7,0.55,0.4,0.25]) {
      const blob=await new Promise<Blob|null>((resolve)=>canvas.toBlob(resolve,'image/jpeg',quality));
      if (blob && blob.size<=250000) return blob;
    }
    throw new Error('무료 저장 제한에 맞추기 어려운 사진이에요. 더 작은 사진을 선택해 주세요.');
  } finally { URL.revokeObjectURL(url); }
}
