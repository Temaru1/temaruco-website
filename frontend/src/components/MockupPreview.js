import React, { useEffect, useRef, useState } from 'react';

const MockupPreview = ({ designImage, clothingItem, printType }) => {
  const canvasRef = useRef(null);
  const [processedImage, setProcessedImage] = useState(null);

  // Mockup templates for different clothing items
  const mockupTemplates = {
    'T-Shirt': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?crop=entropy&cs=srgb&fm=jpg&q=85',
    'Polo': 'https://images.unsplash.com/photo-1586790170083-2f9ceadc732d?crop=entropy&cs=srgb&fm=jpg&q=85',
    'Hoodie': 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?crop=entropy&cs=srgb&fm=jpg&q=85',
    'Agbada': 'https://images.unsplash.com/photo-1752343927726-20ae2eb8432b?crop=entropy&cs=srgb&fm=jpg&q=85',
    'Senator Wear': 'https://images.unsplash.com/photo-1579710754366-bb9665344096?crop=entropy&cs=srgb&fm=jpg&q=85',
    'Kaftan': 'https://images.unsplash.com/photo-1632427511068-81a8a19890d7?crop=entropy&cs=srgb&fm=jpg&q=85',
    'Ankara Dress': 'https://images.unsplash.com/photo-1663044023009-cfdb6dd6b89c?crop=entropy&cs=srgb&fm=jpg&q=85',
    'Bubu Dress': 'https://images.unsplash.com/photo-1663044023009-cfdb6dd6b89c?crop=entropy&cs=srgb&fm=jpg&q=85',
    'Dashiki': 'https://images.unsplash.com/photo-1680345575812-2f6878d7d775?crop=entropy&cs=srgb&fm=jpg&q=85',
  };

  // Remove white background from image
  const removeWhiteBackground = (img) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Remove white and near-white pixels
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Check if pixel is white or near-white (threshold: 240)
      if (r > 240 && g > 240 && b > 240) {
        data[i + 3] = 0; // Set alpha to 0 (transparent)
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
  };

  useEffect(() => {
    if (!designImage) {
      setProcessedImage(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const processed = removeWhiteBackground(img);
      setProcessedImage(processed);
    };
    img.src = designImage;
  }, [designImage]);

  useEffect(() => {
    if (!processedImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const mockupUrl = mockupTemplates[clothingItem] || mockupTemplates['T-Shirt'];

    // Load mockup template
    const mockupImg = new Image();
    mockupImg.crossOrigin = 'anonymous';
    mockupImg.onload = () => {
      canvas.width = 400;
      canvas.height = 500;

      // Draw mockup template
      ctx.drawImage(mockupImg, 0, 0, canvas.width, canvas.height);

      // Load and draw design overlay
      const designImg = new Image();
      designImg.crossOrigin = 'anonymous';
      designImg.onload = () => {
        // Calculate design position based on print type
        let x, y, width, height;

        if (printType === 'front' || printType === 'front_back') {
          // Front print area (center chest)
          width = 150;
          height = 150;
          x = (canvas.width - width) / 2;
          y = 180;
        } else if (printType === 'embroidery') {
          // Embroidery area (smaller, upper left)
          width = 80;
          height = 80;
          x = 80;
          y = 150;
        } else {
          // Default center
          width = 150;
          height = 150;
          x = (canvas.width - width) / 2;
          y = 180;
        }

        // Draw design with transparency
        ctx.globalAlpha = 0.9;
        ctx.drawImage(designImg, x, y, width, height);
        ctx.globalAlpha = 1.0;

        // Add text label
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
        ctx.fillStyle = 'white';
        ctx.font = '14px Manrope, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${clothingItem} - ${printType} print`, canvas.width / 2, canvas.height - 15);
      };
      designImg.src = processedImage;
    };
    mockupImg.src = mockupUrl;
  }, [processedImage, clothingItem, printType]);

  if (!designImage) {
    return (
      <div className="bg-zinc-100 rounded-lg p-8 text-center" data-testid="mockup-placeholder">
        <p className="text-zinc-600 font-manrope">Upload a design to see mockup preview</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 border border-zinc-200" data-testid="mockup-preview">
      <h3 className="font-oswald text-lg font-semibold mb-4">Design Preview</h3>
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto rounded-lg shadow-lg"
          style={{ maxHeight: '500px' }}
        />
      </div>
      <p className="text-sm text-zinc-600 text-center mt-4 font-manrope">
        {printType === 'none' ? 'No print selected' : `Preview shows ${printType} print placement`}
      </p>
      <p className="text-xs text-zinc-500 text-center mt-2 font-manrope italic">
        * White backgrounds automatically removed
      </p>
    </div>
  );
};

export default MockupPreview;
