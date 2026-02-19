import React from 'react';
import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://temarucogroup.com';

// SEO configuration for all static pages
export const SEO_CONFIG = {
  home: {
    title: 'TEMARUCO – Premium Fashion, Souvenirs & Creative Solutions',
    description: 'TEMARUCO is your premium hub for fashion, custom souvenirs, bulk apparel, and creative design services.',
    image: `${BASE_URL}/images/preview-home.jpg`,
    url: `${BASE_URL}/`,
    h1: 'TEMARUCO – Premium Fashion, Souvenirs & Creative Solutions'
  },
  bulkOrders: {
    title: 'Bulk Apparel Manufacturing & Custom T-Shirts | TEMARUCO',
    description: 'Order bulk custom clothing for schools, churches, events, and corporate branding. Minimum 50 pieces per item. High-quality production and delivery across Nigeria.',
    image: `${BASE_URL}/images/preview-bulk.jpg`,
    url: `${BASE_URL}/bulk-orders`,
    h1: 'Bulk Apparel Manufacturing & Custom T-Shirts'
  },
  printOnDemand: {
    title: 'Print on Demand Services in Nigeria | TEMARUCO',
    description: 'High-quality print on demand services for t-shirts, hoodies, and merchandise. Design freely, see realistic mock-ups, and enjoy fast nationwide production.',
    image: `${BASE_URL}/images/preview-pod.jpg`,
    url: `${BASE_URL}/print-on-demand`,
    h1: 'Premium Print on Demand Services'
  },
  souvenirs: {
    title: 'Custom Souvenirs & Corporate Gifts in Nigeria | TEMARUCO',
    description: 'Premium custom souvenirs including cups, backpacks, umbrellas, hand fans, and more. Perfect for events, branding, and promotional campaigns.',
    image: `${BASE_URL}/images/preview-souvenirs.jpg`,
    url: `${BASE_URL}/souvenirs`,
    h1: 'Custom Souvenirs & Corporate Gifts'
  },
  designServices: {
    title: 'Professional Graphic Design Services | TEMARUCO',
    description: 'Creative design services for branding, apparel, packaging, and promotional materials. Work with TEMARUCO to bring your vision to life.',
    image: `${BASE_URL}/images/preview-design.jpg`,
    url: `${BASE_URL}/design-services`,
    h1: 'Creative Design Services'
  },
  fabrics: {
    title: 'Premium Fabrics & Materials in Nigeria | TEMARUCO',
    description: 'High-quality fabrics available by the yard. Perfect for tailoring, bulk orders, and creative production.',
    image: `${BASE_URL}/images/preview-fabrics.jpg`,
    url: `${BASE_URL}/fabrics`,
    h1: 'Premium Fabrics & Materials'
  },
  boutique: {
    title: 'Premium Clothing Boutique | TEMARUCO',
    description: "Explore TEMARUCO's boutique collection including cultural wear, modern wear, and blanks for custom designs.",
    image: `${BASE_URL}/images/preview-boutique.jpg`,
    url: `${BASE_URL}/boutique`,
    h1: 'Premium Clothing Boutique'
  },
  customOrder: {
    title: 'Custom Order Request | TEMARUCO',
    description: 'Submit a custom order request for bulk apparel, souvenirs, or special manufacturing needs. Get a personalized quote from TEMARUCO.',
    image: `${BASE_URL}/images/preview-custom.jpg`,
    url: `${BASE_URL}/custom-order`,
    h1: 'Custom Order Request'
  },
  contact: {
    title: 'Contact Us | TEMARUCO',
    description: 'Get in touch with TEMARUCO for inquiries about bulk orders, print-on-demand, souvenirs, fabrics, or design services. We are here to help.',
    image: `${BASE_URL}/images/preview-contact.jpg`,
    url: `${BASE_URL}/contact`,
    h1: 'Contact TEMARUCO'
  },
  about: {
    title: 'About TEMARUCO | Premium Fashion & Creative Solutions',
    description: 'Learn about TEMARUCO, your trusted partner for premium fashion, custom souvenirs, bulk apparel manufacturing, and creative design services in Nigeria.',
    image: `${BASE_URL}/images/preview-about.jpg`,
    url: `${BASE_URL}/about`,
    h1: 'About TEMARUCO'
  },
  careers: {
    title: 'Careers at TEMARUCO | Join Our Team',
    description: 'Explore career opportunities at TEMARUCO. Join our team of creative professionals in fashion, design, and manufacturing.',
    image: `${BASE_URL}/images/preview-careers.jpg`,
    url: `${BASE_URL}/careers`,
    h1: 'Careers at TEMARUCO'
  },
  cart: {
    title: 'Shopping Cart | TEMARUCO',
    description: 'Review your shopping cart and proceed to checkout at TEMARUCO.',
    image: `${BASE_URL}/images/preview-home.jpg`,
    url: `${BASE_URL}/cart`,
    h1: 'Your Shopping Cart'
  },
  orderTracking: {
    title: 'Track Your Order | TEMARUCO',
    description: 'Track the status of your TEMARUCO order. Enter your order ID to get real-time updates on production and delivery.',
    image: `${BASE_URL}/images/preview-home.jpg`,
    url: `${BASE_URL}/track-order`,
    h1: 'Track Your Order'
  },
  priceCalculator: {
    title: 'Price Calculator | TEMARUCO',
    description: 'Calculate pricing for bulk orders, print-on-demand, and custom apparel. Get instant quotes from TEMARUCO.',
    image: `${BASE_URL}/images/preview-bulk.jpg`,
    url: `${BASE_URL}/price-calculator`,
    h1: 'Price Calculator'
  }
};

/**
 * SEO Component for managing page metadata
 * @param {Object} props
 * @param {string} props.title - Page title
 * @param {string} props.description - Meta description
 * @param {string} props.image - OG/Twitter image URL
 * @param {string} props.url - Canonical URL
 * @param {string} props.type - OG type (default: website)
 * @param {Object} props.product - Product data for product pages
 * @param {boolean} props.noindex - Whether to noindex the page
 */
const SEO = ({ 
  title, 
  description, 
  image,
  url,
  type = 'website',
  product = null,
  noindex = false
}) => {
  // If product is provided, use product data
  const seoTitle = product ? `${product.name} | TEMARUCO` : title;
  const seoDescription = product 
    ? (product.short_description || product.description?.substring(0, 160) || description) 
    : description;
  const seoImage = product 
    ? (product.image_url || product.images?.[0] || image) 
    : (image || `${BASE_URL}/images/preview-home.jpg`);
  const seoUrl = url || (typeof window !== 'undefined' ? window.location.href : BASE_URL);
  const seoType = product ? 'product' : type;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{seoTitle}</title>
      <meta name="title" content={seoTitle} />
      <meta name="description" content={seoDescription} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={seoUrl} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={seoType} />
      <meta property="og:url" content={seoUrl} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={seoImage} />
      <meta property="og:site_name" content="TEMARUCO" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={seoUrl} />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={seoImage} />
      
      {/* Product-specific meta tags */}
      {product && product.price && (
        <>
          <meta property="product:price:amount" content={product.price} />
          <meta property="product:price:currency" content="NGN" />
          {product.category && <meta property="product:category" content={product.category} />}
        </>
      )}
      
      {/* Robots */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  );
};

export default SEO;
