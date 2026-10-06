"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function extractImagesFromHtml(html: string): { cleanedHtml: string; images: string[] } {
  if (!html) return { cleanedHtml: "", images: [] };
  const images: string[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    if (match[1]) {
      images.push(match[1]);
    }
  }
  // Remove standalone img tags or paragraphs wrapping them from the html body to prevent duplicate display
  const cleanedHtml = html.replace(/<p>\s*<img[^>]+>\s*<\/p>/gi, "").replace(/<img[^>]+>/gi, "");

  return { cleanedHtml, images };
}

interface FacebookImageGalleryProps {
  images: string[];
}

export function FacebookImageGallery({ images }: { images: string[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  const count = images.length;
  const openModal = (idx: number) => setLightboxIndex(idx);
  const closeModal = () => setLightboxIndex(null);

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + count) % count);
    }
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % count);
    }
  };

  return (
    <div className="w-full">
      {/* 1 Image: Full width, responsive height, max height */}
      {count === 1 && (
        <div
          onClick={() => openModal(0)}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-[#d8e2ed] bg-slate-100"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[0]}
            alt="Event image"
            loading="lazy"
            className="max-h-[520px] w-full object-cover transition duration-300 group-hover:scale-[1.01]"
          />
        </div>
      )}

      {/* 2 Images: Side-by-side grid */}
      {count === 2 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((src, idx) => (
            <div
              key={idx}
              onClick={() => openModal(idx)}
              className="group relative aspect-[4/3] max-h-[420px] cursor-pointer overflow-hidden rounded-2xl border border-[#d8e2ed] bg-slate-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Event image ${idx + 1}`}
                loading="lazy"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />
            </div>
          ))}
        </div>
      )}

      {/* 3 Images: 1 large on left, 2 stacked on right */}
      {count === 3 && (
        <div className="grid grid-cols-3 gap-2">
          <div
            onClick={() => openModal(0)}
            className="group relative col-span-2 aspect-[4/3] max-h-[450px] cursor-pointer overflow-hidden rounded-2xl border border-[#d8e2ed] bg-slate-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[0]}
              alt="Event image 1"
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          </div>
          <div className="col-span-1 flex flex-col gap-2">
            {[1, 2].map((idx) => (
              <div
                key={idx}
                onClick={() => openModal(idx)}
                className="group relative flex-1 aspect-square max-h-[220px] cursor-pointer overflow-hidden rounded-2xl border border-[#d8e2ed] bg-slate-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[idx]}
                  alt={`Event image ${idx + 1}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 Images: 2x2 Grid */}
      {count === 4 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((src, idx) => (
            <div
              key={idx}
              onClick={() => openModal(idx)}
              className="group relative aspect-[4/3] max-h-[300px] cursor-pointer overflow-hidden rounded-2xl border border-[#d8e2ed] bg-slate-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Event image ${idx + 1}`}
                loading="lazy"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />
            </div>
          ))}
        </div>
      )}

      {/* 5+ Images: Facebook layout (first 3 + 4th with +N overlay) */}
      {count >= 5 && (
        <div className="grid grid-cols-2 gap-2">
          {images.slice(0, 3).map((src, idx) => (
            <div
              key={idx}
              onClick={() => openModal(idx)}
              className="group relative aspect-[4/3] max-h-[260px] cursor-pointer overflow-hidden rounded-2xl border border-[#d8e2ed] bg-slate-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Event image ${idx + 1}`}
                loading="lazy"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />
            </div>
          ))}
          <div
            onClick={() => openModal(3)}
            className="group relative aspect-[4/3] max-h-[260px] cursor-pointer overflow-hidden rounded-2xl border border-[#d8e2ed] bg-slate-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[3]}
              alt="Event image 4"
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 font-bold text-white backdrop-blur-[2px] transition group-hover:bg-black/50">
              <span className="text-2xl md:text-3xl">+{count - 3}</span>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Modal */}
      {lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-[fade-in_.2s_ease-out]"
        >
          <button
            type="button"
            onClick={closeModal}
            aria-label="Close"
            className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/30"
          >
            <X size={20} />
          </button>

          {count > 1 && (
            <button
              type="button"
              onClick={prevImage}
              aria-label="Previous"
              className="absolute left-4 top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/30"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[88vh] max-w-[92vw] overflow-hidden rounded-2xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[lightboxIndex]}
              alt={`Event photo ${lightboxIndex + 1}`}
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur">
              {lightboxIndex + 1} / {count}
            </div>
          </div>

          {count > 1 && (
            <button
              type="button"
              onClick={nextImage}
              aria-label="Next"
              className="absolute right-4 top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/30"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
