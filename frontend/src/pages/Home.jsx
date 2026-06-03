import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, ShieldCheck, UserCheck, Layers, ArrowRight } from 'lucide-react';

const Home = () => {
  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col justify-center items-center px-6 py-16 md:py-24 text-center">
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-muted border border-primary/15 text-primary text-xs font-semibold uppercase tracking-wider mb-8">
          <Camera size={14} />
          AI-Powered Media Platform
        </div>
        
        {/* Hero Heading — tight tracking & line-height */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6" style={{ lineHeight: '1.08', letterSpacing: '-0.025em' }}>
          A Smarter Hub for <br />
          <span className="gradient-text">Event-Driven Media</span>
        </h1>
        
        {/* Subheading */}
        <p className="text-base md:text-lg text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
          The ultimate platform for clubs, photographers, and members. Seamlessly upload, organize, search, and protect your memories with automated facial recognition and dynamic watermarking.
        </p>

        {/* CTAs — Primary = Trust Blue, Secondary = Ghost */}
        <div className="flex flex-col sm:flex-row gap-3 mb-20">
          <Link to="/register" className="btn btn-primary btn-lg">
            Get Started
            <ArrowRight size={18} />
          </Link>
          <Link to="/login" className="btn btn-secondary btn-lg">
            Log In
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="glass-card hover:glass-card-hover group">
            <div className="w-11 h-11 rounded-md bg-primary-muted border border-primary/15 flex items-center justify-center text-primary mb-5">
              <UserCheck size={22} />
            </div>
            <h3 className="text-base font-bold text-text-primary mb-2">Facial Recognition</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Upload a reference selfie. Our AI scans event albums to automatically find photos you're in and delivers them to your personalized section.
            </p>
          </div>

          <div className="glass-card hover:glass-card-hover group">
            <div className="w-11 h-11 rounded-md bg-success-muted border border-success/15 flex items-center justify-center text-success mb-5">
              <ShieldCheck size={22} />
            </div>
            <h3 className="text-base font-bold text-text-primary mb-2">Dynamic Watermarking</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Protects original photographer files. Previews are watermarked dynamically on the fly based on the club, event, and user role.
            </p>
          </div>

          <div className="glass-card hover:glass-card-hover group">
            <div className="w-11 h-11 rounded-md bg-warning-muted border border-warning/15 flex items-center justify-center text-warning mb-5">
              <Layers size={22} />
            </div>
            <h3 className="text-base font-bold text-text-primary mb-2">Direct Cloud Upload</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Photographers request S3 presigned URLs to upload bulk gigabytes directly to AWS S3, bypassing server limitations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
