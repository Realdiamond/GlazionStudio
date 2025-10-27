import React from 'react';

export default function ImageToRecipes() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="text-center mb-12">
        <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
          Coming Soon
        </div>
        <h1 className="text-4xl font-bold mb-4">AI-Powered Glaze Analysis</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload a photo of any ceramic glaze and let our AI instantly identify its recipe, composition, and firing details.
        </p>
      </div>

      <div className="grid gap-8 mb-12">
        <div className="rounded-2xl border-2 border-dashed p-8 bg-muted/30">
          <div className="aspect-video bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <svg className="w-24 h-24 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm">Image upload preview</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border p-6 bg-card">
            <h3 className="font-semibold text-lg mb-3">📸 What You Upload</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Photo of a finished glaze surface</li>
              <li>• Test tile or completed ceramic piece</li>
              <li>• Clear, well-lit image for best results</li>
            </ul>
          </div>

          <div className="rounded-xl border p-6 bg-card">
            <h3 className="font-semibold text-lg mb-3">🤖 What AI Analyzes</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Color, texture, and surface characteristics</li>
              <li>• Visual patterns and glaze behavior</li>
              <li>• Reference database of known glazes</li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border p-8 bg-gradient-to-br from-primary/5 to-background">
          <h3 className="font-semibold text-xl mb-6 text-center">What You'll Receive</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <span className="text-primary">✓</span> Complete Recipe
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Full chemical composition with precise percentages of each ingredient (Feldspar, Silica, Kaolin, Whiting, Colorants, etc.)
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <span className="text-primary">✓</span> Chemistry Analysis
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                UMF (Unity Molecular Formula) calculations showing oxide ratios and glaze chemistry breakdown
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <span className="text-primary">✓</span> Firing Details
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Recommended cone temperature, firing atmosphere (oxidation/reduction), and firing schedule
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <span className="text-primary">✓</span> Additional Notes
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Application tips, surface characteristics, potential variations, and similar glaze suggestions
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-muted-foreground mb-4">
          Our AI model is currently in training. We're analyzing thousands of glaze images and recipes to provide you with accurate, reliable results.
        </p>
        <button className="rounded-xl bg-muted text-muted-foreground px-6 py-3 font-medium cursor-not-allowed" disabled>
          Feature In Development
        </button>
      </div>
    </div>
  );
}