import React from 'react';

const AboutPage = () => {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-oswald text-5xl font-bold uppercase mb-6" data-testid="about-title">About Temaruco</h1>
        
        <div className="prose prose-lg">
          <p className="font-manrope text-lg text-zinc-700 leading-relaxed mb-6">
            Temaruco Clothing Factory is Nigeria's premier clothing manufacturing company, 
            specializing in bulk orders, print-on-demand services, and boutique collections.
          </p>

          <div className="my-8">
            <img 
              src="https://customer-assets.emergentagent.com/job_7aeb087a-f6e4-4eea-9dca-48ba486735b4/artifacts/n0juj7g9_227249.png" 
              alt="Temaruco factory floor with workers at sewing machines" 
              className="w-full rounded-xl"
              style={{
                aspectRatio: '16/9',
                objectFit: 'contain',
                objectPosition: 'center'
              }}
            />
          </div>

          <h2 className="font-oswald text-3xl font-semibold uppercase mt-12 mb-4">Our Mission</h2>
          <p className="font-manrope text-zinc-700 leading-relaxed mb-6">
            To inspire, empower, and help businesses and individuals accomplish their goals through 
            high-quality, professionally manufactured clothing. We believe in the power of great apparel 
            to transform brands and businesses.
          </p>

          <h2 className="font-oswald text-3xl font-semibold uppercase mt-12 mb-4">Our Values</h2>
          <ul className="list-disc pl-6 space-y-2 font-manrope text-zinc-700">
            <li>Quality craftsmanship in every stitch</li>
            <li>Fast and reliable production timelines</li>
            <li>Fair pricing for all order sizes</li>
            <li>Customer satisfaction guarantee</li>
            <li>Innovation in manufacturing processes</li>
          </ul>

          <h2 className="font-oswald text-3xl font-semibold uppercase mt-12 mb-4">Why Choose Us</h2>
          <p className="font-manrope text-zinc-700 leading-relaxed mb-4">
            With over a decade of experience in the clothing manufacturing industry, Temaruco has 
            become the trusted partner for businesses, schools, hospitals, and entrepreneurs across Nigeria.
          </p>
          <p className="font-manrope text-zinc-700 leading-relaxed">
            Our state-of-the-art facility, skilled workforce, and commitment to excellence ensure 
            that every order meets the highest standards of quality and professionalism.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
