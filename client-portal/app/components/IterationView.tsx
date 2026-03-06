"use client";

import { useState, useEffect } from 'react';

interface StepItem {
  id: string;
  name: string;
  mimeType: string;
  type: string;
  url: string;
  modifiedTime: string;
  thumbnailLink?: string;
  webContentLink?: string;
  size?: string;
  icon?: string;
}

interface IterationViewProps {
  items: StepItem[];
  stepName?: string;
  onSpecAvailable?: (specFile: any) => void; // Accepts StepItem or null
}

interface Iteration {
  id: string;
  name: string;
  number: number;
  items: StepItem[];
  loading: boolean;
  error?: string;
}

interface IterationContent {
  spec?: StepItem; // moodboard_X_spec.md
  image?: StepItem; // generated image
  error?: string; // error message if loading failed
}

export default function IterationView({ 
  items, 
  stepName = 'Moodboard',
  onSpecAvailable
}: IterationViewProps) {
  const [iterations, setIterations] = useState<Iteration[]>([]);
  const [activeIteration, setActiveIteration] = useState<number>(0);
  const [iterationContents, setIterationContents] = useState<Record<string, IterationContent>>({});
  const [loadingContents, setLoadingContents] = useState<Record<string, boolean>>({});

  // Filter iteration folders from items
  useEffect(() => {
    const iterationFolders = items.filter(item => 
      item.type === 'folder' && item.name.toLowerCase().includes('iteration')
    );
    
    const sortedIterations = iterationFolders
      .map(folder => {
        // Extract iteration number from name (e.g., "0_iteration" -> 0)
        const match = folder.name.match(/^(\d+)_iteration$/i);
        const number = match ? parseInt(match[1], 10) : 0;
        
        return {
          id: folder.id,
          name: folder.name,
          number,
          items: [],
          loading: false
        };
      })
      .sort((a, b) => a.number - b.number);
    
    setIterations(sortedIterations);
    
    // Set active iteration to first one if available
    if (sortedIterations.length > 0) {
      setActiveIteration(sortedIterations[0].number);
    }
  }, [items]);

  // Load contents for active iteration
  useEffect(() => {
    const activeIter = iterations.find(iter => iter.number === activeIteration);
    if (!activeIter || iterationContents[activeIter.id]) return;

    const loadIterationContents = async () => {
      setLoadingContents(prev => ({ ...prev, [activeIter.id]: true }));
      
      try {
        const response = await fetch(`/api/project/step?folderId=${activeIter.id}`);
        if (!response.ok) throw new Error('Failed to fetch iteration contents');
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to load iteration');
        
        const iterationItems: StepItem[] = data.items;
        
        // Categorize items (ignore README files)
        const spec = iterationItems.find(item => 
          item.name.toLowerCase().includes('spec') && 
          item.name.toLowerCase().endsWith('.md')
        );
        
        const image = iterationItems.find(item => 
          item.mimeType?.startsWith('image/')
        );
        
        setIterationContents(prev => ({
          ...prev,
          [activeIter.id]: { spec, image }
        }));
        
        // Notify parent about spec availability
        if (onSpecAvailable) {
          onSpecAvailable(spec || null);
        }
      } catch (error) {
        console.error('Error loading iteration contents:', error);
        setIterationContents(prev => ({
          ...prev,
          [activeIter.id]: { error: error instanceof Error ? error.message : 'Unknown error' }
        }));
        
        if (onSpecAvailable) {
          onSpecAvailable(null);
        }
      } finally {
        setLoadingContents(prev => ({ ...prev, [activeIter.id]: false }));
      }
    };

    loadIterationContents();
  }, [activeIteration, iterations, iterationContents, onSpecAvailable]);

  // Update parent when active iteration changes
  useEffect(() => {
    const activeIter = iterations.find(iter => iter.number === activeIteration);
    if (!activeIter || !onSpecAvailable) return;
    
    const content = iterationContents[activeIter.id];
    if (content) {
      onSpecAvailable(content.spec || null);
    }
  }, [activeIteration, iterations, iterationContents, onSpecAvailable]);

  if (iterations.length === 0) {
    return null; // No iteration folders found
  }

  const activeIter = iterations.find(iter => iter.number === activeIteration);
  const activeContent = activeIter ? iterationContents[activeIter.id] : null;
  const isLoading = activeIter && loadingContents[activeIter.id];

  return (
    <div className="iteration-view bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {stepName} Iterations
          </h3>
          <span className="text-sm text-gray-500">
            {iterations.length} iteration{iterations.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Iteration Tabs */}
      <div className="border-b border-gray-200 px-3">
        <div className="flex space-x-1 overflow-x-auto">
          {iterations.map(iter => (
            <button
              key={iter.id}
              onClick={() => setActiveIteration(iter.number)}
              className={`px-3 py-1.5 text-sm font-medium rounded-t-lg whitespace-nowrap ${
                activeIteration === iter.number
                  ? 'bg-white border-t border-l border-r border-gray-300 text-[#c5a059]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Iteration {iter.number}
            </button>
          ))}
        </div>
      </div>

      {/* Active Iteration Content - Focus on Image */}
      <div className="p-2 flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#c5a059] border-t-transparent"></div>
            <p className="ml-2 text-sm text-gray-600">Loading iteration...</p>
          </div>
        ) : activeContent ? (
          activeContent.error ? (
            <div className="flex-1 flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="text-red-800 font-medium mb-1">Error Loading Iteration</div>
              <p className="text-red-600 text-sm">{activeContent.error}</p>
              <button
                onClick={() => {
                  // Clear the error to allow retry
                  setIterationContents(prev => {
                    const newContents = { ...prev };
                    delete newContents[activeIter!.id];
                    return newContents;
                  });
                }}
                className="mt-2 rounded-lg bg-red-100 px-3 py-1 text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Main Image Display */}
              <div className="flex-1 flex flex-col bg-gray-50 rounded-lg border border-gray-200 p-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">
                    Generated Moodboard {activeIteration}
                  </h4>
                  {activeContent.image && (
                    <span className="text-xs text-gray-500">Image</span>
                  )}
                </div>
                
                <div className="flex-1 flex items-center justify-center bg-white rounded border overflow-hidden p-2">
                  {activeContent.image ? (
                    <img
                      src={`/api/project/file/thumbnail?fileId=${activeContent.image.id}&size=1000`}
                      alt={`Iteration ${activeIteration} moodboard`}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400 p-4">
                      <div className="text-4xl mb-2">🖼️</div>
                      <p className="text-sm font-medium mb-1">No moodboard image generated yet</p>
                      <p className="text-xs text-gray-500 text-center max-w-md">
                        This iteration doesn't have a generated moodboard image.
                        {activeContent.spec && ' The specification is ready in the Spec tab.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-600">Select an iteration to view contents</p>
          </div>
        )}
      </div>
    </div>
  );
}