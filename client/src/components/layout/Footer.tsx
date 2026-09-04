"use client";

export default function Footer() {
  return (
    <footer className="border-t px-6 py-4 text-center text-sm text-gray-500">
      &copy; {new Date().getFullYear()} Smart Conduct Score Management
    </footer>
  );
}