'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { parseVoiceTranscript } from '@/lib/voiceParser';
import { ParsedVoiceResult, Expense } from '@/types';
import { db } from '@/lib/db';
import { formatINR } from '@/lib/constants';
import { Mic, MicOff, Check, RotateCcw, Edit3, X, AlertCircle, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (expense: Expense) => void;
  onEditManually: (initialData: Partial<Expense>) => void;
}

export default function VoiceRecorderModal({
  isOpen,
  onClose,
  onSaved,
  onEditManually,
}: VoiceRecorderModalProps) {
  const { currentUser, language } = useApp();
  const isHindi = language === 'hi';

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedVoiceResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!isOpen) {
      stopRecording();
      setTranscript('');
      setParsedResult(null);
      setErrorMessage(null);
      return;
    }

    // Auto-start recording when modal opens
    startRecording();

    return () => {
      stopRecording();
    };
  }, [isOpen]);

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // Ignore stop errors if already stopped
      }
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const startRecording = () => {
    stopRecording();
    setErrorMessage(null);
    setTranscript('');
    setParsedResult(null);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage(
        isHindi
          ? 'आपके ब्राउज़र में बोलकर दर्ज करने की सुविधा उपलब्ध नहीं है। कृपया मैन्युअल फॉर्म का उपयोग करें।'
          : 'Speech recognition is not supported in this browser. Please use the manual form.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN'; // Optimized for Hindi
      recognition.continuous = true; // Stay active without cutting off on brief pauses
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);

        // Intelligently parse in real-time
        const parsed = parseVoiceTranscript(currentTranscript);
        if (process.env.NODE_ENV !== 'production') {
          console.log('[VoiceParser] Transcript:', currentTranscript, '=> Parsed:', parsed);
        }
        setParsedResult(parsed);
      };

      recognition.onerror = (event: any) => {
        // "no-speech" and "aborted" are normal pauses or restarts - do not show a red error
        if (event.error === 'aborted' || event.error === 'no-speech') {
          return;
        }

        console.warn('Speech recognition error:', event.error);
        setIsRecording(false);

        if (event.error === 'not-allowed') {
          setErrorMessage(
            isHindi
              ? 'माइक की अनुमति नहीं मिली। कृपया ब्राउज़र सेटिंग में माइक चालू करें।'
              : 'Microphone permission denied. Please allow microphone access.'
          );
        } else {
          setErrorMessage(
            isHindi
              ? 'आवाज़ रिकॉर्ड करने में समस्या हुई। कृपया दोबारा प्रयास करें।'
              : 'Error recording audio. Please try again.'
          );
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.error('Failed to start speech recognition:', e);
      setIsRecording(false);
    }
  };

  const restartListening = () => {
    stopRecording();
    setErrorMessage(null);
    setTranscript('');
    setParsedResult(null);
    setTimeout(() => {
      startRecording();
    }, 120);
  };

  const handleConfirmAndSave = async () => {
    if (!parsedResult || !parsedResult.amountPaise || parsedResult.amountPaise <= 0) {
      alert(
        isHindi
          ? 'रकम समझ नहीं आई। कृपया दोबारा बोलें या बदलें बटन दबाएं।'
          : 'Amount was not recognized. Please speak again or tap Edit.'
      );
      return;
    }

    setIsSaving(true);
    try {
      // Create local expense with client_uuid
      const clientUuid = crypto.randomUUID();
      const newExpense: Expense = {
        clientUuid,
        amountPaise: parsedResult.amountPaise,
        currency: 'INR',
        description: parsedResult.description || 'खर्च',
        categoryId: parsedResult.categoryId || 'cat-other-construction',
        categoryName: parsedResult.categoryName || 'अन्य निर्माण खर्च',
        categoryNameHi: parsedResult.categoryName || 'अन्य निर्माण खर्च',
        vendorName: parsedResult.vendorName,
        phaseId: 'phase-construction',
        phaseName: 'Construction (निर्माण)',
        paymentMethod: parsedResult.paymentMethod || 'cash',
        paymentDate: parsedResult.paymentDate || new Date().toISOString().split('T')[0],
        paidByUserId: currentUser.id,
        paidByName: currentUser.fullName,
        submittedByUserId: currentUser.id,
        submittedByName: currentUser.fullName,
        recordType: 'expense',
        status: 'active',
        verificationStatus: 'pending',
        deviceCreatedAt: new Date().toISOString(),
        syncStatus: 'pending',
        hasReceipt: false,
      };

      // Save to IndexedDB immediately
      await db.expenses.add(newExpense);

      // Trigger celebratory confetti (Peak-End UX Rule)
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (e) {}

      onSaved(newExpense);
      onClose();
    } catch (error) {
      console.error('Failed to save expense locally:', error);
      alert(isHindi ? 'सेव करने में समस्या हुई।' : 'Failed to save expense.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    onEditManually({
      amountPaise: parsedResult?.amountPaise,
      description: parsedResult?.description || transcript,
      vendorName: parsedResult?.vendorName,
      paymentMethod: parsedResult?.paymentMethod || 'cash',
      categoryId: parsedResult?.categoryId,
      paymentDate: parsedResult?.paymentDate || new Date().toISOString().split('T')[0],
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-teal-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-cyan-200" />
            <h2 className="font-bold text-lg">
              {isHindi ? 'बोलकर खर्च दर्ज करें' : 'Speak to Record Expense'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors text-white/90"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center">
          {/* Big Microphone Tap Zone */}
          <div className="my-4 flex flex-col items-center">
            <button
              onClick={() => {
                if (isRecording) {
                  stopRecording();
                } else {
                  restartListening();
                }
              }}
              className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                isRecording
                  ? 'bg-rose-500 text-white mic-active scale-105'
                  : 'bg-gradient-to-tr from-cyan-500 to-teal-500 text-white hover:scale-105 active:scale-95'
              }`}
            >
              {isRecording ? (
                <Mic className="w-12 h-12 animate-pulse" />
              ) : (
                <Mic className="w-12 h-12" />
              )}
            </button>

            <p className="mt-4 text-sm font-semibold text-slate-700 text-center">
              {isRecording
                ? isHindi
                  ? 'सुन रहे हैं... कृपया बोलिए'
                  : 'Listening... Please speak'
                : isHindi
                ? 'माइक दबाकर बोलें'
                : 'Tap to speak'}
            </p>

            <p className="text-xs text-slate-400 mt-1 text-center max-w-xs">
              {isHindi
                ? 'उदा: "आज शर्मा जी को सीमेंट के लिए 5000 रुपये UPI से दिए"'
                : 'e.g. "Paid 5000 rupees to Sharma for cement via UPI today"'}
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="w-full mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">{errorMessage}</p>
                <button
                  onClick={handleEdit}
                  className="mt-2 inline-flex items-center gap-1 font-bold text-rose-700 underline"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {isHindi ? 'मैन्युअल फॉर्म खोलें' : 'Open manual form'}
                </button>
              </div>
            </div>
          )}

          {/* Live Spoken Transcript */}
          {transcript && (
            <div className="w-full mb-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {isHindi ? 'सुनाई दिया:' : 'Transcript:'}
              </span>
              <p className="text-sm font-medium text-slate-800 italic">"{transcript}"</p>
            </div>
          )}

          {/* Helpful Guidance when transcript is heard but amount is missing */}
          {transcript && (!parsedResult || !parsedResult.amountPaise) && !isRecording && (
            <div className="w-full mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-900 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">
                  {isHindi
                    ? 'रकम (Amount) सुनाई नहीं दी'
                    : 'Amount was not detected'}
                </p>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  {isHindi
                    ? 'कृपया दोबारा बोलें (उदा: "5000 रुपये सीमेंट") या नीचे "बदलें / मैन्युअल" दबाकर रकम दर्ज करें।'
                    : 'Please speak again with an amount (e.g. "5000 rupees cement") or tap "Edit / Manual" below to type it.'}
                </p>
              </div>
            </div>
          )}

          {/* Extracted Review Card */}
          {parsedResult && parsedResult.amountPaise ? (
            <div className="w-full bg-cyan-50/70 border-2 border-cyan-300 rounded-2xl p-4 shadow-sm mb-4">
              <div className="flex items-center justify-between border-b border-cyan-200 pb-2 mb-3">
                <span className="text-xs font-bold text-cyan-800 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                  {isHindi ? 'दर्ज विवरण जांचें' : 'Review Details'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  {isHindi ? 'सही पहचान' : 'Extracted'}
                </span>
              </div>

              {/* Big Prominent Amount */}
              <div className="text-center py-2 bg-white rounded-xl shadow-inner border border-cyan-100 mb-3">
                <span className="text-xs text-slate-500 font-medium block">
                  {isHindi ? 'रकम (Amount)' : 'Amount'}
                </span>
                <span className="text-3xl font-extrabold text-cyan-900 tracking-tight">
                  {formatINR(parsedResult.amountPaise)}
                </span>
              </div>

              {/* Detail Rows */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-cyan-100">
                  <span className="text-slate-500">{isHindi ? 'किसलिए:' : 'Purpose:'}</span>
                  <span className="font-bold text-slate-800">{parsedResult.description}</span>
                </div>

                {parsedResult.vendorName && (
                  <div className="flex justify-between items-center py-1 border-b border-cyan-100">
                    <span className="text-slate-500">{isHindi ? 'किसको दिया:' : 'Vendor:'}</span>
                    <span className="font-bold text-slate-800">{parsedResult.vendorName}</span>
                  </div>
                )}

                <div className="flex justify-between items-center py-1 border-b border-cyan-100">
                  <span className="text-slate-500">{isHindi ? 'भुगतान माध्यम:' : 'Payment:'}</span>
                  <span className="font-bold text-slate-800 uppercase">
                    {parsedResult.paymentMethod}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">{isHindi ? 'श्रेणी (Category):' : 'Category:'}</span>
                  <span className="font-bold text-slate-800">{parsedResult.categoryName}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
          {parsedResult && parsedResult.amountPaise ? (
            <button
              onClick={handleConfirmAndSave}
              disabled={isSaving}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-98 transition-all"
            >
              <Check className="w-6 h-6 stroke-[3px]" />
              <span>{isHindi ? 'सही है, सेव करें' : 'Correct, Save Expense'}</span>
            </button>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={restartListening}
              className="py-3 px-4 rounded-xl bg-white border border-slate-300 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-slate-600" />
              <span>{isHindi ? 'दोबारा बोलें' : 'Speak Again'}</span>
            </button>

            <button
              onClick={handleEdit}
              className="py-3 px-4 rounded-xl bg-white border border-slate-300 text-cyan-800 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-100 transition-colors"
            >
              <Edit3 className="w-4 h-4 text-cyan-700" />
              <span>{isHindi ? 'बदलें / मैन्युअल' : 'Edit / Manual'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

