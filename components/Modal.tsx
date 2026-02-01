"use client";

import { useEffect, useState } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  type?: "default" | "danger" | "success";
}

export default function Modal({ isOpen, onClose, title, children, footer, type = "default" }: ModalProps) {
  const [show, setShow] = useState(isOpen);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
      setTimeout(() => setAnimate(true), 10);
    } else {
      setAnimate(false);
      setTimeout(() => setShow(false), 300);
    }
  }, [isOpen]);

  if (!show) return null;

  const borderColor = 
    type === "danger" ? "border-red-500/30" : 
    type === "success" ? "border-green-500/30" : 
    "border-white/10";

  const glowColor = 
    type === "danger" ? "shadow-red-500/20" : 
    type === "success" ? "shadow-green-500/20" : 
    "shadow-blue-500/20";

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${animate ? "bg-black/60 backdrop-blur-sm" : "bg-black/0 backdrop-blur-none"}`}>
      <div 
        className={`
          w-full max-w-lg glass-card rounded-3xl border ${borderColor} shadow-2xl ${glowColor}
          transform transition-all duration-300 ease-out
          ${animate ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"}
        `}
      >
        <div className="p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold text-white tracking-tight">{title}</h3>
            <button 
              onClick={onClose}
              className="text-white/40 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div className="text-white/80 text-lg leading-relaxed">
            {children}
          </div>

          {footer && (
            <div className="mt-8 flex justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
