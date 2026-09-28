import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quản lý điểm rèn luyện TDTU | TDTU Conduct Score",
    short_name: "TDTU Conduct",
    description: "Ứng dụng quản lý điểm rèn luyện và điểm danh sự kiện TDTU",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#f5f7fa",
    theme_color: "#154a9b",
    orientation: "portrait-primary",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
