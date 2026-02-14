import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect } from 'react-konva';
import { ArrowLeft, Upload, Type, Download, Trash2, RotateCcw, ZoomIn, ZoomOut, Save, Shirt, Image as ImageIcon, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import SEO from '../components/SEO';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { useAuth } from '../hooks/useAuth';
import { saveMockup } from '../utils/api';

// T-shirt template SVG paths for different views
const TEMPLATES = {
  tshirt_front: {
    name: 'T-Shirt Front',
    category: 'apparel',
    printArea: { x: 150, y: 120, width: 200, height: 250 },
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80'
  },
  tshirt_back: {
    name: 'T-Shirt Back',
    category: 'apparel',
    printArea: { x: 150, y: 100, width: 200, height: 280 },
    image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=500&q=80'
  },
  hoodie_front: {
    name: 'Hoodie Front',
    category: 'apparel',
    printArea: { x: 140, y: 150, width: 220, height: 200 },
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500&q=80'
  },
  hoodie_back: {
    name: 'Hoodie Back',
    category: 'apparel',
    printArea: { x: 140, y: 120, width: 220, height: 250 },
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=500&q=80'
  },
  polo_front: {
    name: 'Polo Shirt',
    category: 'apparel',
    printArea: { x: 160, y: 100, width: 180, height: 180 },
    image: 'https://images.unsplash.com/photo-1625910513413-5fc4e5e20d58?w=500&q=80'
  },
  sweatshirt: {
    name: 'Sweatshirt',
    category: 'apparel',
    printArea: { x: 140, y: 140, width: 220, height: 220 },
    image: 'https://images.unsplash.com/photo-1578768079052-aa76e52ff62e?w=500&q=80'
  },
  tank_top: {
    name: 'Tank Top',
    category: 'apparel',
    printArea: { x: 160, y: 100, width: 180, height: 220 },
    image: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=500&q=80'
  },
  cap_front: {
    name: 'Cap Front',
    category: 'accessories',
    printArea: { x: 175, y: 180, width: 150, height: 100 },
    image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500&q=80'
  },
  cap_side: {
    name: 'Cap Side',
    category: 'accessories',
    printArea: { x: 200, y: 200, width: 100, height: 80 },
    image: 'https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=500&q=80'
  },
  tote_bag: {
    name: 'Tote Bag',
    category: 'accessories',
    printArea: { x: 140, y: 150, width: 220, height: 250 },
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&q=80'
  },
  backpack: {
    name: 'Backpack',
    category: 'accessories',
    printArea: { x: 160, y: 120, width: 180, height: 200 },
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80'
  },
  mug: {
    name: 'Coffee Mug',
    category: 'accessories',
    printArea: { x: 150, y: 180, width: 200, height: 150 },
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=500&q=80'
  },
  phone_case: {
    name: 'Phone Case',
    category: 'accessories',
    printArea: { x: 180, y: 150, width: 140, height: 280 },
    image: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=500&q=80'
  },
  face_mask: {
    name: 'Face Mask',
    category: 'accessories',
    printArea: { x: 150, y: 220, width: 200, height: 100 },
    image: 'https://images.unsplash.com/photo-1586942593568-29361efb5379?w=500&q=80'
  }
};

const TEMPLATE_CATEGORIES = [
  { id: 'apparel', name: 'Apparel', icon: '👕' },
  { id: 'accessories', name: 'Accessories', icon: '🎒' }
];

const COLORS = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Black', value: '#1a1a1a' },
  { name: 'Navy', value: '#1e3a5f' },
  { name: 'Red', value: '#D90429' },
  { name: 'Grey', value: '#6b7280' },
  { name: 'Green', value: '#059669' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Orange', value: '#f97316' },
];

const MockupBuilderPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const stageRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selectedTemplate, setSelectedTemplate] = useState('tshirt_front');
  const [selectedCategory, setSelectedCategory] = useState('apparel');
  const [selectedColor, setSelectedColor] = useState('#FFFFFF');
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [templateImage, setTemplateImage] = useState(null);
  const [scale, setScale] = useState(1);
  const [saving, setSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [designName, setDesignName] = useState('');
  const transformerRef = useRef(null);

  const stageWidth = 500;
  const stageHeight = 600;

  // Filter templates by category
  const filteredTemplates = Object.entries(TEMPLATES).filter(
    ([key, template]) => template.category === selectedCategory
  );

  // Load template image
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = TEMPLATES[selectedTemplate].image;
    img.onload = () => setTemplateImage(img);
  }, [selectedTemplate]);

  // Handle transformer
  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const node = stageRef.current.findOne('#' + selectedId);
      if (node) {
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer().batchDraw();
      }
    }
  }, [selectedId]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target.result;
      img.onload = () => {
        const printArea = TEMPLATES[selectedTemplate].printArea;
        const aspectRatio = img.width / img.height;
        let width = Math.min(img.width, printArea.width * 0.8);
        let height = width / aspectRatio;
        
        if (height > printArea.height * 0.8) {
          height = printArea.height * 0.8;
          width = height * aspectRatio;
        }

        const newElement = {
          id: `img_${Date.now()}`,
          type: 'image',
          image: img,
          x: printArea.x + (printArea.width - width) / 2,
          y: printArea.y + (printArea.height - height) / 2,
          width,
          height,
          rotation: 0,
          draggable: true
        };
        setElements([...elements, newElement]);
        setSelectedId(newElement.id);
        toast.success('Image added!');
      };
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const addText = () => {
    const printArea = TEMPLATES[selectedTemplate].printArea;
    const newElement = {
      id: `text_${Date.now()}`,
      type: 'text',
      text: 'Your Text Here',
      x: printArea.x + printArea.width / 2 - 60,
      y: printArea.y + printArea.height / 2,
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#000000',
      rotation: 0,
      draggable: true
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
    toast.success('Canvas cleared');
  };

  const downloadMockup = () => {
    if (stageRef.current) {
      setSelectedId(null);
      setTimeout(() => {
        const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
        const link = document.createElement('a');
        link.download = `mockup_${selectedTemplate}_${Date.now()}.png`;
        link.href = uri;
        link.click();
        toast.success('Mockup downloaded!');
      }, 100);
    }
  };

  const handleSaveMockup = async () => {
    if (!user) {
      toast.error('Please sign in to save your designs');
      navigate('/login');
      return;
    }

    if (!designName.trim()) {
      toast.error('Please enter a name for your design');
      return;
    }

    setSaving(true);
    try {
      // Generate thumbnail
      setSelectedId(null);
      await new Promise(resolve => setTimeout(resolve, 100));
      const thumbnail = stageRef.current?.toDataURL({ pixelRatio: 0.5 });

      // Serialize elements (without actual image data for storage)
      const serializedElements = elements.map(el => ({
        ...el,
        image: el.type === 'image' ? el.image?.src : undefined
      }));

      await saveMockup({
        name: designName.trim(),
        template: selectedTemplate,
        color: selectedColor,
        elements: serializedElements,
        thumbnail
      });

      toast.success('Design saved to your account!');
      setShowSaveModal(false);
      setDesignName('');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save design');
    } finally {
      setSaving(false);
    }
  };

  const handleStageClick = (e) => {
    if (e.target === e.target.getStage() || e.target.name() === 'background') {
      setSelectedId(null);
    }
  };

  const handleElementChange = (id, newAttrs) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...newAttrs } : el));
  };

  const selectedElement = elements.find(el => el.id === selectedId);

  return (
    <div className="min-h-screen bg-zinc-100">
      <SEO title="Mockup Builder" description="Design your custom clothing with our drag-and-drop mockup builder" />

      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/')} className="flex items-center text-zinc-500 hover:text-zinc-900">
                <ArrowLeft className="w-5 h-5 mr-1" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-zinc-900">Mockup Builder</h1>
                <p className="text-sm text-zinc-500">Design your custom clothing</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={clearAll} size="sm">
                <RotateCcw className="w-4 h-4 mr-1" /> Reset
              </Button>
              {user ? (
                <Button variant="outline" onClick={() => setShowSaveModal(true)} size="sm" data-testid="save-mockup-btn">
                  <Save className="w-4 h-4 mr-1" /> Save
                </Button>
              ) : (
                <Button variant="outline" onClick={() => navigate('/login')} size="sm">
                  <User className="w-4 h-4 mr-1" /> Sign In to Save
                </Button>
              )}
              <Button onClick={downloadMockup} className="bg-[#D90429] hover:bg-[#B90322]" size="sm">
                <Download className="w-4 h-4 mr-1" /> Download
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Tools */}
          <div className="space-y-4">
            {/* Templates */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-zinc-900 mb-3 flex items-center gap-2">
                  <Shirt size={18} /> Template
                </h3>
                
                {/* Category Tabs */}
                <div className="flex gap-1 mb-3 bg-zinc-100 p-1 rounded-lg">
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        // Select first template in category
                        const firstInCat = Object.entries(TEMPLATES).find(([k, t]) => t.category === cat.id);
                        if (firstInCat) setSelectedTemplate(firstInCat[0]);
                      }}
                      className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                        selectedCategory === cat.id 
                          ? 'bg-white shadow text-[#D90429]' 
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                </div>

                {/* Template Grid */}
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {filteredTemplates.map(([key, template]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedTemplate(key)}
                      className={`p-2 rounded-lg border-2 text-xs font-medium transition-all ${
                        selectedTemplate === key 
                          ? 'border-[#D90429] bg-red-50 text-[#D90429]' 
                          : 'border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Colors */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-zinc-900 mb-3">Garment Color</h3>
                <div className="grid grid-cols-5 gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        selectedColor === color.value 
                          ? 'border-[#D90429] ring-2 ring-red-200' 
                          : 'border-zinc-300'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Add Elements */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-zinc-900 mb-3">Add Elements</h3>
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" /> Upload Image
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={addText}
                  >
                    <Type className="w-4 h-4 mr-2" /> Add Text
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Element Properties */}
            {selectedElement && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-zinc-900 mb-3">Properties</h3>
                  {selectedElement.type === 'text' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-zinc-500">Text</label>
                        <input
                          type="text"
                          value={selectedElement.text}
                          onChange={(e) => handleElementChange(selectedId, { text: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500">Font Size</label>
                        <input
                          type="range"
                          min="12"
                          max="72"
                          value={selectedElement.fontSize}
                          onChange={(e) => handleElementChange(selectedId, { fontSize: parseInt(e.target.value) })}
                          className="w-full"
                        />
                        <span className="text-xs">{selectedElement.fontSize}px</span>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500">Color</label>
                        <input
                          type="color"
                          value={selectedElement.fill}
                          onChange={(e) => handleElementChange(selectedId, { fill: e.target.value })}
                          className="w-full h-8 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                  <Button 
                    variant="destructive" 
                    size="sm"
                    className="w-full mt-3"
                    onClick={deleteSelected}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Canvas Area */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <CardContent className="p-0 flex items-center justify-center bg-zinc-200" style={{ minHeight: 650 }}>
                <div className="relative" style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
                  <Stage
                    ref={stageRef}
                    width={stageWidth}
                    height={stageHeight}
                    onClick={handleStageClick}
                    style={{ backgroundColor: '#f4f4f5', borderRadius: '8px' }}
                  >
                    <Layer>
                      {/* Background color overlay */}
                      <Rect
                        name="background"
                        x={0}
                        y={0}
                        width={stageWidth}
                        height={stageHeight}
                        fill={selectedColor}
                        opacity={0.3}
                      />
                      
                      {/* Template Image */}
                      {templateImage && (
                        <KonvaImage
                          image={templateImage}
                          x={0}
                          y={0}
                          width={stageWidth}
                          height={stageHeight}
                          listening={false}
                        />
                      )}

                      {/* Print Area Indicator */}
                      <Rect
                        x={TEMPLATES[selectedTemplate].printArea.x}
                        y={TEMPLATES[selectedTemplate].printArea.y}
                        width={TEMPLATES[selectedTemplate].printArea.width}
                        height={TEMPLATES[selectedTemplate].printArea.height}
                        stroke="#D90429"
                        strokeWidth={1}
                        dash={[5, 5]}
                        opacity={0.5}
                        listening={false}
                      />

                      {/* User Elements */}
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
                                handleElementChange(el.id, {
                                  x: e.target.x(),
                                  y: e.target.y()
                                });
                              }}
                              onTransformEnd={(e) => {
                                const node = e.target;
                                handleElementChange(el.id, {
                                  x: node.x(),
                                  y: node.y(),
                                  width: node.width() * node.scaleX(),
                                  height: node.height() * node.scaleY(),
                                  rotation: node.rotation()
                                });
                                node.scaleX(1);
                                node.scaleY(1);
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
                                handleElementChange(el.id, {
                                  x: e.target.x(),
                                  y: e.target.y()
                                });
                              }}
                              onTransformEnd={(e) => {
                                const node = e.target;
                                handleElementChange(el.id, {
                                  x: node.x(),
                                  y: node.y(),
                                  rotation: node.rotation()
                                });
                              }}
                            />
                          );
                        }
                        return null;
                      })}

                      {/* Transformer */}
                      {selectedId && (
                        <Transformer
                          ref={transformerRef}
                          boundBoxFunc={(oldBox, newBox) => {
                            if (newBox.width < 20 || newBox.height < 20) {
                              return oldBox;
                            }
                            return newBox;
                          }}
                        />
                      )}
                    </Layer>
                  </Stage>
                </div>
              </CardContent>
            </Card>

            {/* Zoom Controls */}
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setScale(Math.max(0.5, scale - 0.1))}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="px-3 py-1 bg-white rounded border text-sm">{Math.round(scale * 100)}%</span>
              <Button variant="outline" size="sm" onClick={() => setScale(Math.min(1.5, scale + 0.1))}>
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Right Sidebar - Instructions */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-zinc-900 mb-3">How to Use</h3>
                <ol className="text-sm text-zinc-600 space-y-2">
                  <li className="flex gap-2">
                    <span className="bg-red-100 text-[#D90429] rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                    Select a template (T-Shirt, Hoodie, Polo)
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-red-100 text-[#D90429] rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                    Choose a garment color
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-red-100 text-[#D90429] rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                    Upload your logo/image or add text
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-red-100 text-[#D90429] rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                    Drag, resize, and rotate elements
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-red-100 text-[#D90429] rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">5</span>
                    Download your mockup
                  </li>
                </ol>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Our team can help you create professional designs. Submit your mockup with your order or contact us.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                  onClick={() => navigate('/custom-order')}
                >
                  Request Custom Design
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSaveModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Save Your Design</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-zinc-700 mb-2">Design Name</label>
              <input
                type="text"
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                placeholder="e.g., My Logo T-Shirt"
                className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-[#D90429] focus:border-transparent"
                autoFocus
                data-testid="design-name-input"
              />
            </div>
            <p className="text-sm text-zinc-500 mb-4">
              Template: {TEMPLATES[selectedTemplate].name} • Color: {COLORS.find(c => c.value === selectedColor)?.name}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleSaveMockup}
                disabled={saving}
                className="flex-1 bg-[#D90429] hover:bg-[#B90322]"
                data-testid="confirm-save-btn"
              >
                {saving ? 'Saving...' : 'Save Design'}
              </Button>
              <Button variant="outline" onClick={() => setShowSaveModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MockupBuilderPage;
