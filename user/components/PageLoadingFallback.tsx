import React from 'react';

export function PageLoadingFallback() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 min-h-[50vh]">
      <div className="h-3 w-28 rounded-full skeleton mb-6" />
      <div className="grid md:grid-cols-2 gap-8">
        <div className="aspect-[4/5] rounded-3xl skeleton" />
        <div className="space-y-4">
          <div className="h-8 rounded-xl w-2/3 skeleton" />
          <div className="h-6 rounded-xl w-1/3 skeleton" />
          <div className="h-4 rounded-xl w-full skeleton" />
          <div className="h-4 rounded-xl w-5/6 skeleton" />
        </div>
      </div>
    </div>
  );
}
