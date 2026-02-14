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
    type === "danger" ? "border-red-500/20" : 
    type === "success" ? "border-green-500/20" : 
    "border-white/10";

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${animate ? "bg-black/60 backdrop-blur-sm" : "bg-black/0 backdrop-blur-none"}`}>
      <div 
        className={`
          w-full max-w-lg glass-panel rounded-xl border ${borderColor}
          transform transition-all duration-300 ease-out
          ${animate ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"}
        `}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>
            <button 
              onClick={onClose}
              className="text-muted-foreground hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div className="text-muted-foreground text-sm leading-relaxed">
            {children}
          </div>

          {footer && (
            <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
