import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ 
  title, 
  description, 
  keywords,
  image = '/og-image.png',
  url,
  type = 'website'
}) => {
  const siteName = 'Temaruco Clothing Factory';
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const defaultDescription = "Nigeria's leading clothing factory for bulk orders, print-on-demand, corporate uniforms, and custom fashion. Quality craftsmanship, competitive prices, fast delivery.";
  const defaultKeywords = "bulk clothing Nigeria, custom uniforms, print on demand Nigeria, corporate clothing, school uniforms, fabric supplier, clothing factory Lagos";
  
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description || defaultDescription} />
      <meta name="keywords" content={keywords || defaultKeywords} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url || window.location.href} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description || defaultDescription} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteName} />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url || window.location.href} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description || defaultDescription} />
      <meta property="twitter:image" content={image} />
    </Helmet>
  );
};

export default SEO;
