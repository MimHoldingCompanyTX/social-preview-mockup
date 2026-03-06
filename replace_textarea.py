#!/usr/bin/env python3
import sys

with open('app/components/FullScreenViewer.tsx', 'r') as f:
    lines = f.readlines()

# First textarea lines 636-642 (1-indexed)
# Convert to 0-indexed
start = 635  # line 636
end = 641    # line 642

new_textarea = '''                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full h-full p-6 font-mono text-sm text-[#2c3e50] bg-white resize-none focus:outline-none"
                      placeholder="Start typing or use the microphone button to add notes..."
                      rows={20}
                      autoComplete="off"
                      inputMode="text"
                      data-1p-ignore
                    />'''

# Replace lines
lines[start:end+1] = [new_textarea + '\n']

# Second textarea lines 661-667
start2 = 660  # line 661
end2 = 666    # line 667
lines[start2:end2+1] = [new_textarea + '\n']

with open('app/components/FullScreenViewer.tsx', 'w') as f:
    f.writelines(lines)
print("Replaced both textareas")