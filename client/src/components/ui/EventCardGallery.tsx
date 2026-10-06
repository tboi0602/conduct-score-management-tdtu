"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export function EventCardGallery({
  images,
  onImageClick,
  className = "",
}: {
  images?: string[];
  onImageClick?: (index: number) => void;
  className?: string;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const validImages = useMemo(() => {
    return (images ?? []).filter((img) => typeof img === "string" && img.trim().length > 0);
  }, [images]);

  if (!validImages || validImages.length === 0) return null;

  const count = validImages.length;

  const handleClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (onImageClick) {
      onImageClick(index);
    } else {
      setLightboxIndex(index);
    }
  };

  const closeModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxIndex(null);
  };

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
    <div className={`mt-3 w-full select-none ${className}`}>
      {/* 1 tấm ảnh: hiển thị nguyên vẹn tỷ lệ tự nhiên, giới hạn max-height để không tràn màn hình */}
      {count === 1 && (
        <div
          onClick={(e) => handleClick(e, 0)}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-[#d8e2ed] bg-[#f8fafc] text-center"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={validImages[0]}
            alt="Event thumbnail"
            loading="lazy"
            className="max-h-72 w-full object-contain transition duration-300 group-hover:scale-[1.01]"
          />
        </div>
      )}

      {/* 2 tấm ảnh: bố cục 2 cột cân xứng facebook */}
      {count === 2 && (
        <div className="grid grid-cols-2 gap-1.5 overflow-hidden rounded-2xl border border-[#d8e2ed] bg-[#f8fafc] p-0.5">
          {validImages.map((src, idx) => (
            <div
              key={idx}
              onClick={(e) => handleClick(e, idx)}
              className="group relative aspect-[4/3] cursor-pointer overflow-hidden rounded-xl bg-slate-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Event image ${idx + 1}`}
                loading="lazy"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            </div>
          ))}
        </div>
      )}

      {/* 3 tấm ảnh: 1 ảnh lớn bên trái, 2 ảnh nhỏ xếp dọc bên phải */}
      {count === 3 && (
        <div className="grid grid-cols-3 gap-1.5 overflow-hidden rounded-2xl border border-[#d8e2ed] bg-[#f8fafc] p-0.5">
          <div
            onClick={(e) => handleClick(e, 0)}
            className="group relative col-span-2 aspect-[4/3] cursor-pointer overflow-hidden rounded-xl bg-slate-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={validImages[0]}
              alt="Event image 1"
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            {validImages.slice(1, 3).map((src, idx) => (
              <div
                key={idx + 1}
                onClick={(e) => handleClick(e, idx + 1)}
                className="group relative flex-1 cursor-pointer overflow-hidden rounded-xl bg-slate-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Event image ${idx + 2}`}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 tấm ảnh: bố cục 4 ô grid 2x2 */}
      {count === 4 && (
        <div className="grid grid-cols-2 gap-1.5 overflow-hidden rounded-2xl border border-[#d8e2ed] bg-[#f8fafc] p-0.5">
          {validImages.map((src, idx) => (
            <div
              key={idx}
              onClick={(e) => handleClick(e, idx)}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-slate-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`Event image ${idx + 1}`}
                loading="lazy"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            </div>
          ))}
        </div>
      )}

      {/* 5+ tấm ảnh: layout Facebook kèm overlay +N */}
      {count >= 5 && (
        <div className="grid grid-cols-6 gap-1.5 overflow-hidden rounded-2xl border border-[#d8e2ed] bg-[#f8fafc] p-0.5">
          <div
            onClick={(e) => handleClick(e, 0)}
            className="group relative col-span-3 aspect-square cursor-pointer overflow-hidden rounded-xl bg-slate-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={validImages[0]}
              alt="Event image 1"
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          </div>
          <div
            onClick={(e) => handleClick(e, 1)}
            className="group relative col-span-3 aspect-square cursor-pointer overflow-hidden rounded-xl bg-slate-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={validImages[1]}
              alt="Event image 2"
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          </div>
          <div
            onClick={(e) => handleClick(e, 2)}
            className="group relative col-span-2 aspect-square cursor-pointer overflow-hidden rounded-xl bg-slate-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={validImages[2]}
              alt="Event image 3"
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          </div>
          <div
            onClick={(e) => handleClick(e, 3)}
            className="group relative col-span-2 aspect-square cursor-pointer overflow-hidden rounded-xl bg-slate-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={validImages[3]}
              alt="Event image 4"
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          </div>
          <div
            onClick={(e) => handleClick(e, 4)}
            className="group relative col-span-2 aspect-square cursor-pointer overflow-hidden rounded-xl bg-slate-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={validImages[4]}
              alt="Event image 5"
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
            {count > 5 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 font-bold text-white transition hover:bg-black/70">
                <span className="text-base font-extrabold sm:text-lg">+{count - 5}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Modal preview full-size khi click vào ảnh */}
      {lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={closeModal}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/40"
          >
            <X size={24} />
          </button>

          {count > 1 && (
            <button
              type="button"
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2.5 text-white hover:bg-white/40"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {count > 1 && (
            <button
              type="button"
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2.5 text-white hover:bg-white/40"
            >
              <ChevronRight size={28} />
            </button>
          )}

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={validImages[lightboxIndex]}
              alt={`Preview ${lightboxIndex + 1}`}
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl"
            />
            <div className="mt-2 text-center text-sm font-medium text-slate-300">
              {lightboxIndex + 1} / {count}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
