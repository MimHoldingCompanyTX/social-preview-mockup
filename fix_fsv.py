#!/usr/bin/env python3
import re

with open('client-portal/app/components/FullScreenViewer.tsx', 'r') as f:
    lines = f.readlines()

# Find start line of text block
start = None
for i, line in enumerate(lines):
    if 'previewData.type === \'text\' ?' in line:
        start = i
        break

if start is None:
    print("Could not find text block start")
    exit(1)

# Find end of text block (line with ') : isEmbeddable ?')
end = None
for i in range(start, len(lines)):
    if 'isEmbeddable ?' in lines[i]:
        end = i - 1  # line before isEmbeddable
        break

if end is None:
    print("Could not find end of text block")
    exit(1)

print(f"Replacing lines {start+1} to {end+1}")

# Construct correct block
correct_block = '''            ) : previewData.type === 'text' ? (
              isEditing ? (
                <div className="h-full w-full max-w-4xl overflow-hidden flex flex-col p-4">
                  <div className="flex-1 overflow-auto bg-white rounded-lg">
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full h-full p-6 font-mono text-sm text-[#2c3e50] bg-white resize-none focus:outline-none"
                      placeholder="Start typing or use the microphone button to add notes..."
                      rows={20}
                      autoComplete="off"
                      inputMode="text"
                      data-1p-ignore
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-400 text-center">
                    {editedContent.length} characters • {editedContent.split(/\\s+/).filter(Boolean).length} words
                  </div>
                </div>
              ) : (
                <div className="h-full w-full max-w-4xl overflow-auto p-8 bg-white rounded-lg">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-[#2c3e50]">
                    {translatedContent && displayLanguage === 'es' ? translatedContent : previewData.content}
                  </pre>
                </div>
              )
'''

# Replace
lines[start:end+1] = [correct_block]

with open('client-portal/app/components/FullScreenViewer.tsx', 'w') as f:
    f.writelines(lines)

print("Fixed FullScreenViewer.tsx")