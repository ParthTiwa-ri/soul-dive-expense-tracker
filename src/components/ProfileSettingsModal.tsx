'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '@/context/AppContext';
import { DEFAULT_PROFILES, MANU_PROFILE_PIN } from '@/lib/constants';
import { UserProfile } from '@/types';
import { X, Check, Globe, Shield, LogOut, Lock, ArrowLeft, Delete, RefreshCw } from 'lucide-react';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileSettingsModal({ isOpen, onClose }: ProfileSettingsModalProps) {
  const {
    currentUser,
    setCurrentUser,
    language,
    setLanguage,
    isSuperAdmin,
    exitSuperAdmin,
    triggerSync,
  } = useApp();

  const [mounted, setMounted] = useState(false);
  const [isVerifyingManu, setIsVerifyingManu] = useState(false);
  const [pin, setPin] = useState('');
  const [isPinError, setIsPinError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setIsVerifyingManu(false);
      setPin('');
      setIsPinError(false);
    }
  }, [isOpen]);

  const isHindi = language === 'hi';

  const handleSelectProfile = (profile: UserProfile) => {
    if (currentUser.id === profile.id) return;

    // Switching to Manu Shukla requires 4-digit PIN 4231
    if (profile.fullName.toLowerCase().includes('manu')) {
      setPin('');
      setIsPinError(false);
      setIsVerifyingManu(true);
      return;
    }

    // Switching to Krishn Murari Tiwari or other profiles: immediate switch (no PIN)
    setCurrentUser(profile);
  };

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setIsPinError(false);

    if (nextPin.length === 4) {
      if (nextPin === MANU_PROFILE_PIN) {
        const manuProfile = DEFAULT_PROFILES.find((p) =>
          p.fullName.toLowerCase().includes('manu')
        );
        if (manuProfile) {
          setCurrentUser(manuProfile);
        }
        setIsVerifyingManu(false);
        setPin('');
      } else {
        setIsPinError(true);
        setTimeout(() => {
          setPin('');
          setIsPinError(false);
        }, 700);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setIsPinError(false);
  };

  // Keyboard navigation for PIN entry
  useEffect(() => {
    if (!isOpen || !isVerifyingManu) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        setIsVerifyingManu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isVerifyingManu, pin]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
      {/* Click backdrop to close */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full sm:max-w-sm bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-y-auto max-h-[92vh] z-10 text-white animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isVerifyingManu && (
              <button
                type="button"
                onClick={() => setIsVerifyingManu(false)}
                className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="font-bold text-base text-white">
              {isVerifyingManu
                ? isHindi
                  ? 'सुरक्षा कोड (PIN)'
                  : 'Security PIN'
                : isHindi
                ? 'सेटिंग्स (Settings)'
                : 'Settings'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PIN Verification View for Manu Shukla */}
        {isVerifyingManu ? (
          <div className="p-5 pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+1.5rem))] sm:pb-6 flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mb-2 shadow-lg shadow-cyan-500/10">
              <Lock className="w-6 h-6 stroke-[2.2px]" />
            </div>

            <p className="text-base font-bold text-white text-center">
              Manu Shukla
            </p>
            <p className="text-xs text-slate-400 text-center mt-0.5 mb-3">
              {isHindi ? '४-अंकीय पिन दर्ज करें (4-digit PIN)' : 'Enter 4-digit PIN to switch'}
            </p>

            {/* 4 Dots Indicator */}
            <div className="flex items-center justify-center gap-4 my-2">
              {[0, 1, 2, 3].map((idx) => {
                const isFilled = idx < pin.length;
                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                      isPinError
                        ? 'bg-rose-500 scale-110 shadow-lg shadow-rose-500/50'
                        : isFilled
                        ? 'bg-cyan-400 scale-110 shadow-md shadow-cyan-400/50'
                        : 'bg-slate-800 border border-slate-700'
                    }`}
                  />
                );
              })}
            </div>

            {/* Error Message */}
            <div className="h-6 flex items-center justify-center mb-2">
              {isPinError && (
                <p className="text-xs text-rose-400 font-bold animate-shake">
                  {isHindi ? 'गलत पिन, पुनः प्रयास करें' : 'Incorrect PIN, try again'}
                </p>
              )}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-xs mt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleDigit(digit)}
                  className="h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-lg border border-slate-700/60 shadow-xs transition-transform"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsVerifyingManu(false)}
                className="h-12 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs active:scale-95 transition-transform border border-slate-700/40"
              >
                {isHindi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleDigit('0')}
                className="h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-lg border border-slate-700/60 shadow-xs transition-transform"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700/60 shadow-xs transition-transform"
                aria-label="Backspace"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          /* Main Settings View */
          <div className="p-5 pb-[max(2.5rem,calc(env(safe-area-inset-bottom)+1.5rem))] sm:pb-6 space-y-5">
            {/* Super Admin Notice (only if super admin is active) */}
            {isSuperAdmin && (
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>Super Admin Mode</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    exitSuperAdmin();
                    onClose();
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold active:scale-95 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isHindi ? 'बाहर निकलें' : 'Exit'}</span>
                </button>
              </div>
            )}

            {/* 1. Who is using this phone */}
            {!isSuperAdmin && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {isHindi ? 'नाम (User Name)' : 'Who is recording?'}
                </p>
                <div className="space-y-2">
                  {DEFAULT_PROFILES.map((profile) => {
                    const isSelected = currentUser.id === profile.id;
                    const isManu = profile.fullName.toLowerCase().includes('manu');
                    const initial = profile.fullName ? profile.fullName.trim()[0].toUpperCase() : 'U';

                    return (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => handleSelectProfile(profile)}
                        className={`w-full p-3 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.99] border ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-sm shadow-cyan-500/10'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                              isSelected
                                ? 'bg-cyan-500 text-slate-950 font-black'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {initial}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-bold leading-tight">
                                {profile.fullName}
                              </p>
                              {isManu && !isSelected && (
                                <Lock className="w-3 h-3 text-slate-400" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {profile.role === 'owner'
                                ? isHindi ? 'साझीदार (Partner)' : 'Partner'
                                : isHindi ? 'अभिलेखक (Site Contributor)' : 'Site Contributor'}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center flex-shrink-0">
                            <Check className="w-4 h-4 stroke-[3px]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Language Toggle */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                {isHindi ? 'भाषा (Language)' : 'Language'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('hi')}
                  className={`py-3 px-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all active:scale-95 border ${
                    language === 'hi'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>हिन्दी</span>
                  {language === 'hi' && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                </button>

                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`py-3 px-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all active:scale-95 border ${
                    language === 'en'
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>English</span>
                  {language === 'en' && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                </button>
              </div>
            </div>

            {/* Cloud Refresh Action */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="text-[11px] text-slate-500">
                {isHindi ? 'क्लाउड सिंक' : 'Cloud Sync'}
              </span>
              <button
                type="button"
                onClick={async () => {
                  await triggerSync();
                  onClose();
                }}
                className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-bold text-xs p-1 rounded-lg active:scale-95 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isHindi ? 'डेटा रीफ्रेश करें' : 'Refresh Data'}</span>
              </button>
            </div>

            {/* Done Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm transition-all active:scale-98 shadow-lg shadow-cyan-500/20"
            >
              {isHindi ? 'हो गया (Done)' : 'Done'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
