import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect } from 'react-konva';
import { ArrowLeft, Upload, Type, Download, Trash2, RotateCcw, ZoomIn, ZoomOut, ShoppingCart, Check } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useCurrency } from '../contexts/CurrencyContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Product catalog (same as PrintOnDemandPage)
const POD_PRODUCTS = {
  tshirt: {
    id: 'tshirt', name: 'T-Shirt', basePrice: 5000,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600',
    colors: ['White', 'Black', 'Navy', 'Grey', 'Red'],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    printArea: { x: 150, y: 80, width: 200, height: 250 }
  },
  hoodie: {
    id: 'hoodie', name: 'Hoodie', basePrice: 15000,
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600',
    colors: ['Black', 'Grey', 'Navy', 'White'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    printArea: { x: 140, y: 100, width: 220, height: 220 }
  },
  polo: {
    id: 'polo', name: 'Polo Shirt', basePrice: 8000,
    image: 'https://images.unsplash.com/photo-1625910513413-5fc4e5b6bc2b?w=600',
    colors: ['White', 'Black', 'Navy', 'Red', 'Blue'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    printArea: { x: 160, y: 90, width: 180, height: 200 }
  },
  joggers: {
    id: 'joggers', name: 'Joggers', basePrice: 12000,
    image: 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=600',
    colors: ['Black', 'Grey', 'Navy'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    printArea: { x: 80, y: 150, width: 100, height: 150 }
  },
  varsity: {
    id: 'varsity', name: 'Varsity Jacket', basePrice: 25000,
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600',
    colors: ['Black/White', 'Navy/White', 'Red/White'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    printArea: { x: 130, y: 80, width: 240, height: 280 }
  },
  tank: {
    id: 'tank', name: 'Tank Top', basePrice: 4000,
    image: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=600',
    colors: ['White', 'Black', 'Grey'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    printArea: { x: 150, y: 60, width: 200, height: 220 }
  },
  sweatshirt: {
    id: 'sweatshirt', name: 'Sweatshirt', basePrice: 12000,
    image: 'https://images.unsplash.com/photo-1578768079052-aa76e52ff62e?w=600',
    colors: ['Black', 'Grey', 'Navy', 'Cream'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    printArea: { x: 140, y: 90, width: 220, height: 230 }
  },
  cap: {
    id: 'cap', name: 'Baseball Cap', basePrice: 3500,
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600',
    colors: ['Black', 'White', 'Navy', 'Red'],
    sizes: ['One Size'],
    printArea: { x: 170, y: 100, width: 160, height: 100 }
  }
};

const COLOR_HEX = {
  'White': '#FFFFFF', 'Black': '#1a1a1a', 'Navy': '#1e3a5f', 'Grey': '#6b7280',
  'Red': '#dc2626', 'Blue': '#2563eb', 'Cream': '#fef3c7',
  'Black/White': '#1a1a1a', 'Navy/White': '#1e3a5f', 'Red/White': '#dc2626'
};

const PrintOnDemandDesignPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { formatPrice } = useCurrency();
  
  const stageRef = useRef(null);
  const fileInputRef = useRef(null);
  const transformerRef = useRef(null);
  
  // Get product from URL params or redirect
  const product = POD_PRODUCTS[productId];
  
  const [selectedColor, setSelectedColor] = useState(product?.colors[0] || 'White');
  const [selectedSize, setSelectedSize] = useState('M');
  const [quantity, setQuantity] = useState(1);
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [productImage, setProductImage] = useState(null);
  const [scale, setScale] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  // Load product image
  useEffect(() => {
    if (!product) {
      navigate('/print-on-demand');
      return;
    }
    
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = product.image;
    img.onload = () => setProductImage(img);
  }, [product, navigate]);

  // Handle transformer
  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const stage = stageRef.current;
      const selectedNode = stage.findOne(`#${selectedId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId]);

  if (!product) {
    return null;
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target.result;
      img.onload = () => {
        // Scale image to fit in print area
        const maxWidth = product.printArea.width * 0.8;
        const maxHeight = product.printArea.height * 0.8;
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (maxHeight / height) * width;
          height = maxHeight;
        }

        const newElement = {
          id: `image-${Date.now()}`,
          type: 'image',
          x: product.printArea.x + (product.printArea.width - width) / 2,
          y: product.printArea.y + (product.printArea.height - height) / 2,
          width,
          height,
          image: img,
          rotation: 0
        };
        setElements([...elements, newElement]);
        setSelectedId(newElement.id);
        toast.success('Design uploaded! Drag to position.');
      };
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const addText = () => {
    const newElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: product.printArea.x + product.printArea.width / 2 - 50,
      y: product.printArea.y + product.printArea.height / 2,
      text: 'Your Text',
      fontSize: 24,
      fill: '#000000',
      fontFamily: 'Arial',
      rotation: 0
    };
    setElements([...elements, newElement]);
    setSelectedId(newElement.id);
  };

  const deleteSelected = () => {
    if (selectedId) {
      setElements(elements.filter(el => el.id !== selectedId));
      setSelectedId(null);
      toast.success('Element deleted');
    }
  };

  const clearAll = () => {
    setElements([]);
    setSelectedId(null);
    toast.success('Design cleared');
  };

  const handleStageClick = (e) => {
    if (e.target === e.target.getStage() || e.target.name() === 'background') {
      setSelectedId(null);
    }
  };

  const handleDragEnd = (id, e) => {
    setElements(elements.map(el => 
      el.id === id ? { ...el, x: e.target.x(), y: e.target.y() } : el
    ));
  };

  const handleTransformEnd = (id, e) => {
    const node = e.target;
    setElements(elements.map(el => {
      if (el.id === id) {
        return {
          ...el,
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          ...(el.type === 'image' ? {
            width: Math.max(20, node.width() * node.scaleX()),
            height: Math.max(20, node.height() * node.scaleY())
          } : {
            fontSize: Math.max(8, el.fontSize * node.scaleY())
          })
        };
      }
      return el;
    }));
    node.scaleX(1);
    node.scaleY(1);
  };

  const calculateTotal = () => {
    const printFee = elements.length > 0 ? 500 : 0;
    return (product.basePrice + printFee) * quantity;
  };

  const handleAddToCart = async () => {
    if (elements.length === 0) {
      toast.error('Please add a design before adding to cart');
      return;
    }

    setAddingToCart(true);
    try {
      // Generate preview image
      setSelectedId(null);
      await new Promise(resolve => setTimeout(resolve, 100));
      const previewImage = stageRef.current?.toDataURL({ pixelRatio: 1 });

      // Create cart item
      const cartItem = {
        id: `pod-${Date.now()}`,
        type: 'pod',
        name: `Custom ${product.name}`,
        product_id: product.id,
        product_name: product.name,
        color: selectedColor,
        size: selectedSize,
        quantity: quantity,
        price: calculateTotal() / quantity,
        total_price: calculateTotal(),
        preview_image: previewImage,
        design_data: elements.map(el => ({
          ...el,
          image: el.type === 'image' ? el.image?.src : undefined
        })),
        created_at: new Date().toISOString()
      };

      // Add to localStorage cart
      const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
      existingCart.push(cartItem);
      localStorage.setItem('cart', JSON.stringify(existingCart));
      window.dispatchEvent(new Event('cartUpdated'));

      toast.success('Added to cart!');
      navigate('/cart');
    } catch (error) {
      console.error('Add to cart error:', error);
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100">
      <SEO title={`Design Your ${product.name}`} description="Create your custom design" />

      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/print-on-demand')}
                className="flex items-center text-zinc-500 hover:text-zinc-900"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                <span className="hidden sm:inline">Back to Products</span>
              </button>
              <div className="hidden sm:block h-6 w-px bg-zinc-300" />
              <h1 className="font-semibold text-lg">Designing: {product.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#D90429]">{formatPrice(calculateTotal())}</span>
              <Button
                onClick={handleAddToCart}
                disabled={addingToCart || elements.length === 0}
                className="bg-[#D90429] hover:bg-[#B90322]"
                data-testid="add-to-cart-btn"
              >
                {addingToCart ? 'Adding...' : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-zinc-50 border-t">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex justify-center gap-8 md:gap-16 text-sm">
              <div className="flex items-center gap-2 text-zinc-400">
                <Check className="w-5 h-5 text-green-500" />
                <span>Product Selected</span>
              </div>
              <div className="flex items-center gap-2 text-[#D90429] font-medium">
                <div className="w-5 h-5 bg-[#D90429] text-white rounded-full flex items-center justify-center text-xs">2</div>
                <span>Design It</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <div className="w-5 h-5 bg-zinc-300 rounded-full flex items-center justify-center text-xs">3</div>
                <span>Add to Cart</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Design Canvas */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-4">
                {/* Toolbar */}
                <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="upload-design-btn"
                  >
                    <Upload className="w-4 h-4 mr-2" /> Upload Design
                  </Button>
                  <Button variant="outline" onClick={addText}>
                    <Type className="w-4 h-4 mr-2" /> Add Text
                  </Button>
                  <Button
                    variant="outline"
                    onClick={deleteSelected}
                    disabled={!selectedId}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                  <Button variant="outline" onClick={clearAll}>
                    <RotateCcw className="w-4 h-4 mr-2" /> Clear
                  </Button>
                  <div className="flex items-center gap-1 ml-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setScale(Math.min(2, scale + 0.1))}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Canvas */}
                <div 
                  className="flex justify-center overflow-auto rounded-lg"
                  style={{ 
                    backgroundColor: COLOR_HEX[selectedColor] || '#f5f5f5',
                    minHeight: '500px'
                  }}
                >
                  <Stage
                    ref={stageRef}
                    width={500 * scale}
                    height={550 * scale}
                    scaleX={scale}
                    scaleY={scale}
                    onClick={handleStageClick}
                    onTap={handleStageClick}
                  >
                    <Layer>
                      {/* Background */}
                      <Rect
                        name="background"
                        width={500}
                        height={550}
                        fill={COLOR_HEX[selectedColor] || '#ffffff'}
                      />

                      {/* Product Image */}
                      {productImage && (
                        <KonvaImage
                          image={productImage}
                          width={500}
                          height={550}
                          listening={false}
                        />
                      )}

                      {/* Print Area Guide */}
                      <Rect
                        x={product.printArea.x}
                        y={product.printArea.y}
                        width={product.printArea.width}
                        height={product.printArea.height}
                        stroke="#D90429"
                        strokeWidth={1}
                        dash={[5, 5]}
                        opacity={0.5}
                        listening={false}
                      />

                      {/* Design Elements */}
                      {elements.map((element) => {
                        if (element.type === 'image' && element.image) {
                          return (
                            <KonvaImage
                              key={element.id}
                              id={element.id}
                              image={element.image}
                              x={element.x}
                              y={element.y}
                              width={element.width}
                              height={element.height}
                              rotation={element.rotation}
                              draggable
                              onClick={() => setSelectedId(element.id)}
                              onTap={() => setSelectedId(element.id)}
                              onDragEnd={(e) => handleDragEnd(element.id, e)}
                              onTransformEnd={(e) => handleTransformEnd(element.id, e)}
                            />
                          );
                        }
                        if (element.type === 'text') {
                          return (
                            <Text
                              key={element.id}
                              id={element.id}
                              text={element.text}
                              x={element.x}
                              y={element.y}
                              fontSize={element.fontSize}
                              fill={element.fill}
                              fontFamily={element.fontFamily}
                              rotation={element.rotation}
                              draggable
                              onClick={() => setSelectedId(element.id)}
                              onTap={() => setSelectedId(element.id)}
                              onDragEnd={(e) => handleDragEnd(element.id, e)}
                              onTransformEnd={(e) => handleTransformEnd(element.id, e)}
                              onDblClick={() => {
                                const newText = prompt('Enter text:', element.text);
                                if (newText) {
                                  setElements(elements.map(el =>
                                    el.id === element.id ? { ...el, text: newText } : el
                                  ));
                                }
                              }}
                            />
                          );
                        }
                        return null;
                      })}

                      {/* Transformer */}
                      <Transformer
                        ref={transformerRef}
                        boundBoxFunc={(oldBox, newBox) => {
                          if (newBox.width < 20 || newBox.height < 20) return oldBox;
                          return newBox;
                        }}
                      />
                    </Layer>
                  </Stage>
                </div>

                {elements.length === 0 && (
                  <div className="text-center py-4 text-zinc-500">
                    <p>Click "Upload Design" to add your artwork</p>
                    <p className="text-sm">Position your design within the dashed area</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Options Panel */}
          <div className="space-y-4">
            {/* Color Selection */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Select Color</h3>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        selectedColor === color
                          ? 'border-[#D90429] ring-2 ring-[#D90429] ring-offset-2'
                          : 'border-zinc-300 hover:border-zinc-400'
                      }`}
                      style={{ backgroundColor: COLOR_HEX[color] || '#ccc' }}
                      title={color}
                      data-testid={`color-${color}`}
                    />
                  ))}
                </div>
                <p className="text-sm text-zinc-500 mt-2">Selected: {selectedColor}</p>
              </CardContent>
            </Card>

            {/* Size Selection */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Select Size</h3>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedSize === size
                          ? 'bg-[#D90429] text-white'
                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }`}
                      data-testid={`size-${size}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quantity */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Quantity</h3>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 bg-zinc-100 rounded-lg text-xl font-medium hover:bg-zinc-200"
                  >
                    -
                  </button>
                  <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 bg-zinc-100 rounded-lg text-xl font-medium hover:bg-zinc-200"
                  >
                    +
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Price Summary */}
            <Card className="bg-zinc-900 text-white">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">{product.name}</span>
                    <span>{formatPrice(product.basePrice)}</span>
                  </div>
                  {elements.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Print Fee</span>
                      <span>{formatPrice(500)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Quantity</span>
                    <span>× {quantity}</span>
                  </div>
                  <div className="border-t border-zinc-700 pt-2 mt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-[#D90429]">{formatPrice(calculateTotal())}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Help */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Design Tips</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Upload PNG or JPG images (max 10MB)</li>
                  <li>• Keep design within the dashed area</li>
                  <li>• Drag to position, corners to resize</li>
                  <li>• Double-click text to edit</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintOnDemandDesignPage;
