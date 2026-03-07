"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import GalleryView from './components/GalleryView';
import FullScreenViewer from './components/FullScreenViewer';
import InlineGalleryViewer from './components/InlineGalleryViewer';
import IterationView from './components/IterationView';
import InitialContactView from './components/InitialContactView';

interface Project {
  id: string;
  folderName: string;
  clientName: string;
  date: string;
  formattedDate: string;
  modifiedTime: string;
}

interface WorkflowStep {
  id: string;
  name: string;
  stepNumber: string;
  stepName: string;
  stepDescription: string;
  modifiedTime: string;
  url: string;
  exists: boolean;
}

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

const NOTES_FILENAME_PREFIX = 'notes_';

export default function ClientPortalHome() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [dataSource, setDataSource] = useState<string>('');
  // Navigation stack for browser back button handling
  const [navStack, setNavStack] = useState<Array<{project: Project | null, step: WorkflowStep | null, viewingInline: boolean, viewingGalleryInline: boolean, showGallery: boolean, folderId: string | null, folderPath: Array<{id: string, name: string}>}>>([]);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [stepsError, setStepsError] = useState<string | null>(null);
  const [creatingWorkflow, setCreatingWorkflow] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [showAllProjects, setShowAllProjects] = useState(false);
  // Notes modal state
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesContent, setNotesContent] = useState('');
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  // Step notes textarea readonly state (for preventing autofill popups)
  const [isStepNotesTextareaReadonly, setIsStepNotesTextareaReadonly] = useState(true);
  // Speech-to-text for notes
  const [isListeningNotes, setIsListeningNotes] = useState(false);
  const [speechRecognitionNotes, setSpeechRecognitionNotes] = useState<any>(null);
  // Step view state
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [stepContents, setStepContents] = useState<any[]>([]);
  const [loadingStepContents, setLoadingStepContents] = useState(false);
  const [stepContentsError, setStepContentsError] = useState<string | null>(null);
  // Folder navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<Array<{id: string, name: string}>>([]);
  // Preview modal state
  const [previewItem, setPreviewItem] = useState<StepItem | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  // TTS (Text-to-Speech) state
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const [ttsLanguage, setTtsLanguage] = useState<'en' | 'es'>('en');
  const [ttsUtterance, setTtsUtterance] = useState<SpeechSynthesisUtterance | null>(null);
  // Translation state
  const [displayLanguage, setDisplayLanguage] = useState<'en' | 'es'>('en');
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  // File deletion state
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<StepItem | null>(null);
  // File upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // User notes creation state
  const [creatingUserNotes, setCreatingUserNotes] = useState(false);
  const [userNotesNotification, setUserNotesNotification] = useState<string | null>(null);
  // Initial Contact save state
  const [initialContactSaving, setInitialContactSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // TTS refs
  const voicesLoadedRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  // Track folders where we've attempted to create user notes
  const userNotesAttemptedRef = useRef<Set<string>>(new Set());
  // Track viewingNotesInline for speech recognition
  const viewingNotesInlineRef = useRef(false);
  
  // Gallery view state
  const [showGallery, setShowGallery] = useState(false);
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);
  const [currentGalleryFolderId, setCurrentGalleryFolderId] = useState<string | null>(null);
  
  // Notes files state
  const [systemNotesFile, setSystemNotesFile] = useState<StepItem | null>(null);
  const [userNotesFile, setUserNotesFile] = useState<StepItem | null>(null);
  // Iteration spec state (for moodboard phases with iterations)
  const [activeIterationSpecFile, setActiveIterationSpecFile] = useState<StepItem | null>(null);

  // Inline notes viewing state
  const [viewingNotesInline, setViewingNotesInline] = useState(false);
  const [inlineNotesFile, setInlineNotesFile] = useState<StepItem | null>(null);
  const [inlineNotesContent, setInlineNotesContent] = useState('');
  // Auto-save state
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Textarea readonly state (for preventing autofill popups)
  const [isTextareaReadonly, setIsTextareaReadonly] = useState(true);
  // Editing mode for notes (to prevent autofill popups)
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Inline gallery viewing state
  const [viewingGalleryInline, setViewingGalleryInline] = useState(false);

  // Keep ref in sync with viewingNotesInline state for speech recognition
  useEffect(() => {
    viewingNotesInlineRef.current = viewingNotesInline;
  }, [viewingNotesInline]);

  // Initialize speech recognition for notes modal
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
        if (viewingNotesInlineRef.current) {
          setInlineNotesContent(prev => {
            let newContent = prev + (prev ? ' ' : '') + transcript;
            // Clear placeholder if it exists
            if (newContent.includes('Add your notes here...')) {
              const now = new Date();
              const formattedDate = now.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZoneName: 'short'
              });
              newContent = newContent.replace('Add your notes here...', `**Note started:** ${formattedDate}\n\n`);
            }
            return newContent;
          });
        } else {
          setNotesContent(prev => prev + (prev ? ' ' : '') + transcript);
        }
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListeningNotes(false);
    };
    
    recognition.onend = () => {
      setIsListeningNotes(false);
    };
    
    setSpeechRecognitionNotes(recognition);
    
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  // Listen for Initial Contact saving state updates from the component
  useEffect(() => {
    const handleSavingStateEvent = (event: CustomEvent) => {
      const { saving } = event.detail;
      console.log('Initial Contact saving state:', saving);
      setInitialContactSaving(saving);
    };
    
    window.addEventListener('initial-contact-saving-state', handleSavingStateEvent as EventListener);
    
    return () => {
      window.removeEventListener('initial-contact-saving-state', handleSavingStateEvent as EventListener);
    };
  }, []);

  // Fetch projects on initial load
  useEffect(() => {
    fetchProjects();
  }, []);

  // Clean up TTS when component unmounts
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Preload speech synthesis voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    if (voices.length > 0) {
      console.log('Voices preloaded:', voices.length);
      voicesLoadedRef.current = true;
    } else {
      const onVoicesChanged = () => {
        console.log('Voices preloaded on voiceschanged:', synth.getVoices().length);
        voicesLoadedRef.current = true;
        synth.removeEventListener('voiceschanged', onVoicesChanged);
      };
      synth.addEventListener('voiceschanged', onVoicesChanged);
    }
  }, []);

  // Detect notes files when step contents change + auto-create user notes if missing
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    console.log('Notes detection effect running:', {
      stepContentsLength: stepContents?.length,
      selectedStepId: selectedStep?.id,
      currentFolderId,
      creatingUserNotes,
      userNotesAttempted: currentFolderId ? userNotesAttemptedRef.current.has(currentFolderId) : false
    });
    
    // Always reset notes files when step contents change
    setSystemNotesFile(null as StepItem | null);
    setUserNotesFile(null as StepItem | null);
    
    // Check for notes files if we have contents
    let userNotes = null;
    if (stepContents && stepContents.length > 0) {
      const systemNotes = stepContents.find(item => 
        item.name.toLowerCase() === 'system-notes.md' || 
        item.name.toLowerCase() === 'system_notes.md' ||
        item.name.toLowerCase() === 'system notes.md'
      );
      // Search for user notes files (flexible matching for duplicates)
      const userNotesCandidates = stepContents.filter(item => {
        const lowerName = item.name.toLowerCase();
        return lowerName.includes('user notes') || 
               lowerName.includes('user-notes') || 
               lowerName.includes('user_notes');
      });
      
      // Prefer exact matches, but accept any candidate
      userNotes = userNotesCandidates.find(item => 
        item.name.toLowerCase() === 'user-notes.md' || 
        item.name.toLowerCase() === 'user_notes.md' ||
        item.name.toLowerCase() === 'user notes.md'
      ) || (userNotesCandidates.length > 0 ? userNotesCandidates[0] : null);
      
      console.log('Found notes files:', { 
        systemNotes: !!systemNotes, 
        userNotes: !!userNotes,
        userNotesName: userNotes?.name,
        allUserNotesCandidates: userNotesCandidates.map(f => f.name)
      });
      setSystemNotesFile(systemNotes || null);
      setUserNotesFile(userNotes || null);
    } else {
      console.log('Step contents empty or null - will still check for auto-creation');
    }
    
    // Auto-create user-notes.md if missing (only at root step folder)
    // Note: userNotes will be null if stepContents is empty, which means we should create it
    if (!userNotes && selectedStep && currentFolderId === selectedStep.id && !creatingUserNotes) {
      // Check if we've already attempted to create notes for this folder
      if (currentFolderId && !userNotesAttemptedRef.current.has(currentFolderId)) {
        userNotesAttemptedRef.current.add(currentFolderId);
        console.log('Auto-creating user-notes.md for folder:', currentFolderId, 'client:', selectedProject?.clientName);
        // Just mark as attempted without creating - user must manually create notes
        userNotesAttemptedRef.current.add(currentFolderId);
        console.log('Marked folder as attempted (no auto-creation):', currentFolderId);
      } else {
        console.log('Already marked as attempted for folder:', currentFolderId);
      }
    } else if (userNotes) {
      console.log('User notes already exists:', userNotes.name);
    } else {
      console.log('Auto-creation not triggered:', {
        hasUserNotes: !!userNotes,
        hasSelectedStep: !!selectedStep,
        folderMatch: selectedStep && currentFolderId === selectedStep.id,
        notCreating: !creatingUserNotes,
        attempted: currentFolderId ? userNotesAttemptedRef.current.has(currentFolderId) : false
      });
    }
  }, [stepContents, selectedStep, currentFolderId, creatingUserNotes]);

  // Clear iteration spec when step changes or iteration folders disappear
  useEffect(() => {
    const hasIterationFolders = stepContents.some(item => 
      item.type === 'folder' && item.name.toLowerCase().includes('iteration')
    );
    if (!hasIterationFolders) {
      setActiveIterationSpecFile(null);
    }
  }, [stepContents]);

  // Auto-save notes when modal closes - TEMPORARILY DISABLED
  // useEffect(() => {
  //   if (!showNotesModal && notesContent && !savingNotes && editingStep) {
  //     console.log('Auto-saving notes on modal close');
  //     saveNotes();
  //   }
  // }, [showNotesModal, notesContent, savingNotes, editingStep]);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    let finalProjects: Project[] = [];
    let finalSource = '';
    let finalError = '';

    // Try primary endpoint (/api/projects - Google Apps Script)
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        if (data.projects && data.projects.length > 0) {
          finalProjects = data.projects;
          finalSource = data.source || 'google-apps-script';
        } else {
          finalError = data.error || 'No projects returned from primary endpoint';
        }
      } else {
        finalError = `Primary endpoint failed with status ${response.status}`;
      }
    } catch (err) {
      finalError = `Primary endpoint error: ${err instanceof Error ? err.message : 'Unknown'}`;
      console.error('Primary endpoint failed:', err);
    }

    // If primary succeeded, use it
    if (finalProjects.length > 0) {
      setProjects(finalProjects);
      setDataSource(finalSource);
      setLoading(false);
      return;
    }

    // Try fallback endpoint (/api/projects-gdrive)
    try {
      const response = await fetch('/api/projects-gdrive');
      if (response.ok) {
        const data = await response.json();
        if (data.projects && data.projects.length > 0) {
          finalProjects = data.projects;
          finalSource = data.source || 'local-gog-fallback';
        } else {
          finalError = (finalError ? finalError + '; ' : '') + 'Fallback returned empty projects';
        }
      } else {
        finalError = (finalError ? finalError + '; ' : '') + `Fallback failed with status ${response.status}`;
      }
    } catch (err) {
      finalError = (finalError ? finalError + '; ' : '') + `Fallback error: ${err instanceof Error ? err.message : 'Unknown'}`;
      console.error('Fallback endpoint failed:', err);
    }

    // After both attempts
    if (finalProjects.length > 0) {
      setProjects(finalProjects);
      setDataSource(finalSource);
    } else {
      setError(finalError || 'Failed to fetch projects from any endpoint');
      setDataSource('');
    }
    setLoading(false);
  };

  const fetchWorkflowSteps = async (projectId: string) => {
    console.log('fetchWorkflowSteps called for project:', projectId);
    setLoadingSteps(true);
    setStepsError(null);
    try {
      const response = await fetch(`/api/project/steps?folderId=${projectId}`);
      console.log('fetchWorkflowSteps response status:', response.status);
      if (!response.ok) {
        throw new Error(`Failed to fetch workflow steps: ${response.status}`);
      }
      const data = await response.json();
      console.log('fetchWorkflowSteps data received, steps count:', data.steps?.length || 0, 'source:', data.source, 'error:', data.error);
      
      // Check if API returned an error
      if (data.error) {
        throw new Error(`API error: ${data.error}${data.details ? ` - ${data.details}` : ''}`);
      }
      
      setWorkflowSteps(data.steps || []);
      return data;
    } catch (err) {
      console.error('Error fetching workflow steps:', err);
      setStepsError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      console.log('fetchWorkflowSteps finished, setting loading to false');
      setLoadingSteps(false);
    }
  };

  const createWorkflowFolder = async (stepNumber: string, folderId?: string) => {
    const targetFolderId = folderId || selectedProject?.id;
    if (!targetFolderId) return;
    
    try {
      const response = await fetch('/api/project/steps-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: targetFolderId, stepNumber })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create folder: ${response.status}`);
      }
      
      const data = await response.json();
      
      setWorkflowSteps(prev => prev.map(step => 
        step.stepNumber === stepNumber 
          ? { 
              ...step, 
              exists: true, 
              id: data.folder.id, 
              url: data.folder.url,
              modifiedTime: new Date().toISOString()
            }
          : step
      ));
      
      return data;
    } catch (err) {
      console.error('Error creating workflow folder:', err);
      throw err;
    }
  };

  // Notes functionality
  const openNotesModal = async (step: WorkflowStep) => {
    setEditingStep(step);
    setNotesContent('');
    setSavingNotes(false);
    
    // Try to load existing notes
    try {
      const response = await fetch(`/api/project/notes?folderId=${step.id}&stepName=${encodeURIComponent(step.stepName)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.exists) {
          // Add timestamp to existing notes
          const currentContent = data.content;
          
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
          
          setNotesContent(newContent);
        } else {
          // No existing notes, start with timestamp
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
          
          const formattedTimestamp = timestamp.replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
          setNotesContent(`[${formattedTimestamp}]\n`);
        }
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
    
    setShowNotesModal(true);
  };

  const saveNotes = async () => {
    if (!editingStep) return;
    setSavingNotes(true);
    try {
      const response = await fetch('/api/project/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: editingStep.id,
          stepName: editingStep.stepName,
          content: notesContent,
        }),
      });
      if (response.ok) {
        setShowNotesModal(false);
        // Optionally show success message
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save notes');
      }
    } catch (err) {
      console.error('Error saving notes:', err);
      // Sanitize error message to avoid showing system prompts
      let errorMessage = 'Failed to save notes';
      if (err instanceof Error) {
        let message = err.message;
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
      setSavingNotes(false);
    }
  };

  // Step view functionality
  const openStepView = useCallback(async (step: WorkflowStep) => {
    // Push current state to navigation stack before navigating
    pushNavState(selectedProject, selectedStep, viewingNotesInline, viewingGalleryInline);
    setSelectedStep(step);
    setLoadingStepContents(true);
    setStepContentsError(null);
    setStepContents([]);
    // Reset folder navigation
    setCurrentFolderId(step.id);
    setFolderPath([{ id: step.id, name: step.stepName }]);
    
    try {
      const response = await fetch(`/api/project/step?folderId=${step.id}`);
      if (!response.ok) {
        throw new Error(`Failed to load step contents: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.items) {
        setStepContents(data.items);
        // Set gallery items for full-screen viewer
        setGalleryItems(data.items);
        setCurrentGalleryIndex(0);
        setCurrentGalleryFolderId(step.id);
        // Don't auto-open full-screen viewer - show thumbnail grid instead
      } else {
        throw new Error(data.error || 'No items found');
      }
    } catch (err) {
      console.error('Error loading step contents:', err);
      setStepContentsError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingStepContents(false);
    }
  }, []);

  // Refresh current folder without resetting navigation
  const refreshCurrentFolder = useCallback(async () => {
    if (!currentFolderId) return;
    
    setLoadingStepContents(true);
    // Don't clear stepContents immediately - keep showing current content until new data loads
    // setStepContents([]); // REMOVED to prevent flash
    
    try {
      const response = await fetch(`/api/project/step?folderId=${currentFolderId}`);
      if (!response.ok) {
        throw new Error(`Failed to load folder contents: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.items) {
        setStepContents(data.items);
        // Also update gallery items if we're at the current gallery folder
        if (currentGalleryFolderId === currentFolderId) {
          setGalleryItems(data.items);
        }
      } else {
        throw new Error(data.error || 'No items found');
      }
    } catch (err) {
      console.error('Error refreshing folder contents:', err);
      setStepContentsError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingStepContents(false);
    }
  }, [currentFolderId, currentGalleryFolderId]);

  const navigateToFolder = async (folderId: string, folderName: string) => {
    setLoadingStepContents(true);
    setStepContentsError(null);
    setStepContents([]);
    
    try {
      const response = await fetch(`/api/project/step?folderId=${folderId}`);
      if (!response.ok) {
        throw new Error(`Failed to load folder contents: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.items) {
        setStepContents(data.items);
        // Update current folder and path
        setCurrentFolderId(folderId);
        // Add to path if not already there
        setFolderPath(prev => {
          // Check if we're navigating to a folder already in path (going back)
          const existingIndex = prev.findIndex(f => f.id === folderId);
          if (existingIndex >= 0) {
            // Going back in path, truncate to that point
            return prev.slice(0, existingIndex + 1);
          } else {
            // Navigating deeper, add to path
            return [...prev, { id: folderId, name: folderName }];
          }
        });
        // Update gallery items for full-screen viewer
        setGalleryItems(data.items);
        setCurrentGalleryIndex(0);
        setCurrentGalleryFolderId(folderId);
        // Don't auto-open full-screen viewer - show thumbnail grid instead
      } else {
        throw new Error(data.error || 'No items found');
      }
    } catch (err) {
      console.error('Error loading folder contents:', err);
      setStepContentsError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingStepContents(false);
    }
  };

  const navigateBackInPath = (index: number) => {
    // Navigate to folder at specific index in path
    if (index < 0 || index >= folderPath.length) return;
    const targetFolder = folderPath[index];
    navigateToFolder(targetFolder.id, targetFolder.name);
  };

  const closeStepView = () => {
    setSelectedStep(null);
    setStepContents([]);
    setCurrentFolderId(null);
    setFolderPath([]);
    setShowGallery(false);
    setGalleryItems([]);
    setCurrentGalleryIndex(0);
    setCurrentGalleryFolderId(null);
  };

  // Handlers for GalleryView and FullScreenViewer
  const handleDeleteItem = async (item: any) => {
    setDeletingFileId(item.id);
    try {
      const response = await fetch(`/api/project/file/delete?fileId=${item.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete file');
      }
      
      // Remove the file from the UI
      setStepContents(prev => prev.filter(i => i.id !== item.id));
      setGalleryItems(prev => prev.filter(i => i.id !== item.id));
      
      // If we're viewing this item in gallery, close gallery
      if (galleryItems[currentGalleryIndex]?.id === item.id) {
        setShowGallery(false);
      }
      
    } catch (error) {
      console.error('Error deleting file:', error);
      // Sanitize error message to avoid showing system prompts
      let errorMessage = 'Failed to delete file';
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
      setDeletingFileId(null);
    }
  };

  // Save note content to an existing file


  // Open gallery viewer with filtered items (excluding markdown files)
  const openGalleryView = () => {
    const filteredItems = stepContents.filter(item => !item.name.toLowerCase().endsWith('.md'));
    if (filteredItems.length > 0) {
      setGalleryItems(filteredItems);
      setCurrentGalleryIndex(0);
      setViewingGalleryInline(true);
    } else {
      // If no non-markdown files, open with all items
      setGalleryItems(stepContents);
      setCurrentGalleryIndex(0);
      setViewingGalleryInline(true);
    }
  };

  // Gallery click handler - opens full screen viewer
  const handleGalleryItemClick = (item: any, index: number) => {
    // Push current state before opening gallery
    pushNavState(selectedProject, selectedStep, viewingNotesInline, viewingGalleryInline, showGallery, currentFolderId, folderPath);
    // Set gallery items from current step contents
    setGalleryItems(stepContents);
    // Find the item's index in the original stepContents (not filtered gallery)
    const originalIndex = stepContents.findIndex(stepItem => stepItem.id === item.id);
    setCurrentGalleryIndex(originalIndex !== -1 ? originalIndex : index);
    setViewingGalleryInline(true);
  };

  // Open notes file in gallery viewer or inline editor
  const openNotesFile = async (notesFile: any) => {
    if (!notesFile) return;
    // Push current state before opening notes
    pushNavState(selectedProject, selectedStep, viewingNotesInline, viewingGalleryInline, showGallery, currentFolderId, folderPath);
    // Determine if it's a markdown file
    const isMarkdown = notesFile.name.toLowerCase().endsWith('.md');
    if (isMarkdown) {
      // Open inline editor
      setInlineNotesFile(notesFile);
      setViewingNotesInline(true);
      setInlineNotesContent('');
      // Fetch content
      try {
        const response = await fetch(`/api/project/file/preview?fileId=${notesFile.id}&mimeType=${encodeURIComponent(notesFile.mimeType || '')}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch note content: ${response.status}`);
        }
        const data = await response.json();
        if (data.success && data.content) {
          setInlineNotesContent(data.content);
        } else {
          console.error('Failed to fetch note content:', data.error);
          // Set placeholder content
          setInlineNotesContent('# Error loading content\n\nPlease try again.');
        }
      } catch (error) {
        console.error('Error fetching note content:', error);
        setInlineNotesContent('# Error loading content\n\n' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    } else {
      // Open in gallery viewer (for images, etc.)
      const index = stepContents.findIndex(item => item.id === notesFile.id);
      if (index >= 0) {
        setGalleryItems(stepContents);
        setCurrentGalleryIndex(index);
        setViewingGalleryInline(true);
      }
    }
  };

  // Open iteration spec file (markdown) in inline editor
  const openSpecFile = async (specFile: any) => {
    if (!specFile) return;
    // Push current state before opening spec
    pushNavState(selectedProject, selectedStep, viewingNotesInline, viewingGalleryInline, showGallery, currentFolderId, folderPath);
    // Spec files are markdown, open inline editor
    setInlineNotesFile(specFile);
    setViewingNotesInline(true);
    setInlineNotesContent('');
    // Fetch content
    try {
      const response = await fetch(`/api/project/file/preview?fileId=${specFile.id}&mimeType=${encodeURIComponent(specFile.mimeType || '')}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch spec content: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.content) {
        setInlineNotesContent(data.content);
      } else {
        console.error('Failed to fetch spec content:', data.error);
        // Set placeholder content
        setInlineNotesContent('# Error loading spec content\n\nPlease try again.');
      }
    } catch (error) {
      console.error('Error fetching spec content:', error);
      setInlineNotesContent('# Error loading spec content\n\n' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Close inline notes editor
  const closeInlineNotes = async () => {
    // Save immediately before closing if there are pending changes
    if (inlineNotesFile && inlineNotesContent.trim()) {
      try {
        // Clear any pending debounced save
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
          autoSaveTimerRef.current = null;
        }
        
        // Save immediately
        await autoSaveInlineNotes();
      } catch (error) {
        console.error('Failed to save before closing:', error);
        // Don't prevent closing on save error
      }
    }
    
    setViewingNotesInline(false);
    setInlineNotesFile(null);
    setInlineNotesContent('');
    // Stop any speech recognition if active
    if (isListeningNotes && speechRecognitionNotes) {
      speechRecognitionNotes.stop();
      setIsListeningNotes(false);
    }
  };

  // Close inline gallery viewer
  const closeInlineGallery = () => {
    setViewingGalleryInline(false);
  };

  // Save inline notes
  const saveInlineNotes = async () => {
    if (!inlineNotesFile) return;
    
    // Stop any speech recognition if active
    if (isListeningNotes && speechRecognitionNotes) {
      speechRecognitionNotes.stop();
      setIsListeningNotes(false);
    }
    
    try {
      console.log('Saving inline notes:', inlineNotesFile.name);
      const response = await fetch('/api/project/file/update-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: inlineNotesFile.id, content: inlineNotesContent }),
      });
      
      if (!response.ok) {
        let errorMessage = `HTTP error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          // Ignore parse error
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('Inline notes saved successfully:', result);
      
      // Update the item in stepContents if it exists there
      if (result.file && result.file.modifiedTime) {
        setStepContents(prev => prev.map(stepItem => 
          stepItem.id === inlineNotesFile.id 
            ? { ...stepItem, modifiedTime: result.file.modifiedTime } 
            : stepItem
        ));
      }
      
      // Close the inline editor after successful save
      closeInlineNotes();
      
      // Show success notification
      setUserNotesNotification('Notes saved successfully!');
      setTimeout(() => {
        setUserNotesNotification(null);
      }, 3000);
      
      return result;
    } catch (error) {
      console.error('Error saving inline notes:', error);
      let errorMessage = 'Failed to save notes';
      if (error instanceof Error) {
        let message = error.message;
        if (message.includes('You are an expert Next.js developer')) {
          message = 'Server returned unexpected response';
        }
        if (message.length > 200) {
          message = message.substring(0, 200) + '...';
        }
        errorMessage = `${errorMessage}: ${message}`;
      }
      setUserNotesNotification(errorMessage);
      setTimeout(() => {
        setUserNotesNotification(null);
      }, 5000);
      throw error;
    }
  };

  // Auto-save inline notes (doesn't close editor)
  const autoSaveInlineNotes = async () => {
    if (!inlineNotesFile) return;
    
    // Clear any existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    
    // Don't save if content hasn't changed since last save
    // (We could implement this with a ref tracking last saved content)
    
    setIsAutoSaving(true);
    
    try {
      console.log('Auto-saving inline notes:', inlineNotesFile.name);
      const response = await fetch('/api/project/file/update-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: inlineNotesFile.id, content: inlineNotesContent }),
      });
      
      if (!response.ok) {
        let errorMessage = `HTTP error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          // Ignore parse error
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('Inline notes auto-saved successfully:', result);
      
      // Update the item in stepContents if it exists there
      if (result.file && result.file.modifiedTime) {
        setStepContents(prev => prev.map(stepItem => 
          stepItem.id === inlineNotesFile.id 
            ? { ...stepItem, modifiedTime: result.file.modifiedTime } 
            : stepItem
        ));
      }
      
      // Update last save time
      setLastAutoSaveTime(new Date());
      
      // Show subtle notification (could be a small toast or status indicator)
      // We'll show it in the UI as a status indicator
      
      return result;
    } catch (error) {
      console.error('Error auto-saving inline notes:', error);
      // Don't show intrusive error for auto-save, maybe just log
      throw error;
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Debounced auto-save trigger
  const triggerAutoSave = useCallback(() => {
    // Clear any existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Set new timer (2 second delay)
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveInlineNotes().catch(err => {
        console.error('Auto-save failed:', err);
      });
    }, 2000);
  }, [inlineNotesFile, inlineNotesContent]);

  // Clean up auto-save timer on unmount or when closing inline notes
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, []);

  // Also clear timer when closing inline notes
  useEffect(() => {
    if (!viewingNotesInline && autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, [viewingNotesInline]);

  // Reset textarea readonly state when file changes (for autofill prevention)
  useEffect(() => {
    setIsTextareaReadonly(true);
  }, [inlineNotesFile]);

  // Reset step notes textarea readonly state when step changes or modal opens
  useEffect(() => {
    setIsStepNotesTextareaReadonly(true);
  }, [editingStep, showNotesModal]);

  // Toggle speech recognition for inline notes
  const toggleInlineNotesSpeechRecognition = () => {
    if (!speechRecognitionNotes) return;
    
    if (isListeningNotes) {
      speechRecognitionNotes.stop();
      setIsListeningNotes(false);
    } else {
      // Clear any previous recognition results
      speechRecognitionNotes.start();
      setIsListeningNotes(true);
      // Clear placeholder if it exists when starting voice input
      if (inlineNotesContent.includes('Add your notes here...')) {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        });
        const newContent = inlineNotesContent.replace(
          'Add your notes here...', 
          `**Note started:** ${formattedDate}\n\n`
        );
        setInlineNotesContent(newContent);
      }
    }
  };

  // Helper to clear placeholder text and add timestamp when user starts editing
  const clearPlaceholderAndAddTimestamp = (content: string): string => {
    const placeholder = 'Add your notes here...';
    // Check if placeholder exists in content
    if (content.includes(placeholder)) {
      // Get current date/time in a readable format
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
      // Replace placeholder with timestamp note
      return content.replace(placeholder, `**Note started:** ${formattedDate}\n\n`);
    }
    return content;
  };

  // Handle inline notes textarea changes
  const handleInlineNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const processedContent = clearPlaceholderAndAddTimestamp(newContent);
    setInlineNotesContent(processedContent);
    
    // Trigger auto-save with debounce
    triggerAutoSave();
  };

  // Handle inline notes textarea blur (save immediately)
  const handleInlineNotesBlur = () => {
    // Clear any pending debounced save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    
    // Save immediately on blur if there's content
    if (inlineNotesFile && inlineNotesContent.trim()) {
      autoSaveInlineNotes().catch(err => {
        console.error('Auto-save on blur failed:', err);
      });
    }
  };

  // Handle inline notes textarea focus
  const handleInlineNotesFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Note: readonly is now controlled by Edit/Save button to prevent autofill popups
    // setIsTextareaReadonly(false); // Removed - now controlled by isEditingNotes state
    
    // Clear placeholder on focus if it exists
    if (inlineNotesContent.includes('Add your notes here...')) {
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
      const newContent = inlineNotesContent.replace(
        'Add your notes here...', 
        `**Note started:** ${formattedDate}\n\n`
      );
      setInlineNotesContent(newContent);
    }
  };

  // Create user notes
  const createUserNotes = useCallback(async () => {
    if (!selectedStep) return;
    setCreatingUserNotes(true);
    setUserNotesNotification('Creating user notes...');
    
    try {
      // Mark this folder as attempted to prevent duplicate creation attempts
      userNotesAttemptedRef.current.add(selectedStep.id);
      
      const clientName = selectedProject?.clientName || 'User Notes';
      console.log('Creating user notes in folder:', selectedStep.id);
      const response = await fetch('/api/project/file/create-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: selectedStep.id,
          fileName: 'user notes.md',
          content: `# ${clientName} - User Notes\n\n**Created:** ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
          })}\n\nAdd your notes here...`,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user notes');
      }
      
      const result = await response.json();
      console.log('User notes created successfully:', result);
      setUserNotesNotification('User notes created! Reloading...');
      
      // Wait a moment for Drive propagation, then reload step contents
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reload step contents to show the new file - with retry logic
      if (selectedStep && currentFolderId === selectedStep.id) {
        let retries = 3;
        let success = false;
        
        while (retries > 0 && !success) {
          try {
            console.log(`Refreshing folder contents (${retries} retries remaining)...`);
            await refreshCurrentFolder();
            success = true;
            setUserNotesNotification('User notes ready!');
            
            // Clear notification after 3 seconds
            setTimeout(() => {
              setUserNotesNotification(null);
            }, 3000);
          } catch (reloadError) {
            console.error(`Failed to refresh folder contents (retry ${3 - retries + 1}/3):`, reloadError);
            retries--;
            if (retries > 0) {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              setUserNotesNotification('Created notes but failed to refresh view');
              setTimeout(() => {
                setUserNotesNotification(null);
              }, 5000);
            }
          }
        }
      } else if (selectedStep) {
        // Fallback to openStepView if not at root folder (shouldn't happen)
        console.log('Not at root folder, using openStepView');
        await openStepView(selectedStep);
        setUserNotesNotification('User notes ready!');
        setTimeout(() => {
          setUserNotesNotification(null);
        }, 3000);
      }
      
      return result;
    } catch (error) {
      console.error('Error creating user notes:', error);
      // Sanitize error message to avoid showing system prompts
      let errorMessage = 'Failed to create user notes';
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
      setUserNotesNotification(errorMessage);
      setTimeout(() => {
        setUserNotesNotification(null);
      }, 5000);
      
      // Remove from attempted set so we can retry later
      userNotesAttemptedRef.current.delete(selectedStep.id);
      throw error;
    } finally {
      setCreatingUserNotes(false);
    }
  }, [selectedStep, selectedProject, openStepView, refreshCurrentFolder, currentFolderId]);

  // Save notes from FullScreenViewer
  const handleSaveNote = async (item: any, content: string) => {
    try {
      console.log('Saving note:', item.name, 'content length:', content.length);
      const response = await fetch('/api/project/file/update-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: item.id, content }),
      });
      
      if (!response.ok) {
        let errorMessage = `HTTP error ${response.status}`;
        try {
          // Try to parse JSON error response
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          // If not JSON, try to get text
          try {
            const text = await response.text();
            if (text && text.length < 100) {
              errorMessage = text;
            }
          } catch {
            // Ignore text parse error
          }
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('Note saved successfully:', result);
      
      // Update the item in stepContents if it exists there
      if (result.file && result.file.modifiedTime) {
        setStepContents(prev => prev.map(stepItem => 
          stepItem.id === item.id 
            ? { ...stepItem, modifiedTime: result.file.modifiedTime } 
            : stepItem
        ));
        
        // Also update galleryItems if the file is in the gallery
        setGalleryItems(prev => prev.map(galleryItem =>
          galleryItem.id === item.id
            ? { ...galleryItem, modifiedTime: result.file.modifiedTime }
            : galleryItem
        ));
      }
      
      return result;
    } catch (error) {
      console.error('Error saving note:', error);
      // Re-throw with a clean error message
      let errorMessage = 'Failed to save note';
      if (error instanceof Error) {
        // Clean up error message to avoid showing system prompts or HTML
        let message = error.message;
        // Remove any system prompt text
        if (message.includes('You are an expert Next.js developer')) {
          message = 'Server returned unexpected response';
        }
        // Truncate long error messages
        if (message.length > 200) {
          message = message.substring(0, 200) + '...';
        }
        errorMessage = `${errorMessage}: ${message}`;
      }
      throw new Error(errorMessage);
    }
  };

  // Preview functionality
  const openPreview = async (item: StepItem) => {
    setPreviewItem(item);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);
    // Reset translation state
    setTranslatedContent(null);
    setDisplayLanguage('en');
    setTranslating(false);
    setShowPreviewModal(true);
    
    try {
      // Fetch preview data from our API
      const response = await fetch(`/api/project/file/preview?fileId=${item.id}&mimeType=${encodeURIComponent(item.mimeType || '')}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch preview: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setPreviewData(data);
      } else {
        throw new Error(data.error || 'Preview failed');
      }
    } catch (err) {
      console.error('Error loading preview:', err);
      setPreviewError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    // Stop any ongoing TTS
    if (ttsUtterance) {
      window.speechSynthesis.cancel();
      setTtsUtterance(null);
      setTtsSpeaking(false);
    }
    
    setShowPreviewModal(false);
    setPreviewItem(null);
    setPreviewData(null);
    setPreviewLoading(false);
    setPreviewError(null);
    // Reset translation state
    setTranslatedContent(null);
    setDisplayLanguage('en');
    setTranslating(false);
  };

  // TTS (Text-to-Speech) functions
  const speakText = useCallback((text: string, lang: 'en' | 'es' = 'en') => {
    console.log('SPEAKTEXT CALLED with text:', text ? `"${text.substring(0, 100)}..."` : 'empty', 'lang:', lang);
    // Only run in browser
    if (typeof window === 'undefined') {
      console.log('window is undefined, returning');
      return;
    }
    
    // Check if browser supports speech synthesis
    if (!('speechSynthesis' in window)) {
      console.log('SpeechSynthesis not supported');
      return;
    }
    
    const synth = window.speechSynthesis;
    
    // Cancel any current speech and clear refs
    synth.cancel();
    utteranceRef.current = null;
    setTtsUtterance(null);
    setTtsSpeaking(false);
    
    // Clean text
    let cleanText = text
      .replace(/#{1,6}\s*/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/---+/g, '')
      .replace(/>\s*/g, '')
      .trim();
    
    if (!cleanText) cleanText = text.trim();
    if (!cleanText) return;
    
    // Helper to actually speak after voices are ready
    const speakWithVoices = () => {
      const voices = synth.getVoices();
      if (voices.length === 0) {
        console.log('Still no voices, cannot speak');
        return;
      }
      
      // Create utterance
      const utterance = new SpeechSynthesisUtterance(cleanText);
      console.log('Utterance created with text:', `"${cleanText.substring(0, 50)}..."`, 'lang:', utterance.lang);
      utterance.lang = lang === 'es' ? 'es' : 'en';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Store references
      utteranceRef.current = utterance;
      setTtsUtterance(utterance);
      
      utterance.onstart = () => {
        console.log('Speech started');
        setTtsSpeaking(true);
        setTtsLanguage(lang);
      };
      
      utterance.onend = () => {
        console.log('Speech ended');
        setTtsSpeaking(false);
        setTtsUtterance(null);
        utteranceRef.current = null;
      };
      
      utterance.onerror = (event) => {
        console.log('Speech error:', event.error);
        setTtsSpeaking(false);
        setTtsUtterance(null);
        utteranceRef.current = null;
      };
      
      try {
        console.log('Calling synth.speak...');
        synth.speak(utterance);
        console.log('synth.speak called, synth.speaking:', synth.speaking);
      } catch (error) {
        console.log('Speech synthesis error:', error);
        setTtsSpeaking(false);
        setTtsUtterance(null);
        utteranceRef.current = null;
      }
    };
    
    // Check if voices are loaded
    const voices = synth.getVoices();
    if (voices.length === 0) {
      if (!voicesLoadedRef.current) {
        console.log('No voices available, waiting for voiceschanged event');
        const onVoicesChanged = () => {
          console.log('Voices changed, voices loaded:', synth.getVoices().length);
          voicesLoadedRef.current = true;
          synth.removeEventListener('voiceschanged', onVoicesChanged);
          speakWithVoices();
        };
        synth.addEventListener('voiceschanged', onVoicesChanged);
        return;
      } else {
        // Voices were supposed to be loaded but still empty
        console.log('Voices still not available after waiting');
        return;
      }
    }
    
    // Voices are available, speak now
    voicesLoadedRef.current = true;
    speakWithVoices();
  }, []);

  const stopSpeaking = useCallback(() => {
    if (window.speechSynthesis) {
      console.log('Stopping speech');
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
      setTtsSpeaking(false);
      setTtsUtterance(null);
    }
  }, []);

  // Mock translation function (replace with real API in production)
  const translateText = useCallback(async (text: string, targetLang: 'en' | 'es'): Promise<string> => {
    // This is a mock translation - expanded with interior design vocabulary from Joe Blow project
    // For production, use Google Translate API, LibreTranslate, or similar
    if (targetLang === 'es') {
      // Expanded interior design vocabulary based on actual client notes analysis
      const replacements: Record<string, string> = {
        // Common words
        'the': 'el', 'The': 'El', 'and': 'y', 'And': 'Y', 'is': 'es', 'Is': 'Es', 'are': 'son', 'Are': 'Son',
        'to': 'a', 'To': 'A', 'of': 'de', 'Of': 'De', 'in': 'en', 'In': 'En', 'for': 'para', 'For': 'Para',
        'with': 'con', 'With': 'Con', 'on': 'en', 'On': 'En', 'at': 'en', 'At': 'En', 'by': 'por', 'By': 'Por',
        'this': 'este', 'This': 'Este', 'that': 'ese', 'That': 'Ese', 'could': 'podría', 'Could': 'Podría',
        'should': 'debería', 'Should': 'Debería', 'would': 'sería', 'Would': 'Sería',
        
        // Project and client terms
        'client': 'cliente', 'Client': 'Cliente', 'notes': 'notas', 'Notes': 'Notas', 'project': 'proyecto',
        'Project': 'Proyecto', 'date': 'fecha', 'Date': 'Fecha', 'designer': 'diseñadora', 'Designer': 'Diseñadora',
        'initial': 'inicial', 'Initial': 'Inicial', 'visit': 'visita', 'Visit': 'Visita', 'overview': 'resumen',
        'Overview': 'Resumen', 'current': 'actual', 'Current': 'Actual', 'layout': 'disposición', 'Layout': 'Disposición',
        
        // Room types
        'room': 'habitación', 'Room': 'Habitación', 'living': 'sala', 'Living': 'Sala', 'living room': 'sala de estar',
        'Living Room': 'Sala de estar', 'kitchen': 'cocina', 'Kitchen': 'Cocina', 'bathroom': 'baño', 'Bathroom': 'Baño',
        'bedroom': 'dormitorio', 'Bedroom': 'Dormitorio', 'office': 'oficina', 'Office': 'Oficina', 'entry': 'entrada',
        'Entry': 'Entrada',
        
        // Design elements
        'design': 'diseño', 'Design': 'Diseño', 'color': 'color', 'Color': 'Color', 'style': 'estilo', 'Style': 'Estilo',
        'modern': 'moderno', 'Modern': 'Moderno', 'traditional': 'tradicional', 'Traditional': 'Tradicional',
        'mid-century': 'mediados de siglo', 'Mid-century': 'Mediados de siglo', 'vintage': 'vintage', 'Vintage': 'Vintage',
        'rustic': 'rústico', 'Rustic': 'Rústico', 'contemporary': 'contemporáneo', 'Contemporary': 'Contemporáneo',
        
        // Architectural features
        'wall': 'pared', 'Wall': 'Pared', 'walls': 'paredes', 'Walls': 'Paredes', 'fireplace': 'chimenea',
        'Fireplace': 'Chimenea', 'windows': 'ventanas', 'Windows': 'Ventanas', 'window': 'ventana', 'Window': 'Ventana',
        'ceiling': 'techo', 'Ceiling': 'Techo', 'ceilings': 'techos', 'Ceilings': 'Techos', 'floor': 'piso', 'Floor': 'Piso',
        'flooring': 'suelo', 'Flooring': 'Suelo', 'view': 'vista', 'View': 'Vista', 'light': 'luz', 'Light': 'Luz',
        'lighting': 'iluminación', 'Lighting': 'Iluminación', 'natural light': 'luz natural', 'Natural Light': 'Luz natural',
        'brick': 'ladrillo', 'Brick': 'Ladrillo', 'mantel': 'repisa', 'Mantel': 'Repisa', 'grid': 'rejilla', 'Grid': 'Rejilla',
        'pane': 'panel', 'Pane': 'Panel', 'water': 'agua', 'Water': 'Agua', 'focal': 'focal', 'Focal': 'Focal',
        'point': 'punto', 'Point': 'Punto', 'architectural': 'arquitectónico', 'Architectural': 'Arquitectónico',
        'feature': 'característica', 'Feature': 'Característica', 'features': 'características', 'Features': 'Características',
        
        // Furniture
        'furniture': 'muebles', 'Furniture': 'Muebles', 'sofa': 'sofá', 'Sofa': 'Sofá', 'chairs': 'sillas', 'Chairs': 'Sillas',
        'table': 'mesa', 'Table': 'Mesa', 'coffee table': 'mesa de centro', 'Coffee Table': 'Mesa de centro',
        'credenza': 'credensa', 'Credenza': 'Credensa', 'accent': 'acento', 'Accent': 'Acento', 'legs': 'patas', 'Legs': 'Patas',
        'hairpin legs': 'patas de alfiler', 'Hairpin Legs': 'Patas de alfiler', 'area rug': 'alfombra', 'Area Rug': 'Alfombra',
        'rug': 'alfombra', 'Rug': 'Alfombra', 'pillows': 'cojines', 'Pillows': 'Cojines', 'throw': 'manta', 'Throw': 'Manta',
        
        // Materials and colors
        'wood': 'madera', 'Wood': 'Madera', 'walnut': 'nogal', 'Walnut': 'Nogal', 'tile': 'azulejo', 'Tile': 'Azulejo',
        'saltillo': 'saltillo', 'Saltillo': 'Saltillo', 'textiles': 'textiles', 'Textiles': 'Textiles',
        'mustard': 'mostaza', 'Mustard': 'Mostaza', 'yellow': 'amarillo', 'Yellow': 'Amarillo', 'gray': 'gris', 'Gray': 'Gris',
        'dark': 'oscuro', 'Dark': 'Oscuro', 'black': 'negro', 'Black': 'Negro', 'white': 'blanco', 'White': 'Blanco',
        'brown': 'marrón', 'Brown': 'Marrón', 'warm': 'cálido', 'Warm': 'Cálido', 'neutral': 'neutral', 'Neutral': 'Neutral',
        
        // Layout and placement
        'placement': 'colocación', 'Placement': 'Colocación', 'adjacent': 'adyacente', 'Adjacent': 'Adyacente',
        'transition': 'transición', 'Transition': 'Transición', 'between': 'entre', 'Between': 'Entre', 'right': 'derecha',
        'Right': 'Derecha', 'back': 'trasera', 'Back': 'Trasera', 'under': 'debajo', 'Under': 'Debajo', 'above': 'encima',
        'Above': 'Encima', 'against': 'contra', 'Against': 'Contra', 'between rooms': 'entre habitaciones',
        
        // Functional terms
        'functional': 'funcional', 'Functional': 'Funcional', 'needs': 'necesita', 'Needs': 'Necesita',
        'work': 'funcionar', 'Work': 'Funcionar', 'works': 'funciona', 'Works': 'Funciona', 'strong': 'fuerte',
        'Strong': 'Fuerte', 'good': 'buen', 'Good': 'Buen', 'great': 'excelente', 'Great': 'Excelente',
        'decent': 'decente', 'Decent': 'Decente', 'nice': 'agradable', 'Nice': 'Agradable', 'faded': 'descolorido',
        'Faded': 'Descolorido', 'worn': 'gastado', 'Worn': 'Gastado',
        
        // Action verbs
        'adds': 'añade', 'Adds': 'Añade', 'being used': 'se utiliza', 'Being used': 'Se utiliza', 'dominate': 'dominan',
        'Dominate': 'Dominan', 'feel': 'sensación', 'Feel': 'Sensación', 'may need': 'puede necesitar', 'May need': 'Puede necesitar',
        'replacing': 'reemplazo', 'Replacing': 'Reemplazo', 'depending': 'dependiendo', 'Depending': 'Dependiendo',
        'direction': 'dirección', 'Direction': 'Dirección', 'noted': 'anotado', 'Noted': 'Anotado',
      };
      
      let translated = text;
      
      // First handle multi-word phrases (important to do before single words)
      const multiWordReplacements = Object.entries(replacements).filter(([key]) => key.includes(' '));
      for (const [english, spanish] of multiWordReplacements) {
        const regex = new RegExp(english, 'gi');
        translated = translated.replace(regex, spanish);
      }
      
      // Then handle single words
      const singleWordReplacements = Object.entries(replacements).filter(([key]) => !key.includes(' '));
      for (const [english, spanish] of singleWordReplacements) {
        const regex = new RegExp(`\\b${english}\\b`, 'gi');
        translated = translated.replace(regex, spanish);
      }
      
      // Clean up any double spaces from replacements
      translated = translated.replace(/\s+/g, ' ');
      
      // Add Spanish header but don't duplicate if already there
      if (!translated.includes('[Traducido al español]')) {
        return `[Traducido al español]\n\n${translated}`;
      }
      return translated;
    } else {
      // For English, return original (or reverse translation in a real implementation)
      return text;
    }
  }, []);

  const handleSpeakEnglish = useCallback(async (content?: string) => {
    try {
      console.log('handleSpeakEnglish called, content:', content ? 'provided' : 'not provided');
      console.log('previewData:', previewData);
      const textToSpeak = content || previewData?.content;
      console.log('textToSpeak:', textToSpeak ? `"${textToSpeak.substring(0, 50)}..."` : 'empty');
      
      if (!textToSpeak || typeof textToSpeak !== 'string' || textToSpeak.trim() === '') {
        console.log('No text to speak');
        return;
      }
      
      if (ttsSpeaking && ttsLanguage === 'en') {
        console.log('Already speaking English, stopping');
        stopSpeaking();
      } else {
        console.log('Starting English speech');
        // Switch display to English
        setDisplayLanguage('en');
        // If we have translated content, switch back to original
        if (translatedContent) {
          setTranslatedContent(null);
        }
        speakText(textToSpeak, 'en');
      }
    } catch (error) {
      // Silently fail - don't show alerts for TTS errors
      console.error('Error in handleSpeakEnglish:', error);
    }
  }, [previewData, ttsSpeaking, ttsLanguage, stopSpeaking, setDisplayLanguage, translatedContent, setTranslatedContent, speakText]);

  const handleSpeakSpanish = useCallback(async (content?: string) => {
    try {
      console.log('handleSpeakSpanish called, content:', content ? 'provided' : 'not provided');
      console.log('previewData:', previewData);
      const textToTranslate = content || previewData?.content;
      console.log('textToTranslate:', textToTranslate ? `"${textToTranslate.substring(0, 50)}..."` : 'empty');
      
      if (!textToTranslate || typeof textToTranslate !== 'string' || textToTranslate.trim() === '') {
        console.log('No text to translate');
        return;
      }
      
      if (ttsSpeaking && ttsLanguage === 'es') {
        console.log('Already speaking Spanish, stopping');
        stopSpeaking();
        return;
      }
      
      console.log('Starting Spanish speech');
      // Switch display to Spanish
      setDisplayLanguage('es');
      
      // Check if we already have translated content and it's for this text
      if (translatedContent && displayLanguage === 'es' && (!content || content === previewData?.content)) {
        // Use existing translation for TTS
        console.log('Using existing translation');
        speakText(translatedContent, 'es');
      } else {
        // Need to translate
        console.log('Translating content');
        setTranslating(true);
        
        try {
          // Translate the content
          const translated = await translateText(textToTranslate, 'es');
          console.log('Translation complete:', translated ? `"${translated.substring(0, 50)}..."` : 'empty');
          setTranslatedContent(translated);
          setTranslating(false);
          
          // Speak the translated content
          speakText(translated, 'es');
        } catch (error) {
          console.error('Translation failed:', error);
          setTranslating(false);
          // Fall back to speaking original text in Spanish
          console.log('Falling back to original text for Spanish speech');
          speakText(textToTranslate, 'es');
        }
      }
    } catch (error) {
      // Silently fail - don't show alerts for TTS errors
      console.error('Error in handleSpeakSpanish:', error);
    }
  }, [previewData, ttsSpeaking, ttsLanguage, stopSpeaking, setDisplayLanguage, translatedContent, displayLanguage, speakText, translateText, setTranslating]);

  const getPreviewUrl = (item: StepItem) => {
    if (!item.id) return item.url;
    
    // Google Drive embed URLs for different file types
    if (item.mimeType?.startsWith('image/')) {
      return `https://drive.google.com/thumbnail?id=${item.id}&sz=w1000`;
    }
    
    if (item.mimeType === 'application/pdf') {
      return `https://drive.google.com/file/d/${item.id}/preview`;
    }
    
    // Google Docs, Sheets, Slides
    if (item.mimeType?.includes('document')) {
      return `https://docs.google.com/document/d/${item.id}/preview`;
    }
    if (item.mimeType?.includes('spreadsheet')) {
      return `https://docs.google.com/spreadsheets/d/${item.id}/preview`;
    }
    if (item.mimeType?.includes('presentation')) {
      return `https://docs.google.com/presentation/d/${item.id}/preview`;
    }
    
    // Default to regular view URL
    return item.url;
  };

  const isEmbeddablePreview = (item: StepItem) => {
    const embeddableTypes = [
      'image/', 'application/pdf', 
      'application/vnd.google-apps.document',
      'application/vnd.google-apps.spreadsheet',
      'application/vnd.google-apps.presentation',
      'text/plain', 'text/markdown', 'text/html', 'text/css', 'text/javascript',
      'application/json'
    ];
    
    return embeddableTypes.some(type => 
      item.mimeType?.startsWith(type) || 
      (item.type === 'document' && item.name?.match(/\.(txt|md|html|css|js|json)$/i))
    );
  };

  const handleAddClient = async (name: string) => {
    if (!name.trim()) {
      alert('Please enter a client name');
      return;
    }
    
    try {
      const response = await fetch('/api/project/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: name, projectDescription: name })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create client');
      }
      
      const createData = await response.json();
      
      // Wait a bit for Google Drive to fully register the new folder
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setShowAddClientModal(false);
      setClientName('');
      
      // Refresh projects list
      await fetchProjects();
      
      // Auto-select the new project
      if (createData.project) {
        setSelectedProject(createData.project);
        setWorkflowSteps([]);
        setStepsError(null);
        setShowAllProjects(false);
        
        // Fetch and display workflow steps
        const stepsData = await fetchWorkflowSteps(createData.project.id);
        
        if (stepsData && stepsData.steps) {
          // Check for missing folders and create them if needed
          const missingSteps = stepsData.steps.filter((step: any) => !step.exists);
          if (missingSteps.length > 0) {
            setCreatingWorkflow(true);
            try {
              for (const step of missingSteps) {
                await createWorkflowFolder(step.stepNumber, createData.project.id);
                await new Promise(resolve => setTimeout(resolve, 300));
              }
              // Refresh to show newly created folders
              await fetchWorkflowSteps(createData.project.id);
            } catch (err) {
              console.error('Error creating missing folders:', err);
            } finally {
              setCreatingWorkflow(false);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error creating client:', error);
      alert(`Failed to create client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleProjectSelect = async (project: Project) => {
    try {
      console.log('handleProjectSelect called for:', project.clientName, project.id);
      // Push current state to navigation stack before navigating
      pushNavState(selectedProject, selectedStep, viewingNotesInline, viewingGalleryInline);
      setSelectedProject(project);
      setStepsError(null);
      setShowAllProjects(false);
      setCreatingWorkflow(false);
      
      // First, fetch and display workflow steps
      const stepsData = await fetchWorkflowSteps(project.id);
      console.log('handleProjectSelect after fetchWorkflowSteps, steps count:', stepsData?.steps?.length || 0);
      
      if (!stepsData || !stepsData.steps) {
        console.log('handleProjectSelect: no steps data or steps array');
        return;
      }
      
      // Check for missing folders and create them if needed
      const missingSteps = stepsData.steps.filter((step: any) => !step.exists);
      console.log('handleProjectSelect: missing steps count:', missingSteps.length);
      if (missingSteps.length > 0) {
        setCreatingWorkflow(true);
        try {
          for (const step of missingSteps) {
            await createWorkflowFolder(step.stepNumber, project.id);
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          // Refresh to show newly created folders
          await fetchWorkflowSteps(project.id);
        } catch (err) {
          console.error('Error creating missing folders:', err);
        } finally {
          setCreatingWorkflow(false);
        }
      }
    } catch (error) {
      console.error('Error in handleProjectSelect:', error);
      setStepsError(error instanceof Error ? error.message : 'Unknown error in handleProjectSelect');
    }
  };

  // Delete file functions
  const confirmDelete = (item: StepItem) => {
    setFileToDelete(item);
    setShowDeleteConfirm(true);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setFileToDelete(null);
    setDeletingFileId(null);
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;
    
    setDeletingFileId(fileToDelete.id);
    try {
      const response = await fetch(`/api/project/file/delete?fileId=${fileToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete file');
      }
      
      // Remove the file from the UI
      setStepContents(prev => prev.filter(item => item.id !== fileToDelete.id));
      
      
      
    } catch (error) {
      console.error('Error deleting file:', error);
      alert(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      cancelDelete();
    }
  };

  // File upload functions
  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const folderId = currentFolderId || selectedStep?.id;
    if (!folderId) {
      alert('No folder selected for upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    
    try {
      // Upload all selected files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(Math.round((i / files.length) * 100));
        
        const formData = new FormData();
        formData.append('folderId', folderId);
        formData.append('file', file);
        
        const response = await fetch('/api/project/file/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to upload ${file.name}`);
        }
        
        const result = await response.json();
        
        // Add uploaded file to the UI
        if (result.success && result.file) {
          const newItem: StepItem = {
            id: result.file.id,
            name: result.file.name,
            type: result.file.mimeType?.includes('folder') ? 'folder' : 'file',
            icon: '📄',
            url: result.file.webViewLink,
            createdTime: result.file.createdTime || new Date().toISOString(),
            modifiedTime: result.file.modifiedTime,
            size: result.file.size || 'unknown',
            mimeType: result.file.mimeType,
          };
          setStepContents(prev => [...prev, newItem]);
        }
      }
      
      setUploadProgress(100);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Show success message
      alert(`Successfully uploaded ${files.length} file${files.length > 1 ? 's' : ''}`);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError(error instanceof Error ? error.message : 'Unknown error');
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Determine displayed projects (show 3 most recent by default, or all if toggled)
  const displayedProjects = showAllProjects 
    ? [...projects].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [...projects].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (navStack.length > 0) {
        // Pop the last state and restore it
        const previousState = navStack[navStack.length - 1];
        setNavStack(prev => prev.slice(0, -1));
        // Scroll to top when navigating
        window.scrollTo(0, 0);
        setSelectedProject(previousState.project);
        setSelectedStep(previousState.step);
        setViewingNotesInline(previousState.viewingInline);
        setViewingGalleryInline(previousState.viewingGalleryInline);
        setShowGallery(previousState.showGallery);
        setCurrentFolderId(previousState.folderId);
        setFolderPath(previousState.folderPath || []);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navStack]);

  // Helper to push state when navigating forward
  const pushNavState = useCallback((project: Project | null, step: WorkflowStep | null, viewingInline: boolean, viewingGalleryInline: boolean = false, showGallery: boolean = false, folderId: string | null = null, folderPath: Array<{id: string, name: string}> = []) => {
    // Scroll to top when navigating
    window.scrollTo(0, 0);
    setNavStack(prev => [...prev, { project, step, viewingInline, viewingGalleryInline, showGallery, folderId, folderPath }]);
    // Also push to browser history so back button works
    window.history.pushState({ project: project?.id, step: step?.id, viewingInline }, '', window.location.href);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header - Matching SheilaGutierrezDesigns.com styling with integrated breadcrumbs */}
      <header className={`fixed top-0 left-0 right-0 z-40 ${viewingNotesInline || selectedStep ? 'h-32' : 'h-20'} border-b border-black/5 bg-white/85 backdrop-blur-sm flex flex-col justify-center py-2 px-6 md:px-10`}>
        <div className="flex items-center justify-start w-full">
          <div className="min-w-0">
            <h1 className="font-[var(--font-playfair)] text-[#2c3e50] text-[1.4rem] font-bold tracking-[3px] truncate">Sheila Gutierrez Designs</h1>
            <p className="text-[0.85rem] font-normal text-[#2c3e50]/80 mt-0.5 font-[var(--font-lato)] tracking-[2px] uppercase transition-colors duration-300 truncate">Client Portal</p>
          </div>
        </div>
        {viewingNotesInline ? (
          <div className="mt-2 w-full">
            <div className="flex items-center justify-between text-sm flex-wrap gap-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={closeInlineNotes}
                  className="text-[#2c3e50] hover:text-[#c5a059] p-1 rounded-md hover:bg-gray-100"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <button
                  onClick={closeInlineNotes}
                  className="text-md font-semibold text-[#2c3e50] truncate hover:text-[#c5a059] hover:underline focus:outline-none"
                  title="Click to go back"
                >
                  {(() => {
                    // Extract iteration number from spec filename
                    // Pattern: moodboard_X_spec.md -> Iteration X
                    if (inlineNotesFile?.name) {
                      const match = inlineNotesFile.name.match(/moodboard_(\d+)_spec\.md/i);
                      if (match && match[1]) {
                        return `Iteration ${match[1]}`;
                      }
                    }
                    return inlineNotesFile?.name || 'Notes';
                  })()}
                </button>
              </div>
              <div className="flex items-center gap-2">
                {/* Edit/Save button */}
                <button
                  onClick={() => {
                    if (isEditingNotes) {
                      // Save and exit editing mode
                      autoSaveInlineNotes().catch(err => {
                        console.error('Save failed:', err);
                      });
                      setIsEditingNotes(false);
                      setIsTextareaReadonly(true);
                    } else {
                      // Enter editing mode
                      setIsEditingNotes(true);
                      setIsTextareaReadonly(false);
                    }
                  }}
                  className="px-3 py-1.5 bg-[#c5a059] text-white text-sm font-medium rounded-md hover:bg-[#b08e4d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c5a059] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isEditingNotes ? 'Save' : 'Edit'}
                </button>
                {/* TTS buttons for markdown/text files */}
                {inlineNotesFile && (inlineNotesFile.name.toLowerCase().endsWith('.md') || inlineNotesFile.mimeType === 'text/markdown' || inlineNotesFile.mimeType === 'text/plain') && inlineNotesContent.trim().length > 0 && (
                  <>
                    <button
                      onClick={() => {
                        if (ttsSpeaking && ttsLanguage === 'en') {
                          stopSpeaking();
                        } else {
                          handleSpeakEnglish(inlineNotesContent);
                        }
                      }}
                      className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
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
                          stopSpeaking();
                        } else {
                          handleSpeakSpanish(inlineNotesContent);
                        }
                      }}
                      className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
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
                {/* Auto-save status indicator */}
                {isAutoSaving ? (
                  <div className="flex items-center text-xs text-gray-500 px-2">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500 mr-1"></div>
                    Saving...
                  </div>
                ) : lastAutoSaveTime ? (
                  <div className="text-xs text-gray-400 px-2" title={`Last saved: ${lastAutoSaveTime.toLocaleTimeString()}`}>
                    ✓ Saved
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : selectedStep && (
          <div className="mt-2 w-full">
            <div className="flex items-center justify-between text-sm flex-wrap gap-1">
              <div className="flex items-center flex-wrap gap-1">
                <button
                  onClick={closeStepView}
                  className="text-[#2c3e50] hover:text-[#c5a059] flex items-center gap-1"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {selectedProject?.clientName}
                </button>
                
                {folderPath.map((folder, index) => (
                  <div key={folder.id} className="flex items-center">
                    <span className="mx-1 text-gray-400">/</span>
                    {index === folderPath.length - 1 ? (
                      <span className="font-medium text-[#c5a059] truncate max-w-[120px] md:max-w-[200px]">
                        {folder.name}
                      </span>
                    ) : (
                      <button
                        onClick={() => navigateBackInPath(index)}
                        className="text-[#2c3e50] hover:text-[#c5a059] truncate max-w-[120px] md:max-w-[200px]"
                      >
                        {folder.name}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Save button for Initial Contact step */}
              {selectedStep?.stepName === 'Initial Contact' && currentFolderId === selectedStep.id && (
                <>
                  {console.log('Save button condition met:', { 
                    stepName: selectedStep?.stepName, 
                    currentFolderId, 
                    selectedStepId: selectedStep?.id,
                    condition: currentFolderId === selectedStep.id
                  })}
                  <button
                    onClick={() => {
                      console.log('Initial Contact save button clicked', { 
                        selectedStepId: selectedStep?.id, 
                        currentFolderId, 
                        initialContactSaving,
                        stepName: selectedStep?.stepName 
                      });
                      window.dispatchEvent(new CustomEvent('initial-contact-save-click'));
                    }}
                    disabled={initialContactSaving}
                    className="px-3 py-1.5 bg-[#c5a059] text-white text-sm font-medium rounded-md hover:bg-[#b08e4d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c5a059] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {initialContactSaving ? (
                      <>
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-1"></span>
                        Saving...
                      </>
                    ) : 'Save'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* User Notes Notification */}
      {userNotesNotification && (
        <div className={`fixed ${selectedStep ? 'top-32' : 'top-20'} left-0 right-0 z-30 bg-[#c5a059] text-white py-2 px-4 text-center text-sm font-medium`}>
          {userNotesNotification}
        </div>
      )}

      {/* Main Content */}
      <main className={`${selectedStep ? 'pt-32' : 'pt-20'} px-4 pb-20 relative max-w-screen-md lg:max-w-screen-lg mx-auto w-full overflow-x-hidden flex flex-col`}> {/* Dynamic top padding based on header height */}
        {selectedStep ? (
          viewingNotesInline ? (
            // Inline Notes Editor
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto flex-1 flex flex-col">
              {/* Editor Header */}
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={closeInlineNotes}
                    className="text-gray-600 hover:text-gray-900 p-1 rounded-md hover:bg-gray-100"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                  </button>
                  <button
                    onClick={closeInlineNotes}
                    className="text-md font-semibold text-gray-900 truncate hover:text-gray-700 hover:underline focus:outline-none"
                    title="Click to go back"
                  >
                    {(() => {
                      // Extract iteration number from spec filename
                      // Pattern: moodboard_X_spec.md -> Iteration X
                      if (inlineNotesFile?.name) {
                        const match = inlineNotesFile.name.match(/moodboard_(\d+)_spec\.md/i);
                        if (match && match[1]) {
                          return `Iteration ${match[1]}`;
                        }
                      }
                      return inlineNotesFile?.name || 'Notes';
                    })()}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {/* TTS buttons for markdown/text files */}
                  {inlineNotesFile && (inlineNotesFile.name.toLowerCase().endsWith('.md') || inlineNotesFile.mimeType === 'text/markdown' || inlineNotesFile.mimeType === 'text/plain') && inlineNotesContent.trim().length > 0 && (
                    <>
                      <button
                        onClick={() => {
                          if (ttsSpeaking && ttsLanguage === 'en') {
                            stopSpeaking();
                          } else {
                            handleSpeakEnglish(inlineNotesContent);
                          }
                        }}
                        className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
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
                            stopSpeaking();
                          } else {
                            handleSpeakSpanish(inlineNotesContent);
                          }
                        }}
                        className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
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
                  {/* Auto-save status indicator */}
                  {isAutoSaving ? (
                    <div className="flex items-center text-xs text-gray-500 px-2">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500 mr-1"></div>
                      Saving...
                    </div>
                  ) : lastAutoSaveTime ? (
                    <div className="text-xs text-gray-400 px-2" title={`Last saved: ${lastAutoSaveTime.toLocaleTimeString()}`}>
                      ✓ Saved
                    </div>
                  ) : null}
                </div>
              </div>
              
              {/* Editor Content */}
              <div className="flex-1 flex flex-col">
                <textarea
                  value={inlineNotesContent}
                  onChange={handleInlineNotesChange}
                  onFocus={handleInlineNotesFocus}
                  onBlur={handleInlineNotesBlur}
                  className="flex-1 w-full font-mono text-sm p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#c5a059] focus:border-transparent resize-none min-h-[calc(100vh-300px)] text-[#2c3e50]"
                  placeholder="Start typing your notes here..."
                  autoFocus
                  autoComplete="new-password"
                  inputMode="text"
                  data-1p-ignore
                  spellCheck="false"
                  autoCorrect="off"
                  autoCapitalize="off"
                  data-lpignore="true"
                  readOnly={isTextareaReadonly}
                  aria-label="Notes editor"
                  id="notes-editor-spec"
                  name="notes-editor"
                />
              </div>
            </div>
          ) : viewingGalleryInline ? (
            // Inline Gallery Viewer
            <div className="flex-1">
              <InlineGalleryViewer
                items={galleryItems}
                initialIndex={currentGalleryIndex}
                isOpen={viewingGalleryInline}
                onClose={closeInlineGallery}
                onSaveNote={handleSaveNote}
                onSpeakEnglish={handleSpeakEnglish}
                onSpeakSpanish={handleSpeakSpanish}
                onStopSpeaking={stopSpeaking}
                ttsSpeaking={ttsSpeaking}
                ttsLanguage={ttsLanguage}
                phaseName={selectedStep?.stepName || 'Gallery'}
              />
            </div>
          ) : (
            // Selected Step Contents View (Normal)
            <div className="flex-1 flex flex-col">
            
            

              {/* Hidden file input - keep for upload functionality */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                className="hidden"
                accept="*/*"
              />

            {loadingStepContents ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-rose-600 border-t-transparent"></div>
                <p className="mt-4 text-[#2c3e50]">Loading folder contents...</p>
              </div>
            ) : stepContentsError ? (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="rounded-lg bg-red-50 p-3">
                  <h3 className="font-medium text-red-800">Error Loading Contents</h3>
                  <p className="mt-1 text-sm text-red-600">{stepContentsError}</p>
                  <button
                    onClick={() => selectedStep && openStepView(selectedStep)}
                    className="mt-3 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : (
              // Check for Initial Contact step first
              selectedStep?.stepName === 'Initial Contact' && currentFolderId === selectedStep.id ? (
                <div className="flex-1 flex flex-col">
                  <InitialContactView 
                    folderId={currentFolderId} 
                    clientName={selectedProject?.clientName}
                  />
                </div>
              ) : stepContents.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-[#2c3e50]">No files in this folder</h3>
                  <p className="mt-2 text-gray-500">This {selectedStep?.stepName} folder is empty.</p>
                </div>
              ) : (
                <div className="pb-20">
                  {/* Check for iteration folders - show special view if found */}
                  {stepContents.some(item => 
                    item.type === 'folder' && item.name.toLowerCase().includes('iteration')
                  ) ? (
                    <IterationView
                      items={stepContents}
                      stepName={selectedStep?.stepName || 'Moodboard'}
                      onSpecAvailable={setActiveIterationSpecFile}
                    />
                  ) : (
                    <GalleryView
                      items={stepContents.filter(item => !item.name.toLowerCase().endsWith('.md'))}
                      onItemClick={handleGalleryItemClick}
                    />
                  )}
                </div>
              )
            )}
          </div>
        )) : selectedProject ? (
          // Selected Project Workflow View
          <div>
            <div className="mb-6">
              <button
                onClick={() => {
                  // Go back in history - just pop the last state instead of pushing
                  if (navStack.length > 0) {
                    const previousState = navStack[navStack.length - 1];
                    setNavStack(prev => prev.slice(0, -1));
                    window.scrollTo(0, 0);
                    setSelectedProject(previousState.project);
                    setSelectedStep(previousState.step);
                    setViewingNotesInline(previousState.viewingInline);
                    setViewingGalleryInline(previousState.viewingGalleryInline);
                    setCurrentFolderId(previousState.folderId);
                    setFolderPath(previousState.folderPath || []);
                  } else {
                    setSelectedProject(null);
                    setWorkflowSteps([]);
                  }
                }}
                className="mb-4 flex items-center text-sm text-[#2c3e50] hover:text-[#2c3e50]"
              >
                <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Clients
              </button>
              
              <div className="mb-4">
                <h2 className="text-xl font-bold text-[#2c3e50] font-[var(--font-playfair)]">{selectedProject.clientName}</h2>
                <p className="text-[#2c3e50]">Started {selectedProject.formattedDate}</p>
              </div>
            </div>

            {loadingSteps ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-rose-600 border-t-transparent"></div>
                <p className="mt-4 text-[#2c3e50]">Loading workflow...</p>
              </div>
            ) : stepsError ? (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="rounded-lg bg-red-50 p-3">
                  <h3 className="font-medium text-red-800">Error Loading Workflow</h3>
                  <p className="mt-1 text-sm text-red-600">{stepsError}</p>
                  <button
                    onClick={() => selectedProject && fetchWorkflowSteps(selectedProject.id)}
                    className="mt-3 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : workflowSteps.length === 0 && creatingWorkflow ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-rose-600 border-t-transparent"></div>
                <p className="mt-4 text-[#2c3e50]">Building project workflow...</p>
              </div>
            ) : workflowSteps.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-[#2c3e50]">No workflow yet</h3>
                <p className="mt-2 text-gray-500">Project folders will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-800">Project Workflow</h3>
                    <span className="text-sm text-[#2c3e50]">
                      {workflowSteps.filter(s => s.exists).length} of {workflowSteps.length} complete
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
                    <div 
                      className="h-full rounded-full bg-[#c5a059] transition-all duration-300"
                      style={{ 
                        width: `${(workflowSteps.filter(s => s.exists).length / workflowSteps.length) * 100}%` 
                      }}
                    />
                  </div>
                </div>

                {workflowSteps.map((step) => (
                  <div
                    key={step.id || step.stepNumber}
                    className={`rounded-lg border p-4 ${step.exists ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}
                  >
                    <div className="flex items-start">
                      <div className={`mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${step.exists ? 'bg-[#c5a059]/10 text-[#c5a059]' : 'bg-gray-100 text-[#2c3e50]'}`}>
                        {step.stepNumber || '?'}
                      </div>
                      <div 
                        className={`flex-1 ${step.exists ? 'cursor-pointer hover:opacity-80' : ''}`}
                        onClick={() => step.exists && openStepView(step)}
                      >
                        <h4 className="font-medium text-[#2c3e50]">{step.stepName}</h4>
                        <p className="text-sm text-[#2c3e50]">{step.stepDescription}</p>
                      </div>
                      {!step.exists && (
                        <div className="ml-2">
                          <button
                            onClick={() => createWorkflowFolder(step.stepNumber)}
                            className="rounded-lg bg-[#c5a059] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#b08e4d] font-[var(--font-lato)] transition-colors"
                          >
                            Create
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Default: Client Projects List
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#2c3e50]">Client Projects</h2>
              <p className="text-[#2c3e50]">Select a client to view their workflow</p>
            </div>

            {loading ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-rose-600 border-t-transparent"></div>
                <p className="mt-4 text-[#2c3e50]">Loading projects...</p>
              </div>
            ) : error ? (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="rounded-lg bg-red-50 p-3">
                  <h3 className="font-medium text-red-800">Error Loading Projects</h3>
                  <p className="mt-1 text-sm text-red-600">{error}</p>
                  <button
                    onClick={fetchProjects}
                    className="mt-3 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : displayedProjects.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-[#2c3e50]">No projects yet</h3>
                <p className="mt-2 text-gray-500">Add your first client to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleProjectSelect(project)}
                    className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left hover:border-rose-200 hover:bg-rose-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-[#2c3e50]">{project.clientName}</div>
                        <div className="text-sm text-[#2c3e50]">Started {project.formattedDate}</div>
                      </div>
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}

                {projects.length > 3 && !showAllProjects && (
                  <button
                    onClick={() => setShowAllProjects(true)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-[#2c3e50] hover:bg-gray-100"
                  >
                    View All {projects.length} Clients
                  </button>
                )}

                {showAllProjects && projects.length > 3 && (
                  <button
                    onClick={() => setShowAllProjects(false)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-[#2c3e50] hover:bg-gray-100"
                  >
                    Show Less
                  </button>
                )}
              </div>
            )}

            {/* Data source indicator */}
            {dataSource && (
              <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-[#2c3e50]">
                  Data source: 
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    dataSource.includes('google-apps-script') 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {dataSource === 'google-apps-script' ? 'Google Apps Script API' : 
                     dataSource === 'local-gog-fallback' ? 'Local GOG CLI' : dataSource}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Add Client Modal */}
        {showAddClientModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
              <div className="mb-4">
                <div className="text-xs font-normal text-[#2c3e50]/80 mb-1 font-[var(--font-lato)] tracking-wide">Sheila Gutierrez Designs</div>
                <h3 className="text-xl font-bold text-[#2c3e50] font-[var(--font-playfair)]">Add New Client</h3>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleAddClient(clientName);
              }}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[#2c3e50] mb-1">Client Name</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-[#2c3e50] focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none"
                    placeholder="e.g., John Smith"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddClientModal(false);
                      setClientName('');
                    }}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-[#2c3e50] hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#c5a059] px-6 py-2 font-medium text-white hover:bg-[#b08e4d] font-[var(--font-lato)] focus:outline-none focus:ring-2 focus:ring-[#c5a059] focus:ring-offset-2 transition-colors"
                  >
                    Create Client
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}



        {/* Notes Modal */}
        {showNotesModal && editingStep && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
              <div className="mb-4">
                <div className="text-xs font-normal text-[#2c3e50]/80 mb-1 font-[var(--font-lato)] tracking-wide">Sheila Gutierrez Designs</div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-[#2c3e50] font-[var(--font-playfair)]">{editingStep?.stepName} Notes</h3>
                    <p className="mt-1 text-sm text-[#2c3e50]">
                      {selectedProject?.clientName} • {editingStep.stepName}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNotesModal(false)}
                    className="ml-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-[#2c3e50]"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-[#2c3e50] mb-3">
                  Notes will be saved to <code className="rounded bg-gray-100 px-2 py-1 text-xs">notes_{editingStep?.stepName.toLowerCase().replace(/\s+/g, '_')}.txt</code> in the{' '}
                  <strong>{editingStep.stepName}</strong> folder for <strong>{selectedProject?.clientName}</strong>.
                </p>
                <div className="h-96">
                  <textarea
                    value={notesContent}
                    onChange={(e) => setNotesContent(e.target.value)}
                    className="h-full w-full rounded-lg border border-gray-300 p-4 font-mono text-sm text-[#2c3e50] focus:border-[#c5a059] focus:ring-1 focus:ring-[#c5a059] focus:outline-none"
                    placeholder={`Enter your notes for ${editingStep?.stepName} with ${selectedProject?.clientName}...

• Observations
• Client preferences
• Measurements
• Design direction discussed
• Budget considerations
• Timeline expectations
• Key requirements
• Special considerations
• Next steps`}
                    spellCheck="true"
                    autoFocus
                    autoComplete="new-password"
                    inputMode="text"
                    data-1p-ignore
                    autoCorrect="off"
                    autoCapitalize="off"
                    data-lpignore="true"
                    readOnly={isStepNotesTextareaReadonly}
                    onFocus={() => setIsStepNotesTextareaReadonly(false)}
                    role="textbox"
                    aria-multiline="true"
                    aria-label="Step notes editor"
                    id="step-notes-editor"
                    name="step-notes"
                  />
                  <div className="mt-2 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (speechRecognitionNotes) {
                          if (isListeningNotes) {
                            speechRecognitionNotes.stop();
                            setIsListeningNotes(false);
                          } else {
                            speechRecognitionNotes.start();
                            setIsListeningNotes(true);
                          }
                        } else {
                          alert('Speech recognition not supported in your browser');
                        }
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                        isListeningNotes 
                          ? 'bg-red-600 text-white' 
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      }`}
                      disabled={savingNotes}
                    >
                      {isListeningNotes ? (
                        <>
                          <svg className="h-4 w-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                          Listening...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                          Tap to Dictate
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (notesContent) {
                      await saveNotes();
                    }
                    setShowNotesModal(false);
                    setNotesContent('');
                  }}
                  className="rounded-lg bg-gray-100 px-6 py-2 text-[#2c3e50] hover:bg-gray-200"
                  disabled={savingNotes}
                >
                  Cancel
                </button>
                <button
                  onClick={saveNotes}
                  disabled={savingNotes}
                  className="rounded-lg bg-[#c5a059] px-6 py-2 font-medium text-white hover:bg-[#b08e4d] font-[var(--font-lato)] focus:outline-none focus:ring-2 focus:ring-[#c5a059] focus:ring-offset-2 transition-colors flex items-center gap-2"
                >
                  {savingNotes ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save Notes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* File Preview Modal */}
        {showPreviewModal && previewItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-4xl rounded-xl bg-white p-6 shadow-2xl">
              <div className="mb-4">
                <div className="text-xs font-normal text-[#2c3e50]/80 mb-1 font-[var(--font-lato)] tracking-wide">Sheila Gutierrez Designs</div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-[#2c3e50] font-[var(--font-playfair)] truncate">
                      {previewItem.name}
                    </h3>
                    <p className="mt-1 text-sm text-[#2c3e50]">
                      {selectedProject?.clientName} • {selectedStep?.stepName} • {previewItem.type}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={closePreview}
                      className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-[#2c3e50]"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mb-6 max-h-[80vh] overflow-auto rounded-lg border border-gray-200">
                {previewLoading ? (
                  <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#c5a059] border-t-transparent"></div>
                    <p className="ml-3 text-[#2c3e50]">Loading preview...</p>
                  </div>
                ) : previewError ? (
                  <div className="rounded-lg bg-red-50 p-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-red-800">Preview Unavailable</h3>
                    <p className="mt-2 text-red-600">{previewError}</p>

                  </div>
                ) : previewData?.success ? (
                  <div className="min-h-0 flex items-center justify-center">
                    {previewData.type === 'image' ? (
                      previewData.dataUrl ? (
                        <img
                          src={previewData.dataUrl}
                          alt={previewItem.name}
                          className="max-h-[65vh] max-w-full object-contain p-4"
                        />
                      ) : previewData.thumbnailUrl ? (
                        <img
                          src={previewData.thumbnailUrl}
                          alt={previewItem.name}
                          className="max-h-[65vh] max-w-full object-contain p-4"
                        />
                      ) : (
                        <div className="flex h-64 flex-col items-center justify-center p-8 text-center">
                          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
                            🖼️
                          </div>
                          <p className="text-[#2c3e50]">Image preview not available</p>

                        </div>
                      )
                    ) : previewData.type === 'markdown' ? (
                      <div className="h-full overflow-auto p-6">
                        {translating ? (
                          <div className="flex h-48 items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#c5a059] border-t-transparent"></div>
                            <p className="ml-3 text-[#2c3e50]">Translating to Spanish...</p>
                          </div>
                        ) : (
                          <>
                            <pre className="whitespace-pre-wrap font-mono text-sm text-[#2c3e50]">
                              {translatedContent && displayLanguage === 'es' ? translatedContent : previewData.content}
                            </pre>
                            {translatedContent && displayLanguage === 'es' && (
                              <div className="mt-6 rounded-lg bg-green-50 p-4 border border-green-200">
                                <p className="text-sm text-green-800 font-medium">
                                  <span className="inline-flex items-center gap-1">
                                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Translated to Spanish
                                  </span>
                                </p>
                                <p className="text-xs text-green-600 mt-1">Click "Speak (EN)" to switch back to English.</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : previewData.type === 'text' ? (
                      <div className="h-full overflow-auto p-4">
                        {translating ? (
                          <div className="flex h-48 items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#c5a059] border-t-transparent"></div>
                            <p className="ml-3 text-[#2c3e50]">Translating to Spanish...</p>
                          </div>
                        ) : (
                          <pre className="whitespace-pre-wrap font-mono text-sm text-[#2c3e50]">
                            {translatedContent && displayLanguage === 'es' ? translatedContent : previewData.content}
                          </pre>
                        )}
                        {translatedContent && displayLanguage === 'es' && (
                          <div className="mt-4 rounded-lg bg-green-50 p-4 border border-green-200">
                            <p className="text-sm text-green-800 font-medium">
                              <span className="inline-flex items-center gap-1">
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Translated to Spanish
                              </span>
                            </p>
                            <p className="text-xs text-green-600 mt-1">Click "Speak (EN)" to switch back to English.</p>
                          </div>
                        )}
                      </div>
                    ) : previewData.type === 'pdf' || previewData.type === 'google-doc' || 
                       previewData.type === 'google-sheet' || previewData.type === 'google-slide' ||
                       previewData.type === 'video' || previewData.type === 'audio' ? (
                      <div className={`${previewData.type === 'video' || previewData.type === 'audio' ? 'aspect-video w-full' : 'h-full w-full'}`}>
                        <iframe
                          src={previewData.embedUrl}
                          className="h-full w-full border-0"
                          title={`Preview of ${previewItem.name}`}
                        />
                      </div>
                    ) : (
                      <div className="flex h-64 flex-col items-center justify-center p-8 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
                          {previewItem.icon}
                        </div>
                        <h3 className="text-lg font-medium text-[#2c3e50]">Preview Not Available</h3>
                        <p className="mt-2 text-[#2c3e50]">
                          This file type ({previewItem.type}) cannot be previewed directly.
                        </p>

                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-64 flex-col items-center justify-center p-8 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
                      {previewItem.icon}
                    </div>
                    <h3 className="text-lg font-medium text-[#2c3e50]">Preview Not Available</h3>
                    <p className="mt-2 text-[#2c3e50]">
                      This file type ({previewItem.type}) cannot be previewed directly.
                    </p>

                  </div>
                )}
              </div>
              
              <div className="flex justify-between text-sm text-gray-500">
                <div>
                  {previewItem.modifiedTime && (
                    <span>Last modified: {new Date(previewItem.modifiedTime).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="flex gap-4">
                  {/* TTS buttons for markdown and text content */}
                  {(previewData?.type === 'markdown' || previewData?.type === 'text') && (
                    <>
                      <button
                        onClick={() => handleSpeakEnglish(previewData?.content)}
                        className={`rounded-lg px-4 py-2 font-medium font-[var(--font-lato)] transition-colors ${ttsSpeaking && ttsLanguage === 'en' ? 'bg-[#c5a059] text-white' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}
                      >
                        {ttsSpeaking && ttsLanguage === 'en' ? '⏸️ Stop' : '🔊 Speak (EN)'}
                      </button>
                      <button
                        onClick={() => handleSpeakSpanish(previewData?.content)}
                        className={`rounded-lg px-4 py-2 font-medium font-[var(--font-lato)] transition-colors ${ttsSpeaking && ttsLanguage === 'es' ? 'bg-[#c5a059] text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
                      >
                        {ttsSpeaking && ttsLanguage === 'es' ? '⏸️ Stop' : '🔊 Speak (ES)'}
                      </button>
                    </>
                  )}
                  <button
                    onClick={closePreview}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-[#2c3e50] hover:bg-gray-200"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && fileToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
              <div className="mb-6">
                <div className="flex items-center gap-3 text-red-600 mb-2">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.846-.833-2.614 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <h3 className="text-xl font-bold text-[#2c3e50] font-[var(--font-playfair)]">Move to Trash</h3>
                </div>
                <p className="text-[#2c3e50]">
                  Are you sure you want to move <strong className="text-red-600">"{fileToDelete.name}"</strong> to trash?
                </p>
                <div className="mt-4 rounded-lg bg-red-50 p-4">
                  <p className="text-sm text-red-800">
                    <strong>Note:</strong> This will move the file to trash. You can restore it from trash within 30 days.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={cancelDelete}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-[#2c3e50] hover:bg-gray-200 transition-colors"
                  disabled={deletingFileId === fileToDelete.id}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteFile}
                  className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  disabled={deletingFileId === fileToDelete.id}
                >
                  {deletingFileId === fileToDelete.id ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Moving to trash...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Move to Trash
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation - Sticky */}
      {/* Bottom Navigation - Context Aware */}
      {!selectedProject ? (
        // Main clients page - only Add Client
        <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-100 bg-white px-4 py-3 shadow-sm">
          <div className="flex justify-center">
            <button
              onClick={() => setShowAddClientModal(true)}
              className="flex flex-col items-center justify-center p-4 text-[#c5a059] hover:text-[#b08e4d] transition-colors"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="mt-1 text-xs font-medium">Add Client</span>
            </button>
          </div>
        </nav>
      ) : selectedStep ? (
        // In a step folder - only Upload
        <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-100 bg-white px-4 py-3 shadow-sm">
          <div className="flex justify-around">
            <button
              onClick={() => {
                if (uploading) return;
                triggerFileUpload();
              }}
              className="flex flex-col items-center justify-center p-4 text-[#c5a059] hover:text-[#b08e4d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={uploading}
            >
              {uploading ? (
                <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
              <span className="mt-1 text-xs font-medium">
                {uploading ? 'Uploading...' : 'Upload'}
              </span>
            </button>
            {systemNotesFile && (
              <button
                onClick={() => openNotesFile(systemNotesFile)}
                className="flex flex-col items-center justify-center p-4 text-[#c5a059] hover:text-[#b08e4d] transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="mt-1 text-xs font-medium">System</span>
              </button>
            )}
            {userNotesFile && (
              <button
                onClick={() => openNotesFile(userNotesFile)}
                className="flex flex-col items-center justify-center p-4 text-[#c5a059] hover:text-[#b08e4d] transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="mt-1 text-xs font-medium">User</span>
              </button>
            )}
            {activeIterationSpecFile && (
              <button
                onClick={() => openSpecFile(activeIterationSpecFile)}
                className="flex flex-col items-center justify-center p-4 text-[#c5a059] hover:text-[#b08e4d] transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <span className="mt-1 text-xs font-medium">Spec</span>
              </button>
            )}
          </div>
        </nav>
      ) : (
        // In workflow view (no step selected) - no bottom nav
        null
      )}

      {/* Full Screen Gallery Viewer */}
      {showGallery && galleryItems.length > 0 && (
        <FullScreenViewer
          items={galleryItems}
          initialIndex={currentGalleryIndex}
          isOpen={showGallery}
          onClose={() => setShowGallery(false)}
          onSaveNote={handleSaveNote}
          onSpeakEnglish={handleSpeakEnglish}
          onSpeakSpanish={handleSpeakSpanish}
          onStopSpeaking={stopSpeaking}
          ttsSpeaking={ttsSpeaking}
          ttsLanguage={ttsLanguage}
        />
      )}
    </div>
  );
}