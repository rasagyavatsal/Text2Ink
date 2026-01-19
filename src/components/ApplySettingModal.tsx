'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Copy, X } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface ApplySettingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (pageRange: number[]) => void;
    settingName: string;
    currentPageIndex: number;
    totalPages: number;
}

export default function ApplySettingModal({
    isOpen,
    onClose,
    onApply,
    settingName,
    currentPageIndex,
    totalPages,
}: ApplySettingModalProps) {
    const [mode, setMode] = useState<'all' | 'range'>('all');
    const [rangeInput, setRangeInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setMode('all');
            setRangeInput('');
            setError(null);
        }
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const parsePageRange = (input: string): number[] | null => {
        const pages: Set<number> = new Set();
        const parts = input.split(',').map((p) => p.trim());

        for (const part of parts) {
            if (!part) continue;

            if (part.includes('-')) {
                const [start, end] = part.split('-').map((n) => parseInt(n.trim(), 10));
                if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
                    return null;
                }
                for (let i = start; i <= end; i++) {
                    pages.add(i - 1); // Convert to 0-indexed
                }
            } else {
                const num = parseInt(part, 10);
                if (isNaN(num) || num < 1 || num > totalPages) {
                    return null;
                }
                pages.add(num - 1); // Convert to 0-indexed
            }
        }

        return pages.size > 0 ? Array.from(pages).sort((a, b) => a - b) : null;
    };

    const handleApply = () => {
        setError(null);

        if (mode === 'all') {
            const allPages = Array.from({ length: totalPages }, (_, i) => i);
            onApply(allPages);
            onClose();
        } else {
            const pages = parsePageRange(rangeInput);
            if (!pages) {
                setError(`Invalid range. Use format: 1-3, 5 (pages 1-${totalPages})`);
                return;
            }
            onApply(pages);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div
                ref={modalRef}
                className="bg-white rounded-xl shadow-2xl border border-gray-200 p-5 w-80 animate-in fade-in zoom-in-95 duration-150"
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Copy className="w-4 h-4 text-[#E0A32A]" />
                        Apply {settingName}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <p className="text-xs text-gray-600 mb-4">
                    Currently on page {currentPageIndex + 1} of {totalPages}
                </p>

                <div className="space-y-3 mb-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="radio"
                            name="apply-mode"
                            checked={mode === 'all'}
                            onChange={() => setMode('all')}
                            className="w-4 h-4 text-[#E0A32A] accent-[#E0A32A]"
                        />
                        <span className="text-sm text-gray-700">All pages</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="radio"
                            name="apply-mode"
                            checked={mode === 'range'}
                            onChange={() => setMode('range')}
                            className="w-4 h-4 text-[#E0A32A] accent-[#E0A32A]"
                        />
                        <span className="text-sm text-gray-700">Specific pages</span>
                    </label>

                    {mode === 'range' && (
                        <div className="pl-7 space-y-2">
                            <Label htmlFor="page-range" className="text-xs text-gray-600">
                                Enter page numbers (e.g., 1-3, 5)
                            </Label>
                            <input
                                id="page-range"
                                type="text"
                                value={rangeInput}
                                onChange={(e) => {
                                    setRangeInput(e.target.value);
                                    setError(null);
                                }}
                                placeholder="1-3, 5"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E0A32A] focus:border-transparent"
                                autoFocus
                            />
                            {error && <p className="text-xs text-red-600">{error}</p>}
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#E0A32A] rounded-lg hover:bg-[#c99225] transition-colors"
                    >
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
}
