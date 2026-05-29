"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import Image from "next/image";

interface SthitaprajnaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SthitaprajnaModal({ isOpen, onClose }: SthitaprajnaModalProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  // Prevent scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl bg-gradient-to-br from-[#0f2c29] via-[#0b4b45] to-[#04332f] p-1 shadow-2xl ring-1 ring-emerald-500/30"
          >
            {/* Subtle texture overlay */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
            
            <div className="relative rounded-xl bg-gradient-to-b from-[#0f2c29]/90 to-[#04332f]/95 p-8 backdrop-blur-md">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 rounded-full bg-black/20 p-2 text-emerald-200/70 transition-colors hover:bg-black/40 hover:text-emerald-100"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6 h-32 w-32 shrink-0 overflow-hidden rounded-full border border-[#d4af37]/30 shadow-[0_0_40px_rgba(212,175,55,0.15)] ring-4 ring-[#0f2c29] ring-offset-2 ring-offset-[#d4af37]/20">
                  <Image 
                    src="/images/sthitaprajna.png" 
                    alt="Peacock Feather and Flute" 
                    fill 
                    className="object-cover"
                    priority
                  />
                </div>

                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-1 text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#d4af37]"
                >
                  Sthitaprajna
                </motion.h2>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-6 text-2xl text-emerald-200/90 font-medium tracking-widest"
                >
                  स्थितप्रज्ञ
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-4 text-[15px] leading-relaxed text-emerald-100/90 px-2 sm:px-6"
                >
                  <p className="font-medium text-emerald-50 text-base">
                    <strong className="text-[#f3e5ab] font-semibold">Sthitapragya</strong> — The steady mind in an unsteady world.
                  </p>
                  <p>
                    Everyone reaches a moment where life feels uncertain — a hard decision, a painful loss, a sudden success, or a challenge that shakes the heart.
                  </p>
                  <p>
                    In the Gita, Arjuna stands at a life-changing crossroads. He is a warrior, but in that moment he feels overwhelmed, confused, and unsure of what is right. Krishna does not tell him to ignore his emotions. Instead, he teaches him to pause, steady his mind, and act with clarity.
                  </p>
                  <p className="italic text-emerald-200/80">
                    Sthitapragya is that inner balance — peaceful in difficulty, humble in success, and steady through every change.
                  </p>
                </motion.div>
                
                {/* Progress bar line that acts as a 10s timer */}
                <motion.div className="mt-8 h-1 w-full overflow-hidden rounded-full bg-black/30">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 10, ease: "linear" }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-[#d4af37] to-emerald-400"
                  />
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
