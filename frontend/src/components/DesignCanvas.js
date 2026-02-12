import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer } from 'react-konva';
import { Move, ZoomIn, ZoomOut } from 'lucide-react';

const DesignCanvas = ({ 
  designImage, 
  printSize = 'Small', 
  onPositionChange, 
  mockupImageUrl = '/api/placeholder/400/500' 
}) => {
  const [image, setImage] = useState(null);
  const [mockupImg, setMockupImg] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const imageRef = useRef(null);
  const transformerRef = useRef(null);
  const [imagePosition, setImagePosition] = useState({ x: 200, y: 150 });
  const [imageScale, setImageScale] = useState(1);

  const canvasWidth = 500;
  const canvasHeight = 600;

  // Print size to scale mapping (as percentage of canvas width)
  const printSizeScales = {
    'Small': 0.20,      // 20% width
    'Medium': 0.35,     // 35% width
    'Large': 0.50,      // 50% width
    'Full Front': 0.70  // 70% width
  };

  // Load mockup background (t-shirt template)
  useEffect(() => {
    const mockup = new window.Image();
    mockup.crossOrigin = 'anonymous';
    mockup.src = mockupImageUrl;
    mockup.onload = () => {
      setMockupImg(mockup);
    };
  }, [mockupImageUrl]);

  // Load design image
  useEffect(() => {
    if (designImage) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      
      if (typeof designImage === 'string') {
        img.src = designImage;
      } else {
        // If it's a File object, create object URL
        const url = URL.createObjectURL(designImage);
        img.src = url;
      }
      
      img.onload = () => {
        setImage(img);
        // Auto-scale based on print size
        const targetWidth = canvasWidth * (printSizeScales[printSize] || 0.35);
        const scale = targetWidth / img.width;
        setImageScale(scale);
        
        // Center the image
        setImagePosition({
          x: (canvasWidth - img.width * scale) / 2,
          y: (canvasHeight - img.height * scale) / 2
        });
      };
    }
  }, [designImage, printSize]);

  // Update transformer when image is selected
  useEffect(() => {
    if (selectedId && transformerRef.current && imageRef.current) {
      transformerRef.current.nodes([imageRef.current]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [selectedId]);

  // Notify parent of position/scale changes
  useEffect(() => {
    if (onPositionChange) {
      onPositionChange({
        x: imagePosition.x,
        y: imagePosition.y,
        scale: imageScale,
        scalePercentage: (printSizeScales[printSize] || 0.35) * 100
      });
    }
  }, [imagePosition, imageScale, printSize]);

  const handleDragEnd = (e) => {
    setImagePosition({
      x: e.target.x(),
      y: e.target.y()
    });
  };

  const handleTransformEnd = (e) => {
    const node = imageRef.current;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and adjust width/height
    node.scaleX(1);
    node.scaleY(1);
    
    setImageScale(scaleX);
    setImagePosition({
      x: node.x(),
      y: node.y()
    });
  };

  const handleZoomIn = () => {
    setImageScale(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setImageScale(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleReset = () => {
    if (image) {
      const targetWidth = canvasWidth * (printSizeScales[printSize] || 0.35);
      const scale = targetWidth / image.width;
      setImageScale(scale);
      setImagePosition({
        x: (canvasWidth - image.width * scale) / 2,
        y: (canvasHeight - image.height * scale) / 2
      });
    }
  };

  const checkDeselect = (e) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedId(null);
    }
  };

  return (
    <div className="design-canvas-container">
      <div className="mb-4 flex gap-2 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={handleZoomIn}
            className="btn-outline flex items-center gap-2 px-3 py-2"
            data-testid="zoom-in-btn"
          >
            <ZoomIn size={18} />
            Zoom In
          </button>
          <button
            onClick={handleZoomOut}
            className="btn-outline flex items-center gap-2 px-3 py-2"
            data-testid="zoom-out-btn"
          >
            <ZoomOut size={18} />
            Zoom Out
          </button>
          <button
            onClick={handleReset}
            className="btn-outline px-3 py-2"
            data-testid="reset-position-btn"
          >
            Reset Position
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <Move size={16} />
          <span>Drag to move • Click and drag corners to resize</span>
        </div>
      </div>

      <div className="border-2 border-zinc-300 rounded-lg overflow-hidden bg-zinc-100">
        <Stage
          width={canvasWidth}
          height={canvasHeight}
          onMouseDown={checkDeselect}
          onTouchStart={checkDeselect}
        >
          <Layer>
            {/* Mockup background (t-shirt) */}
            {mockupImg && (
              <KonvaImage
                image={mockupImg}
                width={canvasWidth}
                height={canvasHeight}
                listening={false}
              />
            )}
            
            {/* Design image */}
            {image && (
              <>
                <KonvaImage
                  ref={imageRef}
                  image={image}
                  x={imagePosition.x}
                  y={imagePosition.y}
                  scaleX={imageScale}
                  scaleY={imageScale}
                  draggable
                  onClick={() => setSelectedId('design')}
                  onTap={() => setSelectedId('design')}
                  onDragEnd={handleDragEnd}
                  onTransformEnd={handleTransformEnd}
                />
                {selectedId === 'design' && (
                  <Transformer
                    ref={transformerRef}
                    boundBoxFunc={(oldBox, newBox) => {
                      // Limit resize
                      if (newBox.width < 20 || newBox.height < 20) {
                        return oldBox;
                      }
                      return newBox;
                    }}
                  />
                )}
              </>
            )}
          </Layer>
        </Stage>
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-900">
          <strong>Print Size: {printSize}</strong> ({Math.round((printSizeScales[printSize] || 0.35) * 100)}% of shirt width)
        </p>
        <p className="text-xs text-blue-700 mt-1">
          Design will be scaled automatically based on selected print size. You can adjust position and fine-tune size using the controls above.
        </p>
      </div>
    </div>
  );
};

export default DesignCanvas;
