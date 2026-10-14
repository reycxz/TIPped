export async function compressImage(file, maxSize = 1600, quality = 0.8) {
  let image;
  let objectUrl;

  try {
    if (typeof createImageBitmap === 'function') {
      try {
        image = await createImageBitmap(file);
      } catch {
        // Fall back to an HTMLImageElement for browsers that cannot decode this file as a bitmap.
      }
    }

    if (!image && typeof Image !== 'undefined') {
      objectUrl = URL.createObjectURL(file);
      image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error('Image decoding failed'));
        element.src = objectUrl;
      });
    }

    if (!image) return file;

    const width = image.width || image.naturalWidth;
    const height = image.height || image.naturalHeight;
    if (!width || !height) return file;

    const scale = Math.min(1, maxSize / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image compression is unavailable in this browser.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => result
          ? resolve(result)
          : reject(new Error('Image compression failed. Please try another photo.')),
        'image/jpeg',
        quality
      );
    });
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
  } catch (error) {
    if (error?.message === 'Image decoding failed' || !image) return file;
    throw error;
  } finally {
    if (image && typeof image.close === 'function') image.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
