"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';


// Type declaration for Speech Recognition API
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResult[];
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

interface SpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

interface ViewerItem {
  id: string;
  name: string;
  mimeType: string;
  type: string;
  url: string;
  modifiedTime: string;
}

interface FullScreenViewerProps {
  items: ViewerItem[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (item: ViewerItem) => void;
  onSpeakEnglish?: (content: string) => void;
  onSpeakSpanish?: (content: string) => void;
  onStopSpeaking?: () => void;
  ttsSpeaking?: boolean;
  ttsLanguage?: 'en' | 'es';
  onSaveNote?: (item: ViewerItem, content: string) => void;
  onCreateNote?: (folderId: string, fileName: string, content: string) => void;
}

export default function FullScreenViewer({
  items,
  initialIndex,
  isOpen,
  onClose,
  onDelete,
  onSpeakEnglish,
  onSpeakSpanish,
  onStopSpeaking,
  ttsSpeaking = false,
  ttsLanguage = 'en',
  onSaveNote,
  onCreateNote
}: FullScreenViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [displayLanguage, setDisplayLanguage] = useState<'en' | 'es'>('en');
  const [translating, setTranslating] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Speech-to-text states
  const [isListening, setIsListening] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<any>(null);
  
  // Enable debug mode from URL query parameter
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('debug')) {
      setDebugMode(true);
      console.log('FullScreenViewer debug mode enabled');
    }
  }, []);
  
  // Track unsaved changes
  useEffect(() => {
    if (previewData?.content && editedContent !== previewData.content) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [editedContent, previewData?.content]);
  
  // Auto-save when viewer closes (depends on currentItem which is defined later)
  // This useEffect will be added after currentItem declaration
  
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  
  const currentItem = items[currentIndex];

  // Auto-save when viewer closes - TEMPORARILY DISABLED due to issues
  // useEffect(() => {
  //   if (!isOpen && hasUnsavedChanges && onSaveNote && !isSaving) {
  //     console.log('Auto-saving unsaved changes before closing');
  //     // Use a small timeout to avoid state update during unmount
  //     setTimeout(async () => {
  //       try {
  //         if (currentItem) {
  //           await onSaveNote(currentItem, editedContent);
  //           console.log('Auto-save successful');
  //         }
  //       } catch (error) {
  //         console.error('Auto-save failed:', error);
  //       }
  //     }, 100);
  //   }
  // }, [isOpen, hasUnsavedChanges, onSaveNote, currentItem, isSaving, editedContent]);

  // Reset when index changes
  useEffect(() => {
    if (!currentItem) return;
    
    setPreviewData(null);
    setPreviewError(null);
    setTranslatedContent(null);
    setDisplayLanguage('en');
    setTranslating(false);
    
    fetchPreview(currentItem);
  }, [currentItem]);

  // Stop TTS when item changes or component unmounts
  useEffect(() => {
    console.log('FullScreenViewer useEffect cleanup - currentIndex:', currentIndex, 'onStopSpeaking:', typeof onStopSpeaking);
    return () => {
      console.log('FullScreenViewer cleanup running, cancelling speech');
      // Stop any ongoing speech when component unmounts or item changes
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      // Notify parent if callback provided
      if (onStopSpeaking) {
        onStopSpeaking();
      }
    };
  }, [currentIndex, onStopSpeaking]);

  // Test function to debug speech synthesis
  const handleTestSpeak = () => {
    alert('Test button clicked! Check browser console for debug output.');
    console.log('=== SPEECH SYNTHESIS DEBUG ===');
    console.log('window.speechSynthesis exists:', 'speechSynthesis' in window);
    if ('speechSynthesis' in window) {
      const synth = window.speechSynthesis;
      console.log('synth.speaking:', synth.speaking);
      console.log('synth.paused:', synth.paused);
      console.log('synth.pending:', synth.pending);
      console.log('Voices available:', synth.getVoices().length);
      console.log('Current previewData:', previewData);
      console.log('previewData.content:', previewData?.content ? `"${previewData.content.substring(0, 100)}..."` : 'empty');
      
      // Try to speak a test phrase
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance('Test one two three');
      utterance.lang = 'en';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      utterance.onstart = () => console.log('Test utterance started');
      utterance.onend = () => console.log('Test utterance ended');
      utterance.onerror = (event) => console.log('Test utterance error:', event.error);
      
      try {
        synth.speak(utterance);
        console.log('Test utterance spoken');
      } catch (error) {
        console.log('Test utterance error:', error);
      }
    } else {
      console.log('SpeechSynthesis not supported');
    }
  };

  const fetchPreview = async (item: ViewerItem) => {
    setLoadingPreview(true);
    setPreviewError(null);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      console.log('Fetching preview for:', item.name, 'id:', item.id);
      const response = await fetch(`/api/project/file/preview?fileId=${item.id}&mimeType=${encodeURIComponent(item.mimeType || '')}`, {
        signal: controller.signal
      });
      console.log('Preview response status:', response.status);
      if (!response.ok) {
        throw new Error(`Failed to fetch preview: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Preview data:', data);
      if (data.success) {
        console.log('Preview content length:', data.content?.length || 0);
        console.log('Preview type:', data.type);
        setPreviewData(data);
      } else {
        throw new Error(data.error || 'Preview failed');
      }
    } catch (error) {
      console.error('Error loading preview:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        setPreviewError('Request timed out. Please try again.');
      } else if (error instanceof Error) {
        setPreviewError(error.message);
      } else {
        setPreviewError('Failed to load preview');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoadingPreview(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swipe left, go to next
        handleNext();
      } else {
        // Swipe right, go to previous
        handlePrevious();
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [isOpen, currentIndex, items.length]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.log('Speech Recognition API not supported');
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }
      
      if (transcript) {
        setEditedContent(prev => prev + (prev ? ' ' : '') + transcript);
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    setSpeechRecognition(recognition);
    
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  // Toggle speech recognition
  const toggleListening = () => {
    if (!speechRecognition) {
      alert('Speech recognition not supported in your browser');
      return;
    }
    
    if (isListening) {
      speechRecognition.stop();
      setIsListening(false);
    } else {
      speechRecognition.start();
      setIsListening(true);
    }
  };

  // Enter edit mode
  const handleEdit = () => {
    setIsEditing(true);
    
    const currentContent = previewData?.content || '';
    
    // Format current date/time for timestamp
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '') + ' CST';
    
    // Format: YYYY-MM-DD HH:MM CST
    const formattedTimestamp = timestamp.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
    
    // Add blank line, timestamp, and another blank line for new content
    let newContent = currentContent;
    if (newContent && !newContent.endsWith('\n\n')) {
      if (newContent.endsWith('\n')) {
        newContent += '\n';
      } else {
        newContent += '\n\n';
      }
    }
    newContent += `[${formattedTimestamp}]\n`;
    
    setEditedContent(newContent);
    
    // Note: Auto-start speech recognition temporarily disabled due to issues
    // when closing window while dictation is active.
    // To enable: call toggleListening() here
  };

  // Save edited content
  const handleSave = async () => {
    if (!onSaveNote || !currentItem) return;
    
    setIsSaving(true);
    try {
      await onSaveNote(currentItem, editedContent);
      setIsEditing(false);
      setHasUnsavedChanges(false);
      // Refresh preview
      fetchPreview(currentItem);
    } catch (error) {
      console.error('Error saving note:', error);
      // Sanitize error message to avoid showing system prompts
      let errorMessage = 'Failed to save note';
      if (error instanceof Error) {
        let message = error.message;
        // Remove any system prompt text
        if (message.includes('You are an expert Next.js developer')) {
          message = 'Server returned unexpected response';
        }
        // Truncate long error messages
        if (message.length > 100) {
          message = message.substring(0, 100) + '...';
        }
        errorMessage = `${errorMessage}: ${message}`;
      }
      alert(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent('');
  };

  // Handle create new note
  const handleCreateNote = () => {
    // For now, just enter edit mode with empty content
    setIsEditing(true);
    setEditedContent('');
  };

  if (!isOpen || !currentItem) return null;

  const getPreviewUrl = (item: ViewerItem) => {
    if (!item.id) return item.url;
    
    if (item.mimeType?.startsWith('image/')) {
      return `https://drive.google.com/thumbnail?id=${item.id}&sz=w1000`;
    }
    
    if (item.mimeType === 'application/pdf') {
      return `https://drive.google.com/file/d/${item.id}/preview`;
    }
    
    if (item.mimeType?.includes('document')) {
      return `https://docs.google.com/document/d/${item.id}/preview`;
    }
    if (item.mimeType?.includes('spreadsheet')) {
      return `https://docs.google.com/spreadsheets/d/${item.id}/preview`;
    }
    if (item.mimeType?.includes('presentation')) {
      return `https://docs.google.com/presentation/d/${item.id}/preview`;
    }
    
    return item.url;
  };

  const isImage = currentItem.mimeType?.startsWith('image/');
  const isEmbeddable = previewData?.type === 'image' || 
                      previewData?.type === 'pdf' || 
                      previewData?.type === 'google-doc' ||
                      previewData?.type === 'google-sheet' ||
                      previewData?.type === 'google-slide';

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black/80 backdrop-blur-sm text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="min-w-0">
            <h2 className="text-lg font-medium truncate">{currentItem.name}</h2>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!isEditing && onSpeakEnglish && onSpeakSpanish && (previewData?.type === 'markdown' || previewData?.type === 'text') && (
            <>
              <button
                onClick={() => {
                  console.log('EN button clicked, previewData?.content:', previewData?.content ? `"${previewData.content.substring(0, 50)}..."` : 'empty');
                  onSpeakEnglish(previewData?.content || '');
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  ttsSpeaking && ttsLanguage === 'en' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {ttsSpeaking && ttsLanguage === 'en' ? '⏸️ Stop' : '🔊 EN'}
              </button>
              <button
                onClick={() => {
                  console.log('ES button clicked, previewData?.content:', previewData?.content ? `"${previewData.content.substring(0, 50)}..."` : 'empty');
                  onSpeakSpanish(previewData?.content || '');
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  ttsSpeaking && ttsLanguage === 'es' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {ttsSpeaking && ttsLanguage === 'es' ? '⏸️ Stop' : '🔊 ES'}
              </button>
            </>
          )}
          
          {/* Edit/Save/Cancel buttons for markdown/text files */}
          {(previewData?.type === 'markdown' || previewData?.type === 'text') && (
            <>
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="px-3 py-1.5 rounded-lg bg-purple-600/80 text-white hover:bg-purple-700 text-sm font-medium transition-colors flex items-center gap-1"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-3 py-1.5 rounded-lg bg-green-600/80 text-white hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors flex items-center gap-1"
                  >
                    {isSaving ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-3 py-1.5 rounded-lg bg-gray-600/80 text-white hover:bg-gray-700 disabled:opacity-50 text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </>
              )}
            </>
          )}
          
          
          
          {debugMode && (
            <button
              onClick={handleTestSpeak}
              className="px-2 py-1 rounded-lg bg-yellow-600/80 text-white hover:bg-yellow-700 text-xs font-medium transition-colors"
            >
              Test
            </button>
          )}
          

        </div>
      </div>

      {/* Main content */}
      <div 
        className="h-full w-full flex items-center justify-center p-4 pt-20 pb-16"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {loadingPreview ? (
          <div className="flex flex-col items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
            <p className="mt-4 text-white">Loading preview...</p>
          </div>
        ) : previewError ? (
          <div className="flex flex-col items-center justify-center text-center max-w-md">
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="text-xl font-medium text-white mb-2">Preview Unavailable</h3>
            <p className="text-gray-300">{previewError}</p>
          </div>
        ) : previewData?.success ? (
          <div className="h-full w-full flex items-center justify-center">
            {previewData.type === 'image' ? (
              <img
                src={previewData.dataUrl || previewData.thumbnailUrl || getPreviewUrl(currentItem)}
                alt={currentItem.name}
                className="max-h-full max-w-full object-contain"
              />
            ) : previewData.type === 'markdown' ? (
              isEditing ? (
                <div className="h-full w-full max-w-4xl overflow-hidden flex flex-col p-4">
                  <div className="flex-1 overflow-auto bg-white rounded-lg">
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full h-full p-6 font-mono text-sm text-[#2c3e50] bg-white resize-none focus:outline-none"
                      placeholder="Start typing or use the microphone button to add notes..."
                      rows={20}
                      autoComplete="new-password"
                      inputMode="text"
                      data-1p-ignore
                      spellCheck="false"
                      autoCorrect="off"
                      autoCapitalize="off"
                      role="textbox"
                      aria-multiline="true"
                      aria-label="Markdown editor"
                      id="fullscreen-markdown-editor"
                      name="markdown-editor"
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full w-full max-w-4xl overflow-auto p-8 bg-white rounded-lg">
                  {previewData.content.trim() ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {translatedContent && displayLanguage === 'es' ? translatedContent : previewData.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-gray-400 italic">No content</p>
                  )}
                </div>
              )
            ) : previewData.type === 'text' ? (
              isEditing ? (
                <div className="h-full w-full max-w-4xl overflow-hidden flex flex-col p-4">
                  <div className="flex-1 overflow-auto bg-white rounded-lg">
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full h-full p-6 font-mono text-sm text-[#2c3e50] bg-white resize-none focus:outline-none"
                      placeholder="Start typing or use the microphone button to add notes..."
                      rows={20}
                      autoComplete="new-password"
                      inputMode="text"
                      data-1p-ignore
                      spellCheck="false"
                      autoCorrect="off"
                      autoCapitalize="off"
                      data-lpignore="true"
                      role="textbox"
                      aria-multiline="true"
                      aria-label="Text editor"
                      id="fullscreen-text-editor"
                      name="text-editor"
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full w-full max-w-4xl overflow-auto p-8 bg-white rounded-lg">
                  {previewData.content.trim() ? (
                    <pre className="whitespace-pre-wrap font-mono text-sm text-[#2c3e50]">
                      {translatedContent && displayLanguage === 'es' ? translatedContent : previewData.content}
                    </pre>
                  ) : (
                    <p className="text-gray-400 italic">No content</p>
                  )}
                </div>
              )
            ) : isEmbeddable ? (
              <iframe
                src={previewData.embedUrl || getPreviewUrl(currentItem)}
                className="h-full w-full border-0"
                title={`Preview of ${currentItem.name}`}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center max-w-md">
                <div className="text-5xl mb-4">{isImage ? '🖼️' : '📎'}</div>
                <h3 className="text-xl font-medium text-white mb-2">{currentItem.name}</h3>
                <p className="text-gray-300">
                  This file type cannot be previewed in the gallery.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center max-w-md">
            <div className="text-5xl mb-4">{isImage ? '🖼️' : '📎'}</div>
            <h3 className="text-xl font-medium text-white mb-2">{currentItem.name}</h3>
            <p className="text-gray-300 mb-6">
              Loading preview...
            </p>
          </div>
        )}
      </div>

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors z-10"
        >
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      
      {currentIndex < items.length - 1 && (
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors z-10"
        >
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Bottom indicator */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm p-4">
        <div className="flex items-center justify-center gap-2">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentIndex 
                  ? 'w-8 bg-white' 
                  : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to item ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}