import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, ShieldCheck, Heart, UserCheck, Sparkles, Layers } from 'lucide-react';

const Home = () => {
  return (
    <div className="min-h-[calc(100vh-100px)] flex flex-col justify-center items-center px-6 py-12 md:py-24 text-center">
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-6 animate-pulse">
          <Sparkles size={14} /> Powered by AI & S3 Cloud Integration
        </div>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold font-heading tracking-tight mb-6 leading-tight">
          A Smarter Hub for <br />
          <span className="gradient-text">Event-Driven Media</span>
        </h1>
        
        <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
          The ultimate platform for clubs, photographers, and members. Seamlessly upload, organize, search, and protect your memories with automated facial recognition and dynamic watermarking.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <Link to="/register" className="btn btn-primary text-base px-8 py-3.5">
            Get Started
          </Link>
          <Link to="/login" className="btn btn-secondary text-base px-8 py-3.5">
            Log In
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full text-left mt-8">
          <div className="glass-card hover:glass-card-hover p-8">
            <div className="w-12 h-12 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mb-5">
              <UserCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Facial Recognition</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Upload a reference selfie. Our AI scans event albums to automatically find photos you're in and delivers them to your personalized section.
            </p>
          </div>

          <div className="glass-card hover:glass-card-hover p-8">
            <div className="w-12 h-12 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent mb-5">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Dynamic Watermarking</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Protects original photographer files. Previews are watermarked dynamically on the fly based on the club, event, and user role.
            </p>
          </div>

          <div className="glass-card hover:glass-card-hover p-8">
            <div className="w-12 h-12 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mb-5">
              <Layers size={24} />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Direct Cloud Upload</h3>
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
