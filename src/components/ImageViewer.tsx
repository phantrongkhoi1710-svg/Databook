import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt?: string;
  className?: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ src, alt = 'Biển tên thiết bị', className = '' }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.5, 1));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - startPos.x,
      y: e.clientY - startPos.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className={`relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 ${className}`}>
      {/* Control bar */}
      <div className="absolute top-3 right-3 z-10 flex items-center space-x-1.5 bg-slate-900/85 backdrop-blur-md px-2 py-1.5 rounded-xl border border-slate-700/60 shadow-lg text-white">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Phóng to"
          className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-200 transition"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Thu nhỏ"
          className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-200 transition"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleReset}
          title="Về mặc định"
          className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-200 transition"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono px-1.5 text-cyan-300 font-semibold border-l border-slate-700 ml-1">
          {Math.round(scale * 100)}%
        </span>
      </div>

      <div className="absolute bottom-3 left-3 z-10 bg-slate-900/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-700 text-[11px] text-slate-300 pointer-events-none">
        {scale > 1 ? 'Kéo chuột để di chuyển ảnh soi chi tiết dập nổi' : 'Dùng nút zoom để soi rõ nét dập kim loại'}
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`w-full h-full flex items-center justify-center p-2 min-h-[340px] max-h-[550px] overflow-hidden select-none ${
          scale > 1 ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className="max-h-[500px] w-auto max-w-full object-contain rounded-lg shadow-2xl"
        />
      </div>
    </div>
  );
};
