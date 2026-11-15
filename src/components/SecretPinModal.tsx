'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { ShieldCheck, Delete, X, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SecretPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SecretPinModal({ isOpen, onClose, onSuccess }: SecretPinModalProps) {
  const { unlockSuperAdmin, language } = useApp();
  const isHindi = language === 'hi';

  const [pin, setPin] = useState<string>('');
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setIsError(false);
      setErrorMessage('');
    }
  }, [isOpen]);

  const handleDigit = useCallback(
    (digit: string) => {
      if (pin.length >= 6) return;
      const nextPin = pin + digit;
      setPin(nextPin);
      setIsError(false);
      setErrorMessage('');

      if (nextPin.length === 6) {
        // Auto verify
        const success = unlockSuperAdmin(nextPin);
        if (success) {
          try {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 },
            });
          } catch {}
          if (onSuccess) onSuccess();
          onClose();
        } else {
          setIsError(true);
          setErrorMessage(isHindi ? 'गलत गुप्त पिन (Incorrect PIN)' : 'Incorrect Secret PIN');
          setTimeout(() => {
            setPin('');
            setIsError(false);
          }, 800);
        }
      }
    },
    [pin, unlockSuperAdmin, onSuccess, onClose, isHindi]
  );

  const handleBackspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setIsError(false);
    setErrorMessage('');
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleDigit, handleBackspace, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div
        className={`w-full max-w-xs bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 text-white shadow-2xl shadow-cyan-950/80 flex flex-col items-center transition-transform ${
          isError ? 'animate-shake' : ''
        }`}
      >
        {/* Top Close Button */}
        <div className="w-full flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shield Icon */}
        <div className="w-14 h-14 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-3 shadow-lg shadow-cyan-500/10">
          <ShieldCheck className="w-8 h-8 stroke-[2.2px]" />
        </div>

        {/* Title */}
        <h3 className="text-base font-black text-white text-center tracking-wide">
          {isHindi ? 'गुप्त सुरक्षा कोड' : 'Super Admin Access'}
        </h3>
        <p className="text-[11px] text-slate-400 text-center mt-1">
          {isHindi ? '6-अंकीय गुप्त पिन दर्ज करें' : 'Enter 6-digit Secret PIN'}
        </p>

        {/* 6 Dots Indicator */}
        <div className="flex items-center justify-center gap-3 my-5">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const isFilled = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                  isError
                    ? 'bg-rose-500 scale-110 shadow-lg shadow-rose-500/50'
                    : isFilled
                    ? 'bg-cyan-400 scale-110 shadow-md shadow-cyan-400/50'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        <div className="h-4 text-[11px] text-rose-400 font-bold mb-2">
          {errorMessage || ' '}
        </div>

        {/* Dialpad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[240px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-13 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-cyan-900 border border-slate-700/70 text-lg font-bold text-slate-100 flex items-center justify-center transition-all active:scale-95 shadow-sm"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-13 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-cyan-900 border border-slate-700/70 text-lg font-bold text-slate-100 flex items-center justify-center transition-all active:scale-95 shadow-sm"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-13 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-rose-950 border border-slate-700/70 text-slate-300 hover:text-white flex items-center justify-center transition-all active:scale-95 shadow-sm"
            title="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

