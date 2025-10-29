import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, Camera, Flame, FileText } from 'lucide-react';
import RecipeList, { RecipeItem } from '@/components/RecipeList';
import { getConeOptions, type ConeNumber } from '@/utils/coneConversion';
import type { Material } from '@/lib/types';
import materialsData from '@/data/materials.json';

export default function ShareGlaze() {
  // Materials data
  const [materials, setMaterials] = useState<Material[]>([]);
  
  // Image state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  
  // Recipe state
  const [base, setBase] = useState<RecipeItem[]>([{ material: '', amount: '' }]);
  const [additives, setAdditives] = useState<RecipeItem[]>([]);
  
  // Firing details state
  const [cone, setCone] = useState<ConeNumber | ''>('');
  const [atmosphere, setAtmosphere] = useState('');
  const [notes, setNotes] = useState('');
  const [notesCount, setNotesCount] = useState(0);
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const maxNotesLength = 500;
  const coneOptions = getConeOptions();

  // Helper function to normalize material names
  const norm = (s: string) => s.trim().toLowerCase();

  // Load materials from JSON
  useEffect(() => {
    try {
      const normalized = (materialsData as any[]).map((m) => {
        const name = String(m.name || '').trim();
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `material-${Math.random()}`;
        
        return {
          id,
          name,
          type: 'raw' as const,
          loi_pct: Number(m.loi || 0),
          oxideAnalysis: m.oxideAnalysis || {},
        };
      }).filter(m => m.name);
      setMaterials(normalized);
      console.log(`Loaded ${normalized.length} materials`);
    } catch (err) {
      console.error('Failed to load materials:', err);
    }
  }, []);

  // Image validation
  const validateImage = async (file: File): Promise<string[]> => {
    const errors: string[] = [];
    
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      errors.push('Only JPG and PNG formats are allowed');
    }
    
    if (file.size > 5 * 1024 * 1024) {
      errors.push('Image must be smaller than 5MB');
    }
    
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (img.width < 800 || img.height < 800) {
          errors.push('Image must be at least 800x800 pixels');
        }
        resolve(errors);
      };
      img.onerror = () => {
        errors.push('Invalid image file');
        resolve(errors);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (file: File) => {
    setIsValidating(true);
    setValidationErrors([]);
    
    const errors = await validateImage(file);
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      setIsValidating(false);
      return;
    }
    
    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    setImageFile(file);
    setIsValidating(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const clearImage = () => {
    if (uploadedImage) {
      URL.revokeObjectURL(uploadedImage);
    }
    setUploadedImage(null);
    setImageFile(null);
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNotesChange = (value: string) => {
    if (value.length <= maxNotesLength) {
      setNotes(value);
      setNotesCount(value.length);
    }
  };

  const handleSubmit = () => {
    if (!imageFile || !cone) {
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate submission (no backend for MVP)
    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccess(true);
      
      // Reset form after success
      setTimeout(() => {
        setShowSuccess(false);
        clearImage();
        setBase([{ material: '', amount: '' }]);
        setAdditives([]);
        setCone('');
        setAtmosphere('');
        setNotes('');
        setNotesCount(0);
      }, 2000);
    }, 1500);
  };

  const isFormValid = uploadedImage && cone && !validationErrors.length;

  return (
    <div className="container mx-auto max-w-7xl p-6">
      {/* Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Upload Successful!</h3>
            <p className="text-gray-600">Your glaze has been submitted successfully.</p>
          </div>
        </div>
      )}

      <div className="grid gap-8 items-start md:grid-cols-[minmax(0,1fr)_540px]">
        {/* LEFT PANEL - Image Upload & Requirements */}
        <div className="space-y-6">
          <header>
            <h1 className="text-2xl font-semibold">Share Your Glaze</h1>
            <p className="text-muted-foreground text-sm">
              Upload your glaze results to help grow our community knowledge base
            </p>
          </header>

          {/* Upload Zone */}
          <div className="rounded-xl border-2 border-dashed p-6 bg-card transition-colors"
               style={{
                 borderColor: isDragging ? 'hsl(var(--primary))' : validationErrors.length > 0 ? '#ef4444' : 'hsl(var(--border))',
                 backgroundColor: isDragging ? 'hsl(var(--primary) / 0.05)' : 'hsl(var(--card))'
               }}>
            
            {!uploadedImage ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className="flex flex-col items-center justify-center py-12 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-colors ${
                  isDragging ? 'bg-primary/20' : 'bg-muted'
                }`}>
                  <Upload className={`w-10 h-10 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                
                <h3 className="text-lg font-semibold mb-2">
                  {isDragging ? 'Drop your image here' : 'Upload Glaze Image'}
                </h3>
                
                <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                  Drag and drop your glaze photo here, or click to browse
                </p>
                
                <div className="text-xs text-muted-foreground space-y-1 text-center">
                  <p>JPG or PNG • Max 5MB • Min 800x800px</p>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={uploadedImage}
                    alt="Uploaded glaze"
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={clearImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Image uploaded successfully</span>
                </div>
              </div>
            )}

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-900 mb-1">Image validation failed</p>
                    <ul className="text-sm text-red-700 space-y-1">
                      {validationErrors.map((error, idx) => (
                        <li key={idx}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {isValidating && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Validating image...</span>
              </div>
            )}
          </div>

          {/* Image Requirements Card */}
          <div className="rounded-xl border p-6 bg-gradient-to-br from-blue-50 to-background">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              Image Requirements
            </h3>
            
            <div className="grid gap-3">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Clear Glaze Surface</p>
                  <p className="text-xs text-muted-foreground">Well-lit, focused image showing glaze details</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">No Hands Visible</p>
                  <p className="text-xs text-muted-foreground">Photo should show only the ceramic piece</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Minimum Resolution</p>
                  <p className="text-xs text-muted-foreground">At least 800x800 pixels for best quality</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">File Format & Size</p>
                  <p className="text-xs text-muted-foreground">JPG or PNG format, maximum 5MB</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Recipe & Firing Details */}
        <aside className="grid gap-6">
          {/* Base Glaze Recipe */}
          <RecipeList 
            title="Base Glaze" 
            items={base} 
            onChange={setBase}
            materials={materials}
            isAdditive={false}
          />

          {/* Metallic Oxides (Colorants) */}
          <RecipeList
            title="Metallic Oxides (Colorants)"
            items={additives}
            onChange={setAdditives}
            materials={materials}
            isAdditive={true}
          />

          {/* Firing Details Card */}
          <div className="rounded-xl border p-6 bg-card shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-1">Firing Details</h2>
              <p className="text-sm text-muted-foreground">
                Provide firing information for your glaze
              </p>
            </div>

            {/* Cone Number - REQUIRED */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                Cone Number
                <span className="text-red-500">*</span>
              </label>
              <select
                value={cone}
                onChange={(e) => setCone(e.target.value as ConeNumber)}
                className="w-full border-2 rounded-lg px-3 py-2.5 bg-background focus:border-primary focus:outline-none transition-colors"
              >
                <option value="">Select cone number</option>
                {coneOptions.map((c) => (
                  <option key={c} value={c}>
                    Cone {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Atmosphere - Optional */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Atmosphere
              </label>
              <input
                type="text"
                value={atmosphere}
                onChange={(e) => setAtmosphere(e.target.value)}
                placeholder="e.g., Oxidation, Reduction"
                className="w-full border-2 rounded-lg px-3 py-2.5 bg-background focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            {/* Notes - Optional */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Additional Notes
              </label>
              <div className="relative">
                <textarea
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Share details about your glaze application, clay body, or any special techniques..."
                  className="w-full border-2 rounded-lg px-3 py-2.5 bg-background focus:border-primary focus:outline-none transition-colors resize-none h-32"
                  maxLength={maxNotesLength}
                />
              </div>
              <div className="text-right">
                <span className={`text-xs ${notesCount > maxNotesLength * 0.9 ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {notesCount}/{maxNotesLength}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              className="w-full px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed gradient-primary hover:opacity-90 disabled:hover:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Submit Glaze'
              )}
            </button>

            {/* Form validation info */}
            {!uploadedImage && (
              <p className="text-xs text-center text-muted-foreground">
                Please upload an image to continue
              </p>
            )}
            {uploadedImage && !cone && (
              <p className="text-xs text-center text-muted-foreground">
                Please select a cone number to submit
              </p>
            )}
          </div>

          {/* Info Card */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900">
              <span className="font-semibold">Note:</span> Your submission helps build our community knowledge base. All uploads are reviewed before being added to the database.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}