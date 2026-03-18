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
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimate(true));
      });
    } else {
      setAnimate(false);
      const timer = setTimeout(() => setShow(false), 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!show) return null;

  const accentColor = 
    type === "danger" ? "border-red-500/20" : 
    type === "success" ? "border-emerald-500/20" : 
    "border-white/[0.08]";

  const iconBg =
    type === "danger" ? "bg-red-500/10 text-red-400" :
    type === "success" ? "bg-emerald-500/10 text-emerald-400" :
    "bg-blue-500/10 text-blue-400";

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-250 ${
        animate ? "bg-black/60 backdrop-blur-md" : "bg-black/0 backdrop-blur-none"
      }`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className={`
          w-full max-w-md glass-panel rounded-2xl border ${accentColor}
          transform transition-all duration-250 ease-out
          ${animate ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"}
        `}
      >
        <div className="p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
              {type === "danger" ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              ) : type === "success" ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>
            </div>
            <button 
              onClick={onClose}
              className="text-white/20 hover:text-white/60 transition-colors p-1 -mr-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <div className="text-white/50 text-sm leading-relaxed pl-14">
            {children}
          </div>

          {footer && (
            <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3 pl-14">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
