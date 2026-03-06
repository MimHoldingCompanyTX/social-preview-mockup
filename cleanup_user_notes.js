#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const PARENT_FOLDER_ID = '1ZSxX5HIeY0wYc9qmOYHeKtc6GJcce2T6';

async function listFiles(parentId, path = '') {
  try {
    const { stdout } = await execAsync(
      `gog drive ls --parent "${parentId}" --json --max 500`,
      { encoding: 'utf-8' }
    );

    const { files } = JSON.parse(stdout);
    const results = [];

    for (const file of files) {
      const currentPath = path ? `${path}/${file.name}` : file.name;
      
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        // Recursively list subfolder
        const subfolderFiles = await listFiles(file.id, currentPath);
        results.push(...subfolderFiles);
      } else {
        results.push({
          id: file.id,
          name: file.name,
          modifiedTime: file.modifiedTime,
          path: currentPath,
          parentId: parentId
        });
      }
    }

    return results;
  } catch (error) {
    console.error(`Error listing files in ${parentId}:`, error.message);
    return [];
  }
}

async function cleanupUserNotes() {
  console.log('Starting cleanup of user notes.md files...\n');

  // List all files recursively
  const allFiles = await listFiles(PARENT_FOLDER_ID);
  console.log(`Found ${allFiles.length} total files\n`);

  // Find all user notes.md files
  const userNotesFiles = allFiles.filter(f => 
    f.name.toLowerCase() === 'user notes.md'
  );
  
  console.log(`Found ${userNotesFiles.length} user notes.md files\n`);

  if (userNotesFiles.length === 0) {
    console.log('No user notes.md files found. Nothing to clean up.');
    return;
  }

  // Group by parent folder
  const groups = {};
  for (const file of userNotesFiles) {
    // Extract folder name from path (e.g., "2026-03-05_Joe_Blow/Initial Contact" -> folder is "Initial Contact")
    const pathParts = file.path.split('/');
    const folderName = pathParts[pathParts.length - 1];
    
    if (!groups[folderName]) {
      groups[folderName] = [];
    }
    groups[folderName].push(file);
  }

  // Check for duplicates in each folder group
  let totalDeleted = 0;
  for (const [folderName, files] of Object.entries(groups)) {
    if (files.length > 1) {
      console.log(`\n⚠️  Found ${files.length} user notes.md files in folder "${folderName}":`);
      files.forEach(f => {
        const date = new Date(f.modifiedTime).toLocaleString('en-US', { 
          timeZone: 'America/Chicago',
          dateStyle: 'medium',
          timeStyle: 'short'
        });
        console.log(`   - ${f.path} (${date}) [ID: ${f.id}]`);
      });

      // Sort by modified time descending (newest first)
      files.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());

      // Keep the newest, delete the rest
      const newest = files[0];
      const toDelete = files.slice(1);

      console.log(`   → Keeping newest: ${newest.path}`);
      console.log(`   → Deleting ${toDelete.length} older file(s)...`);

      for (const file of toDelete) {
        try {
          const { stdout } = await execAsync(
            `gog drive delete "${file.id}"`,
            { encoding: 'utf-8' }
          );
          console.log(`      ✓ Deleted: ${file.path}`);
          totalDeleted++;
        } catch (error) {
          console.error(`      ✗ Failed to delete ${file.path}:`, error.message);
        }
      }
    }
  }

  console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} duplicate user notes.md file(s).`);
}

// Run cleanup
cleanupUserNotes().catch(console.error);
