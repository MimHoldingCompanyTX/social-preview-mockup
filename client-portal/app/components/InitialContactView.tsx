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

  // Cleanup on unmount
  useEffect(() => {
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
        const response = await fetch(`/api/project/initial-contact?folderId=${folderId}`);
        if (!response.ok) {
          throw new Error(`Failed to load initial contact data: ${response.status}`);
        }
        const data = await response.json();
        if (data.exists && data.data) {
          // Merge existing data with defaults
          const existing = data.data;
          const loadedData = {
            name: existing.name || '',
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
    console.log('handleSave called', { folderId, formData });
    if (!isMountedRef.current) return;
    
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    
    try {
      // Prepare data for API (remove phone formatting before saving)
      const dataToSave = {
        ...formData,
        phone: parsePhoneNumber(formData.phone)
      };
      console.log('Data to save:', dataToSave);
      
      const response = await fetch('/api/project/initial-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId,
          data: dataToSave,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
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
      setSaving(false);
    }
  }, [formData, folderId]);

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

  return (
    <div className="initial-contact-view bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header with save button */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#2c3e50] font-[var(--font-playfair)]">Initial Contact Information</h3>
            <p className="text-sm text-[#2c3e50] mt-1">Capture client details for this project.</p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-[#c5a059] text-white font-medium rounded-md hover:bg-[#b08e4d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#c5a059] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></span>
                Saving...
              </>
            ) : 'Save Contact Info'}
          </button>
        </div>
      </div>

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

        {/* Form note */}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Click <strong>Save Contact Info</strong> at the top to save changes to{' '}
            <code className="bg-gray-100 px-1 py-0.5 rounded">initial_contact.json</code>.
          </p>
        </div>
      </form>
    </div>
  );
}