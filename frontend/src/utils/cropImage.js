export const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

export async function getCroppedImg(
    imageSrc,
    pixelCrop,
    maxWidth = 400,
    maxHeight = 400,
    quality = 0.8
) {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return null;
    }

    // Set size to crop size
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Draw cropped image onto canvas
    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    // Compress to smaller size if needed
    let outputCanvas = canvas;
    if (pixelCrop.width > maxWidth || pixelCrop.height > maxHeight) {
        const scale = Math.min(maxWidth / pixelCrop.width, maxHeight / pixelCrop.height);
        outputCanvas = document.createElement('canvas');
        outputCanvas.width = pixelCrop.width * scale;
        outputCanvas.height = pixelCrop.height * scale;
        const outCtx = outputCanvas.getContext('2d');
        outCtx.drawImage(canvas, 0, 0, outputCanvas.width, outputCanvas.height);
    }

    return new Promise((resolve) => {
        outputCanvas.toBlob(
            (blob) => {
                if (!blob) {
                    console.error('Canvas is empty');
                    return;
                }
                blob.name = 'cropped.jpg';
                // create a File from the Blob
                const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
                resolve(file);
            },
            'image/jpeg',
            quality
        );
    });
}
