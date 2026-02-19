import React from 'react';
import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://temarucogroup.com';

// Generated social preview images
const PREVIEW_IMAGES = {
  home: 'https://static.prod-images.emergentagent.com/jobs/90d3d445-da5c-4c7b-ad72-0b184f514c68/images/b92217ce6ad70c351ecf5c08dcba16868dbcca5d3fafe45c7aa20ab78d210453.png',
  bulk: 'https://static.prod-images.emergentagent.com/jobs/90d3d445-da5c-4c7b-ad72-0b184f514c68/images/be290f6fb8d67af5cd704b5c8cf30da26a980deae3f8c46e72c9656224675065.png',
  pod: 'https://static.prod-images.emergentagent.com/jobs/90d3d445-da5c-4c7b-ad72-0b184f514c68/images/26c95668be10f5b7a95e84edcb9ac5d7415a46c1b7a9196efdd2758dae32a9a7.png',
  souvenirs: 'https://static.prod-images.emergentagent.com/jobs/90d3d445-da5c-4c7b-ad72-0b184f514c68/images/b8dd131804529c56db26bfe3b8ff111b4aea3e0c7ce40b9da7408c9a0524bdb5.png',
  design: 'https://static.prod-images.emergentagent.com/jobs/90d3d445-da5c-4c7b-ad72-0b184f514c68/images/51ed262d794d52f874812499a115b86735a67e4ed8106904f7002ad9197a656b.png',
  fabrics: 'https://static.prod-images.emergentagent.com/jobs/90d3d445-da5c-4c7b-ad72-0b184f514c68/images/207c3dfea0e3f95a2e7ba9e7a6a1cd2faeabc81d25ddf827acbdd9f841e3c8af.png',
  boutique: 'https://static.prod-images.emergentagent.com/jobs/90d3d445-da5c-4c7b-ad72-0b184f514c68/images/b21197e399fb874ef9e0a2da0303eac89bfc70355d0749be345d399a6f0deeb1.png'
};

// SEO configuration for all static pages
export const SEO_CONFIG = {
  home: {
    title: 'TEMARUCO – Premium Fashion, Souvenirs & Creative Solutions',
    description: 'TEMARUCO is your premium hub for fashion, custom souvenirs, bulk apparel, and creative design services.',
    image: PREVIEW_IMAGES.home,
    url: `${BASE_URL}/`,
    h1: 'TEMARUCO – Premium Fashion, Souvenirs & Creative Solutions'
  },
  bulkOrders: {
    title: 'Bulk Apparel Manufacturing & Custom T-Shirts | TEMARUCO',
    description: 'Order bulk custom clothing for schools, churches, events, and corporate branding. Minimum 50 pieces per item. High-quality production and delivery across Nigeria.',
    image: PREVIEW_IMAGES.bulk,
    url: `${BASE_URL}/bulk-orders`,
    h1: 'Bulk Apparel Manufacturing & Custom T-Shirts'
  },
  printOnDemand: {
    title: 'Print on Demand Services in Nigeria | TEMARUCO',
    description: 'High-quality print on demand services for t-shirts, hoodies, and merchandise. Design freely, see realistic mock-ups, and enjoy fast nationwide production.',
    image: PREVIEW_IMAGES.pod,
    url: `${BASE_URL}/print-on-demand`,
    h1: 'Premium Print on Demand Services'
  },
  souvenirs: {
    title: 'Custom Souvenirs & Corporate Gifts in Nigeria | TEMARUCO',
    description: 'Premium custom souvenirs including cups, backpacks, umbrellas, hand fans, and more. Perfect for events, branding, and promotional campaigns.',
    image: PREVIEW_IMAGES.souvenirs,
    url: `${BASE_URL}/souvenirs`,
    h1: 'Custom Souvenirs & Corporate Gifts'
  },
  designServices: {
    title: 'Professional Graphic Design Services | TEMARUCO',
    description: 'Creative design services for branding, apparel, packaging, and promotional materials. Work with TEMARUCO to bring your vision to life.',
    image: PREVIEW_IMAGES.design,
    url: `${BASE_URL}/design-services`,
    h1: 'Creative Design Services'
  },
  fabrics: {
    title: 'Premium Fabrics & Materials in Nigeria | TEMARUCO',
    description: 'High-quality fabrics available by the yard. Perfect for tailoring, bulk orders, and creative production.',
    image: PREVIEW_IMAGES.fabrics,
    url: `${BASE_URL}/fabrics`,
    h1: 'Premium Fabrics & Materials'
  },
  boutique: {
    title: 'Premium Clothing Boutique | TEMARUCO',
    description: "Explore TEMARUCO's boutique collection including cultural wear, modern wear, and blanks for custom designs.",
    image: PREVIEW_IMAGES.boutique,
    url: `${BASE_URL}/boutique`,
    h1: 'Premium Clothing Boutique'
  },
  customOrder: {
    title: 'Custom Order Request | TEMARUCO',
    description: 'Submit a custom order request for bulk apparel, souvenirs, or special manufacturing needs. Get a personalized quote from TEMARUCO.',
    image: PREVIEW_IMAGES.home,
    url: `${BASE_URL}/custom-order`,
    h1: 'Custom Order Request'
  },
  contact: {
    title: 'Contact Us | TEMARUCO',
    description: 'Get in touch with TEMARUCO for inquiries about bulk orders, print-on-demand, souvenirs, fabrics, or design services. We are here to help.',
    image: PREVIEW_IMAGES.home,
    url: `${BASE_URL}/contact`,
    h1: 'Contact TEMARUCO'
  },
  about: {
    title: 'About TEMARUCO | Premium Fashion & Creative Solutions',
    description: 'Learn about TEMARUCO, your trusted partner for premium fashion, custom souvenirs, bulk apparel manufacturing, and creative design services in Nigeria.',
    image: PREVIEW_IMAGES.home,
    url: `${BASE_URL}/about`,
    h1: 'About TEMARUCO'
  },
  careers: {
    title: 'Careers at TEMARUCO | Join Our Team',
    description: 'Explore career opportunities at TEMARUCO. Join our team of creative professionals in fashion, design, and manufacturing.',
    image: PREVIEW_IMAGES.home,
    url: `${BASE_URL}/careers`,
    h1: 'Careers at TEMARUCO'
  },
  cart: {
    title: 'Shopping Cart | TEMARUCO',
    description: 'Review your shopping cart and proceed to checkout at TEMARUCO.',
    image: PREVIEW_IMAGES.home,
    url: `${BASE_URL}/cart`,
    h1: 'Your Shopping Cart'
  },
  orderTracking: {
    title: 'Track Your Order | TEMARUCO',
    description: 'Track the status of your TEMARUCO order. Enter your order ID to get real-time updates on production and delivery.',
    image: PREVIEW_IMAGES.home,
    url: `${BASE_URL}/track-order`,
    h1: 'Track Your Order'
  },
  priceCalculator: {
    title: 'Price Calculator | TEMARUCO',
    description: 'Calculate pricing for bulk orders, print-on-demand, and custom apparel. Get instant quotes from TEMARUCO.',
    image: PREVIEW_IMAGES.bulk,
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
