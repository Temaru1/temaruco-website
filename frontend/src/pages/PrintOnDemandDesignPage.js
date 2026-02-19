import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect } from 'react-konva';
import { ArrowLeft, Upload, Download, Trash2, RotateCcw, ZoomIn, ZoomOut, ShoppingCart, Check, Star, Crown, Gem, Move, Maximize2, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useCurrency } from '../contexts/CurrencyContext';
import { getImageUrl } from '../utils/imageUtils';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Helper to get proxied URL for external images (to avoid CORS issues on canvas)
const getProxiedImageUrl = (url) => {
  if (!url) return '';
  // If it's already a local URL, return as-is
  if (url.startsWith('/api/') || url.startsWith(API_URL)) {
    return getImageUrl(url);
  }
  // For external URLs, proxy through our backend
  return `${API_URL}/api/image-proxy?url=${encodeURIComponent(url)}`;
};

// Quality Variants Configuration
const QUALITY_VARIANTS = [
  { id: 'standard', label: 'Standard', icon: Star, color: 'bg-zinc-100 border-zinc-300 text-zinc-700', activeColor: 'bg-zinc-900 border-zinc-900 text-white', badgeColor: 'bg-zinc-600' },
  { id: 'premium', label: 'Premium', icon: Crown, color: 'bg-blue-50 border-blue-200 text-blue-700', activeColor: 'bg-blue-600 border-blue-600 text-white', badgeColor: 'bg-blue-600' },
  { id: 'luxury', label: 'Luxury', icon: Gem, color: 'bg-amber-50 border-amber-200 text-amber-700', activeColor: 'bg-amber-500 border-amber-500 text-white', badgeColor: 'bg-amber-500' }
];

// Print size configurations
const PRINT_SIZES = {
  badge: { width: 120, height: 120, label: 'Badge', description: '80-120px', scaleFactor: 0.15 },
  a4: { width: 2480, height: 3508, label: 'A4', description: '210×297mm', scaleFactor: 0.5 },
  a3: { width: 3508, height: 4961, label: 'A3', description: '297×420mm', scaleFactor: 0.7 },
  a2: { width: 4961, height: 7016, label: 'A2', description: '420×594mm', scaleFactor: 1.0 }
};

// Default print area fallback (used only if product doesn't have one)
const DEFAULT_PRINT_AREA = { x: 150, y: 80, width: 200, height: 250 };

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
  const originalImageRef = useRef(null); // Store original image for resizing
  
  const productFromState = location.state?.product;
  
  // Design state
  const [selectedVariant, setSelectedVariant] = useState('standard');
  const [selectedColor, setSelectedColor] = useState('White');
  const [selectedSize, setSelectedSize] = useState('M');
  const [quantity, setQuantity] = useState(1);
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [productImage, setProductImage] = useState(null);
  const [scale, setScale] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  
  // Print size state
  const [printSize, setPrintSize] = useState('a4');
  
  // Guest contact state
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '', phone: '' });
  const [guestId, setGuestId] = useState(null);
  const [designId, setDesignId] = useState(null);
  const [uploadedOriginalUrl, setUploadedOriginalUrl] = useState(null);
  const [dbProduct, setDbProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // STATELESS: Use temp_design_id stored in localStorage (persists across sessions/cookies)
  const [tempDesignId, setTempDesignId] = useState(() => {
    // Try to restore from localStorage on mount
    return localStorage.getItem('pod_temp_design_id') || null;
  });
  
  // Upload state
  const [isUploading, setIsUploading] = useState(false);

  // Fetch product from database - IMPORTANT: This is the single source of truth for product data
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/api/pod/clothing-items`);
        const items = response.data || [];
        // Find matching product by name or id
        const normalizedId = productId?.toLowerCase().replace(/[-_]/g, '');
        
        // First try exact match
        let matchingProduct = items.find(item => {
          const normalizedName = item.name?.toLowerCase().replace(/[-_\s]/g, '');
          return normalizedName === normalizedId || item.id === productId;
        });
        
        // If no exact match, try partial match
        if (!matchingProduct) {
          matchingProduct = items.find(item => {
            const normalizedName = item.name?.toLowerCase().replace(/[-_\s]/g, '');
            return normalizedName.includes(normalizedId);
          });
        }
        
        if (matchingProduct) {
          setDbProduct(matchingProduct);
          // Set default color from product
          if (matchingProduct.colors && matchingProduct.colors.length > 0) {
            setSelectedColor(matchingProduct.colors[0]);
          }
        } else {
          // If no product found, redirect back
          navigate('/print-on-demand');
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
        navigate('/print-on-demand');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, navigate]);

  // Use database product - this is now the ONLY source of truth
  // productFromState is only used as initial data while DB loads
  const activeProduct = dbProduct || productFromState;

  // Get print area from product (database) or use default
  const getPrintArea = () => {
    return activeProduct?.print_area || DEFAULT_PRINT_AREA;
  };

  // Load the BASE image from the product - SAME image as shown on product card
  // Uses image proxy to avoid CORS issues on canvas for external images
  useEffect(() => {
    if (!activeProduct) return;
    
    const imageUrl = activeProduct.base_image_url || activeProduct.image_url || activeProduct.image;
    // Use proxied URL for external images to ensure CORS compatibility
    const fullUrl = getProxiedImageUrl(imageUrl);
    
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = fullUrl;
    
    img.onload = () => setProductImage(img);
    
    img.onerror = () => {
      console.error('Failed to load product image:', imageUrl);
      toast.error('Failed to load product image');
    };
  }, [activeProduct]);

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

  // Show loading state while fetching product
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D90429]"></div>
      </div>
    );
  }

  if (!activeProduct) return null;

  const getVariantPrice = () => {
    const p = activeProduct;
    switch (selectedVariant) {
      case 'premium': return p.premium_price || (p.standard_price || p.base_price || 2000) * 1.5;
      case 'luxury': return p.luxury_price || (p.standard_price || p.base_price || 2000) * 2;
      default: return p.standard_price || p.base_price || 2000;
    }
  };

  const calculateTotal = () => {
    const printFee = elements.length > 0 ? 500 : 0;
    return (getVariantPrice() + printFee) * quantity;
  };

  // Calculate design dimensions based on print size
  const calculateDesignDimensions = (originalWidth, originalHeight, targetPrintSize) => {
    const printConfig = PRINT_SIZES[targetPrintSize];
    const printArea = getPrintArea();
    
    // Scale factor based on print size
    const maxWidth = printArea.width * printConfig.scaleFactor;
    const maxHeight = printArea.height * printConfig.scaleFactor;
    
    let width = originalWidth;
    let height = originalHeight;
    
    // Maintain aspect ratio
    const aspectRatio = originalWidth / originalHeight;
    
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    return { width, height };
  };

  // Handle print size change - resize design without re-upload
  const handlePrintSizeChange = (newSize) => {
    setPrintSize(newSize);
    
    // Update existing image elements with new size
    if (elements.length > 0 && originalImageRef.current) {
      const printArea = getPrintArea();
      
      setElements(prevElements => 
        prevElements.map(el => {
          if (el.type === 'image' && el.originalWidth && el.originalHeight) {
            const { width, height } = calculateDesignDimensions(
              el.originalWidth, 
              el.originalHeight, 
              newSize
            );
            
            return {
              ...el,
              width,
              height,
              // Re-center in print area
              x: printArea.x + (printArea.width - width) / 2,
              y: printArea.y + (printArea.height - height) / 2
            };
          }
          return el;
        })
      );
      
      // Update design transform on server if we have a design ID
      if (designId) {
        updateDesignTransform({ print_size: newSize });
      }
    }
  };

  // Update design transform on server
  const updateDesignTransform = async (transformData) => {
    if (!designId) return;
    
    try {
      await axios.put(`${API_URL}/api/pod/design/${designId}/transform`, transformData);
    } catch (error) {
      console.error('Failed to update design transform:', error);
    }
  };

  // Handle image upload with dual file storage
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and WebP images are allowed');
      return;
    }
    
    // Read file for local preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new window.Image();
      img.src = event.target.result;
      img.onload = () => {
        // Store original dimensions
        originalImageRef.current = {
          width: img.width,
          height: img.height,
          src: event.target.result
        };
        
        const printArea = getPrintArea();
        const { width, height } = calculateDesignDimensions(img.width, img.height, printSize);
        
        // Add to canvas elements
        const newElement = {
          id: `img-${Date.now()}`,
          type: 'image',
          image: img,
          originalWidth: img.width,
          originalHeight: img.height,
          x: printArea.x + (printArea.width - width) / 2,
          y: printArea.y + (printArea.height - height) / 2,
          width,
          height,
          rotation: 0
        };
        
        setElements([...elements, newElement]);
        toast.success('Design uploaded! You can now resize and position it.');
      };
    };
    reader.readAsDataURL(file);
    
    // Upload to server immediately (stateless - no guest info required)
    await uploadDesignToServer(file);
  };

  // Upload design to server (STATELESS - no session/cookie required)
  const uploadDesignToServer = async (file) => {
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('design_file', file);
      formData.append('product_id', activeProduct.id || productId);
      formData.append('item_type', activeProduct.name || productId);
      // Note: No session_id, guest info, or cookies needed for initial upload
      
      const response = await axios.post(`${API_URL}/api/pod/upload-design`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const newTempDesignId = response.data.temp_design_id;
      
      // CRITICAL: Store temp_design_id in localStorage for persistence
      // This survives browser close, cookie clear, cache clear
      localStorage.setItem('pod_temp_design_id', newTempDesignId);
      setTempDesignId(newTempDesignId);
      
      setDesignId(newTempDesignId);
      setUploadedOriginalUrl(response.data.original_file_url);
      
      console.log('[POD] Design uploaded with temp_design_id:', newTempDesignId);
      toast.success('Design uploaded! Fill in your details to complete.');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to save design');
    } finally {
      setIsUploading(false);
    }
  };

  // Link design to contact (STATELESS - uses temp_design_id from localStorage)
  const linkDesignToContact = async () => {
    if (!guestInfo.email || !guestInfo.name || !guestInfo.phone) {
      toast.error('Please fill in all contact fields');
      return false;
    }
    
    // Get temp_design_id from state or localStorage (for persistence)
    const storedTempDesignId = tempDesignId || localStorage.getItem('pod_temp_design_id');
    
    if (!storedTempDesignId) {
      toast.error('No design found. Please upload a design first.');
      return false;
    }
    
    try {
      // Use the new stateless endpoint that links design to contact
      const response = await axios.post(`${API_URL}/api/pod/link-design`, {
        temp_design_id: storedTempDesignId,
        name: guestInfo.name,
        email: guestInfo.email,
        phone: guestInfo.phone
      });
      
      setGuestId(response.data.contact_id);
      console.log('[POD] Design linked to contact:', response.data);
      
      // Clear temp_design_id from localStorage after successful linking
      localStorage.removeItem('pod_temp_design_id');
      
      toast.success('Contact info saved and design linked!');
      return true;
    } catch (error) {
      console.error('Failed to link design:', error);
      const message = error.response?.data?.detail || 'Failed to save contact info';
      toast.error(message);
      return false;
    }
  };

  // Upload mockup to server
  const uploadMockupToServer = async () => {
    if (!designId || !stageRef.current) return null;
    
    try {
      // Generate mockup image from canvas
      const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
      
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('mockup_file', blob, 'mockup.png');
      
      const uploadResponse = await axios.post(
        `${API_URL}/api/pod/upload-mockup/${designId}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      return uploadResponse.data.mockup_file_url;
    } catch (error) {
      console.error('Mockup upload error:', error);
      return null;
    }
  };

  const addText = () => {
    const printArea = getPrintArea();
    setElements([...elements, {
      id: `text-${Date.now()}`, type: 'text', text: 'Your Text',
      x: printArea.x + printArea.width / 2, y: printArea.y + printArea.height / 2,
      fontSize: 24, fontFamily: 'Arial', fill: '#000000', rotation: 0
    }]);
  };

  const deleteSelected = () => {
    if (selectedId) {
      setElements(elements.filter(el => el.id !== selectedId));
      setSelectedId(null);
    }
  };

  // Center design in print area
  const centerDesign = () => {
    if (!selectedId) return;
    
    const printArea = getPrintArea();
    
    setElements(prevElements =>
      prevElements.map(el => {
        if (el.id === selectedId) {
          return {
            ...el,
            x: printArea.x + (printArea.width - el.width) / 2,
            y: printArea.y + (printArea.height - el.height) / 2
          };
        }
        return el;
      })
    );
    
    if (designId) {
      const el = elements.find(e => e.id === selectedId);
      if (el) {
        updateDesignTransform({
          position_x: printArea.x + (printArea.width - el.width) / 2,
          position_y: printArea.y + (printArea.height - el.height) / 2
        });
      }
    }
  };

  // Reset design position and scale
  const resetDesign = () => {
    if (elements.length === 0 || !originalImageRef.current) return;
    
    const printArea = getPrintArea();
    
    setElements(prevElements =>
      prevElements.map(el => {
        if (el.type === 'image') {
          const { width, height } = calculateDesignDimensions(
            el.originalWidth || originalImageRef.current.width,
            el.originalHeight || originalImageRef.current.height,
            printSize
          );
          
          return {
            ...el,
            width,
            height,
            x: printArea.x + (printArea.width - width) / 2,
            y: printArea.y + (printArea.height - height) / 2,
            rotation: 0
          };
        }
        return el;
      })
    );
  };

  const handleAddToCart = async () => {
    if (elements.length === 0) {
      toast.error('Please add a design before adding to cart');
      return;
    }
    
    if (!guestInfo.email || !guestInfo.name || !guestInfo.phone) {
      toast.error('Please fill in your contact information');
      return;
    }
    
    setAddingToCart(true);
    
    try {
      // Link design to contact using stateless approach
      const contactLinked = await linkDesignToContact();
      if (!contactLinked) {
        setAddingToCart(false);
        return;
      }
      setSelectedId(null);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Upload mockup if we have a design ID
      let mockupUrl = null;
      if (designId) {
        mockupUrl = await uploadMockupToServer();
      }
      
      const previewImage = stageRef.current?.toDataURL({ pixelRatio: 1 });
      const variantInfo = QUALITY_VARIANTS.find(v => v.id === selectedVariant);
      
      const cartItem = {
        id: `pod-${Date.now()}`,
        type: 'pod',
        name: `Custom ${activeProduct.name} (${variantInfo?.label})`,
        product_id: activeProduct.id || productId,
        product_name: activeProduct.name,
        product_variant: selectedVariant,
        unit_price: getVariantPrice(),
        color: selectedColor,
        size: selectedSize,
        quantity,
        price: calculateTotal() / quantity,
        total_price: calculateTotal(),
        preview_image: previewImage,
        print_size: printSize,
        print_size_label: PRINT_SIZES[printSize].label,
        design_id: designId,
        temp_design_id: tempDesignId || localStorage.getItem('pod_temp_design_id'),
        guest_id: guestId,
        original_file_url: uploadedOriginalUrl,
        mockup_file_url: mockupUrl,
        guest_info: guestInfo,
        design_data: elements.map(el => ({
          ...el,
          image: el.type === 'image' ? el.image?.src : undefined
        })),
        created_at: new Date().toISOString()
      };
      
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

  const printArea = getPrintArea();
  const variantInfo = QUALITY_VARIANTS.find(v => v.id === selectedVariant);

  return (
    <div className="min-h-screen bg-zinc-100">
      <SEO 
        title={`${activeProduct.name} - Print on Demand | TEMARUCO`}
        description={`Design your custom ${activeProduct.name}. Upload your artwork and create personalized merchandise with TEMARUCO's premium print on demand service.`}
        image={activeProduct.mockup_url || activeProduct.image_url}
        url={`https://temarucogroup.com/pod/${productId}`}
        product={activeProduct}
      />

      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/print-on-demand')} className="flex items-center text-zinc-500 hover:text-zinc-900">
                <ArrowLeft className="w-5 h-5 mr-1" /><span className="hidden sm:inline">Back</span>
              </button>
              <div className="hidden sm:block h-6 w-px bg-zinc-300" />
              <h1 className="font-semibold text-lg">{activeProduct.name}</h1>
              <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${variantInfo?.badgeColor}`}>
                {variantInfo?.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#D90429]">{formatPrice(calculateTotal())}</span>
              <Button 
                onClick={handleAddToCart} 
                disabled={addingToCart || elements.length === 0 || !guestInfo.email} 
                className="bg-[#D90429] hover:bg-[#B90322]"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />{addingToCart ? 'Adding...' : 'Add to Cart'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canvas */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-4">
                {/* Toolbar */}
                <div className="flex flex-wrap gap-2 mb-4">
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    <Upload className="w-4 h-4 mr-1" />{isUploading ? 'Uploading...' : 'Upload Design'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={deleteSelected} disabled={!selectedId}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
                  <Button variant="outline" size="sm" onClick={centerDesign} disabled={!selectedId}><Move className="w-4 h-4 mr-1" />Center</Button>
                  <Button variant="outline" size="sm" onClick={resetDesign} disabled={elements.length === 0}><RotateCcw className="w-4 h-4 mr-1" />Reset</Button>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} />
                </div>
                
                {/* Canvas Area */}
                <div className="bg-zinc-200 rounded-lg overflow-hidden flex items-center justify-center" style={{ minHeight: '500px' }}>
                  <Stage 
                    ref={stageRef} 
                    width={500} 
                    height={500} 
                    scaleX={scale} 
                    scaleY={scale} 
                    onClick={(e) => { if (e.target === e.target.getStage()) setSelectedId(null); }}
                  >
                    <Layer>
                      {productImage && <KonvaImage image={productImage} width={500} height={500} />}
                      <Rect x={printArea.x} y={printArea.y} width={printArea.width} height={printArea.height} stroke="#D90429" strokeWidth={1} dash={[5, 5]} listening={false} />
                      {elements.map((el) => {
                        if (el.type === 'image') {
                          return (
                            <KonvaImage
                              key={el.id}
                              id={el.id}
                              image={el.image}
                              x={el.x}
                              y={el.y}
                              width={el.width}
                              height={el.height}
                              rotation={el.rotation}
                              draggable
                              onClick={() => setSelectedId(el.id)}
                              onTap={() => setSelectedId(el.id)}
                              onDragEnd={(e) => {
                                const newX = e.target.x();
                                const newY = e.target.y();
                                setElements(elements.map(item => 
                                  item.id === el.id ? { ...item, x: newX, y: newY } : item
                                ));
                                if (designId) {
                                  updateDesignTransform({ position_x: newX, position_y: newY });
                                }
                              }}
                              onTransformEnd={(e) => {
                                const node = e.target;
                                const newWidth = node.width() * node.scaleX();
                                const newHeight = node.height() * node.scaleY();
                                setElements(elements.map(item => 
                                  item.id === el.id ? {
                                    ...item,
                                    x: node.x(),
                                    y: node.y(),
                                    width: newWidth,
                                    height: newHeight,
                                    rotation: node.rotation()
                                  } : item
                                ));
                                node.scaleX(1);
                                node.scaleY(1);
                                if (designId) {
                                  updateDesignTransform({
                                    position_x: node.x(),
                                    position_y: node.y(),
                                    scale: newWidth / (el.originalWidth || 1),
                                    rotation: node.rotation()
                                  });
                                }
                              }}
                            />
                          );
                        }
                        if (el.type === 'text') {
                          return (
                            <Text
                              key={el.id}
                              id={el.id}
                              text={el.text}
                              x={el.x}
                              y={el.y}
                              fontSize={el.fontSize}
                              fontFamily={el.fontFamily}
                              fill={el.fill}
                              rotation={el.rotation}
                              draggable
                              onClick={() => setSelectedId(el.id)}
                              onTap={() => setSelectedId(el.id)}
                              onDragEnd={(e) => {
                                setElements(elements.map(item => 
                                  item.id === el.id ? { ...item, x: e.target.x(), y: e.target.y() } : item
                                ));
                              }}
                              onDblClick={() => {
                                const newText = prompt('Enter text:', el.text);
                                if (newText) setElements(elements.map(item => 
                                  item.id === el.id ? { ...item, text: newText } : item
                                ));
                              }}
                            />
                          );
                        }
                        return null;
                      })}
                      {selectedId && (
                        <Transformer
                          ref={transformerRef}
                          boundBoxFunc={(oldBox, newBox) => (newBox.width < 20 || newBox.height < 20 ? oldBox : newBox)}
                          keepRatio={true}
                        />
                      )}
                    </Layer>
                  </Stage>
                </div>
                <p className="text-xs text-zinc-500 mt-2 text-center">
                  Click inside the dashed area to add your design. Drag to reposition, use corners to resize.
                </p>
              </CardContent>
            </Card>
            
            {/* Print Size Selector */}
            <Card className="mt-4">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Maximize2 className="w-4 h-4" /> Print Size
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(PRINT_SIZES).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => handlePrintSizeChange(key)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        printSize === key
                          ? 'border-[#D90429] bg-red-50'
                          : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                      data-testid={`print-size-${key}`}
                    >
                      <p className="font-medium">{config.label}</p>
                      <p className="text-xs text-zinc-500">{config.description}</p>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Design will automatically resize while maintaining aspect ratio. No re-upload needed.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Options Panel */}
          <div className="space-y-4">
            {/* Guest Contact Info */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Your Contact Info</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Your Name *"
                    value={guestInfo.name}
                    onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                    data-testid="guest-name"
                  />
                  <input
                    type="email"
                    placeholder="Email Address *"
                    value={guestInfo.email}
                    onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                    data-testid="guest-email"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number *"
                    value={guestInfo.phone}
                    onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                    data-testid="guest-phone"
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-2">Required to save your design and process orders.</p>
              </CardContent>
            </Card>
            
            {/* Quality Variant Selector */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Quality Variant</h3>
                <div className="space-y-2">
                  {QUALITY_VARIANTS.map((variant) => {
                    const Icon = variant.icon;
                    const price = variant.id === 'premium' ? (activeProduct.premium_price || (activeProduct.standard_price || activeProduct.base_price) * 1.5) :
                                  variant.id === 'luxury' ? (activeProduct.luxury_price || (activeProduct.standard_price || activeProduct.base_price) * 2) :
                                  (activeProduct.standard_price || activeProduct.base_price);
                    const isSelected = selectedVariant === variant.id;
                    return (
                      <button key={variant.id} onClick={() => setSelectedVariant(variant.id)}
                        className={`w-full p-3 rounded-lg border-2 flex items-center justify-between transition-all ${isSelected ? variant.activeColor : variant.color}`}
                        data-testid={`pod-variant-${variant.id}`}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-5 h-5" />
                          <span className="font-medium">{variant.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">₦{price?.toLocaleString()}</span>
                          {isSelected && <Check className="w-4 h-4" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Color Selection */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Color</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(activeProduct.colors || ['White', 'Black']).map((color) => (
                    <button key={color} onClick={() => setSelectedColor(color)}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${selectedColor === color ? 'border-[#D90429] ring-2 ring-[#D90429]/30' : 'border-zinc-300'}`}
                      style={{ backgroundColor: COLOR_HEX[color] || '#ccc' }} title={color} />
                  ))}
                </div>
                {/* Manual color input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Other color..."
                    className="flex-1 px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        setSelectedColor(e.target.value.trim());
                        e.target.value = '';
                      }
                    }}
                    data-testid="pod-custom-color-input"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      const input = e.target.previousElementSibling;
                      if (input && input.value.trim()) {
                        setSelectedColor(input.value.trim());
                        input.value = '';
                      }
                    }}
                    className="px-3 py-2 text-sm bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200"
                  >
                    Set
                  </button>
                </div>
                <p className="text-sm text-zinc-500 mt-2">Selected: {selectedColor}</p>
              </CardContent>
            </Card>

            {/* Size Selection */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Size</h3>
                <div className="flex flex-wrap gap-2">
                  {(activeProduct.sizes || ['S', 'M', 'L', 'XL']).map((size) => (
                    <button key={size} onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 rounded border transition-all ${selectedSize === size ? 'bg-[#D90429] text-white border-[#D90429]' : 'border-zinc-300 hover:border-zinc-400'}`}>
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
                <div className="flex items-center gap-3">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-full border flex items-center justify-center hover:bg-zinc-50">-</button>
                  <span className="text-xl font-bold w-12 text-center">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-full border flex items-center justify-center hover:bg-zinc-50">+</button>
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card className="bg-zinc-900 text-white">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-zinc-400">Product</span><span>{activeProduct.name}</span></div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Quality</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${variantInfo?.badgeColor}`}>{variantInfo?.label}</span>
                  </div>
                  <div className="flex justify-between"><span className="text-zinc-400">Print Size</span><span>{PRINT_SIZES[printSize].label}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Unit Price</span><span>₦{getVariantPrice()?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Print Fee</span><span>{elements.length > 0 ? '₦500' : 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Quantity</span><span>×{quantity}</span></div>
                  <div className="border-t border-zinc-700 my-2"></div>
                  <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-[#F5A623]">₦{calculateTotal().toLocaleString()}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Sticky Add to Cart Button - Fixed at bottom on mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50 md:static md:bg-transparent md:border-0 md:shadow-none md:p-0 md:mt-6">
        <div className="max-w-7xl mx-auto">
          <Button
            onClick={handleAddToCart}
            disabled={addingToCart || elements.length === 0 || !guestInfo.email || !guestInfo.name || !guestInfo.phone}
            className="w-full bg-[#D90429] hover:bg-[#B90322] text-white py-4 md:py-6 text-lg font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="add-to-cart-btn"
          >
            {addingToCart ? (
              <>
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                Processing...
              </>
            ) : elements.length === 0 ? (
              'Upload a design first'
            ) : !guestInfo.name || !guestInfo.email || !guestInfo.phone ? (
              'Fill in contact info first'
            ) : (
              <>
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart - ₦{calculateTotal().toLocaleString()}
              </>
            )}
          </Button>
          {elements.length === 0 && (
            <p className="text-xs text-center text-zinc-500 mt-2">Upload your design to enable checkout</p>
          )}
        </div>
      </div>
      
      {/* Bottom padding on mobile to account for fixed button */}
      <div className="h-24 md:h-0" />
    </div>
  );
};

export default PrintOnDemandDesignPage;
