// Réduit une image (côté le plus long : maxSize px) et la renvoie en JPEG base64
export function compressImage(file: File, maxSize = 400, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error("Ce fichier n'est pas une image"));
    if (file.size > 10 * 1024 * 1024) return reject(new Error('Image trop lourde (10 Mo maximum)'));

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Impossible de traiter cette image'));

      ctx.fillStyle = '#ffffff'; // fond blanc pour les PNG transparents
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image illisible'));
    };
    img.src = url;
  });
}