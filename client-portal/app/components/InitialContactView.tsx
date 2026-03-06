"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

interface InitialContactData {
  name: string;
  address: string[]; // up to 3 lines
  email: string;
  phone: string;
  narrative: string;
}

interface InitialContactViewProps {
  folderId: string;
  clientName?: string;
}

// Phone formatting utilities for US numbers
function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters
  const cleaned = value.replace(/\D/g, '');
  
  // Limit to 10 digits (US format)
  const limited = cleaned.slice(0, 10);
  
  // Format based on length
  if (limited.length === 0) return '';
  if (limited.length <= 3) return `(${limited}`;
  if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  
  return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6, 10)}`;
}

function parsePhoneNumber(formatted: string): string {
  // Remove formatting to get raw digits
  return formatted.replace(/\D/g, '');
}

export default function InitialContactView({ folderId, clientName }: InitialContactViewProps) {
  console.log('InitialContactView rendered with folderId:', folderId, 'clientName:', clientName);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [formData, setFormData] = useState<InitialContactData>({
    name: '',
    address: ['', '', ''],
    email: '',
    phone: '',
    narrative: '',
  });

  const isMountedRef = useRef(true);

  // Set mounted ref and cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load existing data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('Fetching initial contact data for folderId:', folderId);
        const response = await fetch(`/api/project/initial-contact?folderId=${folderId}`);
        console.log('Response status:', response.status);
        if (!response.ok) {
          throw new Error(`Failed to load initial contact data: ${response.status}`);
        }
        const data = await response.json();
        if (data.exists && data.data) {
          // Merge existing data with defaults
          const existing = data.data;
          const loadedData = {
            name: existing.name || clientName || '', // Prioritize existing, then clientName prop, then empty string
            address: Array.isArray(existing.address) ? 
              [...existing.address, '', '', ''].slice(0, 3) : 
              ['', '', ''],
            email: existing.email || '',
            phone: existing.phone || '',
            narrative: existing.narrative || '',
          };
          // Format phone if it's unformatted digits
          if (loadedData.phone && /^\d{10}$/.test(loadedData.phone)) {
            loadedData.phone = formatPhoneNumber(loadedData.phone);
          }
          console.log('Loaded existing data:', loadedData);
          setFormData(loadedData);
        } else {
          // No existing data, set client name if provided
          const defaultData = {
            name: clientName || '',
            address: ['', '', ''],
            email: '',
            phone: '',
            narrative: '',
          };
          console.log('No existing data, setting defaults:', defaultData);
          setFormData(defaultData);
        }
      } catch (err) {
        console.error('Error loading initial contact data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    if (folderId) {
      loadData();
    }
  }, [folderId, clientName]);

  const handleSave = useCallback(async () => {
    console.log('handleSave called', { folderId, formData, isMounted: isMountedRef.current });
    console.log('isMountedRef.current value:', isMountedRef.current);
    
    if (!isMountedRef.current) {
      console.warn('Component not mounted, aborting save - this is likely a timing issue');
      return;
    }
    
    console.log('Component is mounted, proceeding with save...');
    // Notify header that saving has started
    console.log('Dispatching saving-state event: saving=true');
    window.dispatchEvent(new CustomEvent('initial-contact-saving-state', { detail: { saving: true } }));
    
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    
    try {
      console.log('Entering try block');
      // Prepare data for API (remove phone formatting before saving)
      const dataToSave = {
        ...formData,
        phone: parsePhoneNumber(formData.phone)
      };
      console.log('Data to save:', dataToSave);
      
      console.log('Sending POST to /api/project/initial-contact with folderId:', folderId);
      const response = await fetch('/api/project/initial-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId,
          data: dataToSave,
        }),
      });
      
      const responseText = await response.text();
      console.log('Response status:', response.status, 'Response text:', responseText);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { error: responseText || 'Unknown error' };
        }
        throw new Error(errorData.error || `Failed to save: ${response.status}`);
      }
      
      console.log('POST request successful');
      setSaveSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        if (isMountedRef.current) {
          setSaveSuccess(false);
        }
      }, 3000);
    } catch (err) {
      console.error('Error saving initial contact data:', err);
      setError(err instanceof Error ? err.message : 'Failed to save data');
    } finally {
      console.log('Save operation completed, setting saving=false');
      setSaving(false);
      // Notify header that saving has finished
      window.dispatchEvent(new CustomEvent('initial-contact-saving-state', { detail: { saving: false } }));
    }
  }, [formData, folderId]);

  // Listen for save click events from the header button
  useEffect(() => {
    console.log('InitialContactView: Setting up save click listener');
    const handleSaveClick = () => {
      console.log('InitialContactView: Save click event received');
      handleSave();
    };
    
    window.addEventListener('initial-contact-save-click', handleSaveClick as EventListener);
    
    return () => {
      console.log('InitialContactView: Removing save click listener');
      window.removeEventListener('initial-contact-save-click', handleSaveClick as EventListener);
    };
  }, [handleSave]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };

  const handleInputChange = (field: keyof InitialContactData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressLineChange = (index: number, value: string) => {
    const newAddress = [...formData.address];
    newAddress[index] = value;
    setFormData(prev => ({ ...prev, address: newAddress }));
  };

  // Special handler for phone input with formatting
  const handlePhoneChange = (value: string) => {
    // Allow backspace to delete formatting characters
    const formatted = formatPhoneNumber(value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#c5a059] border-t-transparent"></div>
        <p className="mt-4 text-[#2c3e50]">Loading contact information...</p>
      </div>
    );
  }
  console.log('InitialContactView loaded, folderId:', folderId, 'formData:', formData);

  return (
    <div className="initial-contact-view bg-white rounded-lg border border-gray-200 shadow-sm overflow-auto">
      

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-1 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {saveSuccess && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Saved</h3>
                <div className="mt-1 text-sm text-green-700">Contact information saved successfully.</div>
              </div>
            </div>
          </div>
        )}

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-[#2c3e50] mb-1">
            Client Name *
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#c5a059] focus:border-transparent text-[#2c3e50] bg-white"
            placeholder="Full name"
          />
        </div>

        {/* Address (3 lines) */}
        <div>
          <label className="block text-sm font-medium text-[#2c3e50] mb-1">
            Address (up to 3 lines)
          </label>
          <div className="space-y-2">
            {[0, 1, 2].map((index) => (
              <input
                key={index}
                type="text"
                value={formData.address[index] || ''}
                onChange={(e) => handleAddressLineChange(index, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#c5a059] focus:border-transparent text-[#2c3e50] bg-white"
                placeholder={`Address line ${index + 1}${index === 0 ? ' (optional)' : ''}`}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">Street, City, State, ZIP, etc.</p>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[#2c3e50] mb-1">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#c5a059] focus:border-transparent text-[#2c3e50] bg-white"
            placeholder="client@example.com"
          />
        </div>

        {/* Phone with US formatting */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-[#2c3e50] mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#c5a059] focus:border-transparent text-[#2c3e50] bg-white"
            placeholder="(123) 456-7890"
            maxLength={14} // (123) 456-7890 is 14 chars
          />
          <p className="mt-1 text-xs text-gray-500">Enter 10-digit US phone number. Formatting applied automatically.</p>
        </div>

        {/* Narrative */}
        <div>
          <label htmlFor="narrative" className="block text-sm font-medium text-[#2c3e50] mb-1">
            Initial Contact Narrative
          </label>
          <textarea
            id="narrative"
            rows={5}
            value={formData.narrative}
            onChange={(e) => handleInputChange('narrative', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-[#c5a059] focus:border-transparent text-[#2c3e50] bg-white"
            placeholder="Notes about how the client found you, initial conversation, project scope, etc."
          />
        </div>

        
      </form>
    </div>
  );
}