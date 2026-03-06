"use client";

import { useState, useEffect, useCallback } from 'react';

interface GalleryItem {
  id: string;
  name: string;
  mimeType: string;
  type: string;
  url: string;
  modifiedTime: string;
  thumbnailLink?: string;
  webContentLink?: string;
  metadata?: any;
}

interface GalleryViewProps {
  items: GalleryItem[];
  onItemClick: (item: GalleryItem, index: number) => void;
}

export default function GalleryView({ 
  items, 
  onItemClick
}: GalleryViewProps) {
  const getThumbnailUrl = (item: any) => {
    // For images, use our proxy API
    if (item.mimeType?.startsWith('image/') && item.id) {
      return `/api/project/file/thumbnail?fileId=${item.id}&size=400`;
    }
    
    // No thumbnail available
    return null;
  };

  const getIcon = (item: GalleryItem) => {
    if (item.mimeType?.startsWith('image/')) return '🖼️';
    if (item.mimeType?.includes('video')) return '🎬';
    if (item.mimeType === 'application/pdf') return '📄';
    if (item.mimeType?.includes('document')) return '📝';
    if (item.mimeType?.includes('spreadsheet')) return '📊';
    if (item.mimeType?.includes('presentation')) return '📽️';
    if (item.type === 'folder') return '📁';
    return '📎';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getFriendlyFileName = (fileName: string): string => {
    if (!fileName) return '';
    
    // Remove file extension
    let name = fileName.replace(/\.[^/.]+$/, '');
    
    // Replace underscores and dashes with spaces
    name = name.replace(/[_-]/g, ' ');
    
    // Handle known patterns
    if (name.toLowerCase().includes('user notes')) {
      return 'User Notes';
    }
    if (name.toLowerCase().includes('system notes')) {
      return 'System Notes';
    }
    if (name.toLowerCase().includes('initial contact')) {
      return 'Initial Contact';
    }
    if (name.toLowerCase().includes('moodboard') && name.toLowerCase().includes('spec')) {
      const match = name.match(/moodboard\s*(\d+)/i);
      if (match && match[1]) {
        return `Iteration ${match[1]} Spec`;
      }
      return 'Iteration Spec';
    }
    if (name.toLowerCase().includes('moodboard')) {
      const match = name.match(/moodboard\s*(\d+)/i);
      if (match && match[1]) {
        return `Iteration ${match[1]}`;
      }
      return 'Moodboard';
    }
    
    // Capitalize first letter of each word
    name = name.split(' ').map(word => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
    
    return name;
  };

  return (
    <div className="gallery-view">
      {/* Thumbnail grid - iPhone Photos style */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
        {items.map((item, index) => {
          const thumbnailUrl = getThumbnailUrl(item);
          
          return (
            <div
              key={item.id}
              className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity cursor-pointer group flex items-center justify-center"
              onClick={() => onItemClick(item, index)}
            >
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={item.name}
                  className="max-w-full max-h-full object-contain"
                  loading="lazy"
                  onError={(e) => {
                    // Fallback to icon if image fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                  <div className="text-3xl mb-2">{getIcon(item)}</div>
                  <div className="text-xs text-center text-[#2c3e50] truncate w-full px-1">
                    {getFriendlyFileName(item.name)}
                  </div>
                </div>
              )}
              
              {/* File type badge */}
              <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                {item.mimeType?.split('/').pop()?.toUpperCase() || item.type}
              </div>
              
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </div>
          );
        })}
      </div>
    </div>
  );
}