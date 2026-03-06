'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface StepItem {
  id: string;
  name: string;
  mimeType: string;
  type: string;
  createdTime: string;
  modifiedTime: string;
  url: string;
  size: string;
  icon: string;
}

interface InlineGalleryViewerProps {
  items: StepItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSaveNote?: (item: StepItem, content: string) => Promise<any>;
  onSpeakEnglish?: (content?: string) => void;
  onSpeakSpanish?: (content?: string) => void;
  onStopSpeaking?: () => void;
  ttsSpeaking?: boolean;
  ttsLanguage?: 'en' | 'es';
  phaseName?: string;
}

const InlineGalleryViewer: React.FC<InlineGalleryViewerProps> = ({
  items,
  initialIndex,
  isOpen,
  onClose,
  onSaveNote,
  onSpeakEnglish,
  onSpeakSpanish,
  onStopSpeaking,
  ttsSpeaking = false,
  ttsLanguage = 'en',
  phaseName = 'Gallery',
}) => {
  // All hooks at the top - must be called in same order every render
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageLoadedCache = useRef<Set<string>>(new Set());

  // Update current index when initialIndex changes, adjust to valid image if needed
  useEffect(() => {
    // If initialIndex points to a non-image, find the first image
    if (items.length === 0) {
      setCurrentIndex(0);
      return;
    }
    
    const imageItems = items.filter(item => item.mimeType?.startsWith('image/'));
    if (imageItems.length === 0) {
      setCurrentIndex(0);
      return;
    }
    
    // Check if initialIndex points to an image
    const initialItem = items[initialIndex];
    const isInitialItemImage = initialItem?.mimeType?.startsWith('image/');
    
    if (isInitialItemImage) {
      setCurrentIndex(initialIndex);
    } else {
      // Find the first image index
      const firstImageIndex = items.findIndex(item => item.mimeType?.startsWith('image/'));
      setCurrentIndex(firstImageIndex !== -1 ? firstImageIndex : 0);
    }
  }, [initialIndex, items]);

  // Filter to only show image files (not .md, .txt, pdf, etc.)
  const imageItems = useMemo(() => 
    items.filter(item => item.mimeType?.startsWith('image/')),
    [items]
  );

  // Map filtered image indices to original indices
  const imageOriginalIndices = useMemo(() => 
    imageItems.map(item => items.findIndex(i => i.id === item.id)),
    [imageItems, items]
  );

  // Find current position in filtered array
  const currentFilteredIndex = useMemo(() => 
    imageOriginalIndices.findIndex(origIdx => origIdx === currentIndex),
    [imageOriginalIndices, currentIndex]
  );
  
  const adjustedIndex = currentFilteredIndex !== -1 ? currentFilteredIndex : 0;
  const currentItem = imageItems[adjustedIndex];

  // Get adjacent image index based on swipe direction
  const getAdjacentImageIndex = useCallback((offset: number) => {
    if (offset === 0 || imageItems.length <= 1) return -1;
    
    const currentFilteredIdx = currentFilteredIndex;
    if (currentFilteredIdx === -1) return -1;
    
    if (offset > 0) {
      // Swiping right, show previous image
      return currentFilteredIdx > 0 ? currentFilteredIdx - 1 : imageItems.length - 1;
    } else {
      // Swiping left, show next image
      return currentFilteredIdx < imageItems.length - 1 ? currentFilteredIdx + 1 : 0;
    }
  }, [currentFilteredIndex, imageItems.length]);

  const adjacentFilteredIndex = useMemo(() => 
    getAdjacentImageIndex(swipeOffset),
  [getAdjacentImageIndex, swipeOffset]);

  const adjacentItem = useMemo(() => 
    adjacentFilteredIndex !== -1 ? imageItems[adjacentFilteredIndex] : null,
  [adjacentFilteredIndex, imageItems]);

  // Reset image state when current item changes
  useEffect(() => {
    if (!currentItem) return;
    setImageError(false);
    if (imageLoadedCache.current.has(currentItem.id)) {
      setImageLoading(false);
    } else {
      setImageLoading(true);
    }
  }, [currentItem?.id]);

  // Measure container width for swipe animations
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const isNote = useMemo(() => 
    currentItem?.name.toLowerCase().endsWith('.md') ||
    currentItem?.name.toLowerCase().endsWith('.txt'),
    [currentItem]
  );

  const handleImageLoad = useCallback((itemId: string) => {
    imageLoadedCache.current.add(itemId);
    setImageLoading(false);
  }, []);

  const handlePrevious = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // Find current position in filtered array
    let currentFilteredIdx = imageOriginalIndices.findIndex(origIdx => origIdx === currentIndex);
    
    // If current index doesn't point to an image, start from the first image
    if (currentFilteredIdx === -1) {
      if (imageItems.length === 0) return;
      currentFilteredIdx = 0;
    }
    
    const prevFilteredIdx = currentFilteredIdx > 0 ? currentFilteredIdx - 1 : imageItems.length - 1;
    const prevOriginalIdx = imageOriginalIndices[prevFilteredIdx];
    setCurrentIndex(prevOriginalIdx);
  }, [currentIndex, imageItems.length, imageOriginalIndices]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // Find current position in filtered array
    let currentFilteredIdx = imageOriginalIndices.findIndex(origIdx => origIdx === currentIndex);
    
    // If current index doesn't point to an image, start from the first image
    if (currentFilteredIdx === -1) {
      if (imageItems.length === 0) return;
      currentFilteredIdx = 0;
    }
    
    const nextFilteredIdx = currentFilteredIdx < imageItems.length - 1 ? currentFilteredIdx + 1 : 0;
    const nextOriginalIdx = imageOriginalIndices[nextFilteredIdx];
    setCurrentIndex(nextOriginalIdx);
  }, [currentIndex, imageItems.length, imageOriginalIndices]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      switch (e.key) {
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrevious, handleNext, onClose]);

  // Touch/swipe handlers for mobile navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touchX = e.targetTouches[0].clientX;
    setTouchStartX(touchX);
    setTouchEndX(touchX);
    setIsSwiping(true);
    setSwipeOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;
    e.preventDefault();
    const currentTouchX = e.targetTouches[0].clientX;
    setTouchEndX(currentTouchX);
    const offset = currentTouchX - touchStartX;
    setSwipeOffset(offset);
  }, [isSwiping, touchStartX]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping) return;
    
    const swipeDistance = touchEndX - touchStartX;
    const minSwipeDistance = 50; // pixels
    const effectiveWidth = containerWidth || window.innerWidth;
    
    let targetOffset = 0;
    let shouldNavigate = false;
    let navigateToPrevious = false;
    
    if (Math.abs(swipeDistance) > minSwipeDistance) {
      if (swipeDistance > 0) {
        // Swipe right -> previous image
        targetOffset = effectiveWidth; // Move right to show previous image
        shouldNavigate = true;
        navigateToPrevious = true;
      } else {
        // Swipe left -> next image  
        targetOffset = -effectiveWidth; // Move left to show next image
        shouldNavigate = true;
        navigateToPrevious = false;
      }
    }
    
    // Animate to target offset
    setIsSwiping(false);
    setSwipeOffset(targetOffset);
    
    // After animation completes, handle navigation if needed
    setTimeout(() => {
      if (shouldNavigate) {
        if (navigateToPrevious) {
          handlePrevious();
        } else {
          handleNext();
        }
      }
      // Reset offset after navigation
      setSwipeOffset(0);
    }, 150); // Reduced timeout for faster swipe response
    
  }, [isSwiping, touchStartX, touchEndX, handlePrevious, handleNext, containerWidth]);

  const handleSaveNote = async () => {
    if (!onSaveNote || !currentItem || !noteContent.trim()) return;

    setSavingNote(true);
    setNoteError(null);

    try {
      await onSaveNote(currentItem, noteContent);
      setIsEditingNote(false);
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  const getThumbnailUrl = (item: StepItem) => {
    if (!item.id) return item.url;
    if (item.mimeType?.startsWith('image/')) {
      return `/api/project/file/thumbnail?fileId=${item.id}`;
    }
    return item.url;
  };

  const getPreviewUrl = (item: StepItem) => {
    if (!item.id) return item.url;
    if (item.mimeType?.startsWith('image/')) {
      return `/api/project/file/thumbnail?fileId=${item.id}`;
    }
    return item.url;
  };

  // Preload adjacent images for smooth swiping
  useEffect(() => {
    if (!currentItem || imageItems.length <= 1) return;
    
    const currentFilteredIdx = imageOriginalIndices.findIndex(origIdx => origIdx === currentIndex);
    if (currentFilteredIdx === -1) return;
    
    // Preload next image
    const nextFilteredIdx = currentFilteredIdx < imageItems.length - 1 ? currentFilteredIdx + 1 : 0;
    const nextItem = imageItems[nextFilteredIdx];
    if (nextItem && !imageLoadedCache.current.has(nextItem.id)) {
      const img = new Image();
      img.src = getPreviewUrl(nextItem);
      img.onload = () => imageLoadedCache.current.add(nextItem.id);
    }
    
    // Preload previous image
    const prevFilteredIdx = currentFilteredIdx > 0 ? currentFilteredIdx - 1 : imageItems.length - 1;
    const prevItem = imageItems[prevFilteredIdx];
    if (prevItem && !imageLoadedCache.current.has(prevItem.id)) {
      const img = new Image();
      img.src = getPreviewUrl(prevItem);
      img.onload = () => imageLoadedCache.current.add(prevItem.id);
    }
  }, [currentItem?.id, imageItems, imageOriginalIndices, currentIndex]);

  // Early return must come AFTER all hooks
  if (!isOpen || imageItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 p-1 rounded-md hover:bg-gray-100"
            title="Close gallery"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <span className="text-lg font-semibold text-gray-900 truncate max-w-xs">
            {phaseName}
          </span>
          <span className="text-sm text-gray-500">
            {adjustedIndex + 1} of {imageItems.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Navigation buttons */}
          <button
            onClick={handlePrevious}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            title="Previous (←)"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleNext}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            title="Next (→)"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main preview area */}
          <div 
            ref={containerRef}
            className="flex-1 flex flex-col items-start justify-center h-full bg-gray-50 rounded-lg p-2 sm:p-4 relative overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: 'pan-x', userSelect: 'none', WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent' }}
          >
            {imageError ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
                  🖼️
                </div>
                <p className="text-gray-600">Image failed to load</p>
                <button
                  onClick={() => {
                    setImageError(false);
                    setImageLoading(true);
                  }}
                  className="mt-3 rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#c5a059] border-t-transparent"></div>
                  </div>
                )}
                {/* Image container for iPhone-style swipe */}
                <div 
                  className="relative w-[200%] h-full flex flex-row"
                  style={{ 
                    transform: `translateX(${swipeOffset}px)`,
                    transition: isSwiping ? 'none' : 'transform 0.15s ease',
                    willChange: 'transform',
                  }}
                >
                  {/* Current image - left half */}
                  <div className="w-1/2 flex-shrink-0 flex items-center justify-center h-full">
                    <img
                      src={getPreviewUrl(currentItem)}
                      alt={currentItem.name}
                      className={`w-full h-full object-contain object-center rounded ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                      draggable="false"
                      onDragStart={(e) => e.preventDefault()}
                      onError={() => {
                        setImageError(true);
                        setImageLoading(false);
                      }}
                      onLoad={() => handleImageLoad(currentItem.id)}
                    />
                  </div>
                  
                  {/* Adjacent image (next or previous) - right half */}
                  {adjacentItem && Math.abs(swipeOffset) > 5 && (
                    <div className="w-1/2 flex-shrink-0 flex items-center justify-center h-full">
                      <img
                        src={getPreviewUrl(adjacentItem)}
                        alt={adjacentItem.name}
                        className="w-full h-full object-contain object-center rounded"
                        draggable="false"
                        onDragStart={(e) => e.preventDefault()}
                      />
                    </div>
                  )}
                </div>
              <div className="mt-2 text-xs text-gray-500 text-center sm:hidden">Swipe left/right to navigate</div></>
            )}
          </div>

          {/* Sidebar - Notes editor for markdown files */}
          {isNote && onSaveNote && (
            <div className="lg:w-96 flex flex-col">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Notes</h3>
                  <div className="flex items-center gap-2">
                    {!isEditingNote ? (
                      <>
                        {/* TTS buttons for notes */}
                        {onSpeakEnglish && onSpeakSpanish && noteContent.trim().length > 0 && (
                          <>
                            <button
                              onClick={() => {
                                if (ttsSpeaking && ttsLanguage === 'en') {
                                  onStopSpeaking?.();
                                } else {
                                  onSpeakEnglish(noteContent);
                                }
                              }}
                              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                                ttsSpeaking && ttsLanguage === 'en' 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                              }`}
                              title="Speak in English"
                            >
                              {ttsSpeaking && ttsLanguage === 'en' ? '⏸️' : '🔊 EN'}
                            </button>
                            <button
                              onClick={() => {
                                if (ttsSpeaking && ttsLanguage === 'es') {
                                  onStopSpeaking?.();
                                } else {
                                  onSpeakSpanish(noteContent);
                                }
                              }}
                              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                                ttsSpeaking && ttsLanguage === 'es' 
                                  ? 'bg-green-600 text-white' 
                                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                              }`}
                              title="Speak in Spanish"
                            >
                              {ttsSpeaking && ttsLanguage === 'es' ? '⏸️' : '🔊 ES'}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setIsEditingNote(true)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                      </>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsEditingNote(false)}
                          className="text-sm text-gray-600 hover:text-gray-800"
                          disabled={savingNote}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveNote}
                          className="text-sm bg-[#c5a059] text-white px-3 py-1 rounded hover:bg-[#b08e4d] disabled:opacity-50"
                          disabled={savingNote || !noteContent.trim()}
                        >
                          {savingNote ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {isEditingNote ? (
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="w-full h-64 font-mono text-sm p-3 border border-gray-300 rounded focus:ring-2 focus:ring-[#c5a059] focus:border-transparent resize-none text-[#2c3e50]"
                    placeholder="Enter your notes here..."
                    autoFocus
                    autoComplete="new-password"
                    inputMode="text"
                    data-1p-ignore
                    spellCheck="false"
                    autoCorrect="off"
                    autoCapitalize="off"
                    data-lpignore="true"
                    role="textbox"
                    aria-multiline="true"
                    aria-label="Gallery notes editor"
                    id="gallery-notes-editor"
                    name="gallery-notes"
                  />
                ) : (
                  <div className="h-64 overflow-auto p-3 border border-gray-200 rounded bg-gray-50">
                    <pre className="whitespace-pre-wrap text-sm text-gray-900">
                      {noteContent || 'No notes yet. Click Edit to add notes.'}
                    </pre>
                  </div>
                )}
                {noteError && (
                  <div className="mt-2 p-2 bg-red-50 text-red-800 text-sm rounded">
                    {noteError}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        
      </div>
    </div>
  );
};

export default InlineGalleryViewer;