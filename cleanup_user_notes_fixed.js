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
          parentId: parentId,
          folderName: path.split('/').pop() || ''
        });
      }
    }

    return results;
  } catch (error) {
    console.error(`Error listing files in ${parentId}:`, error.message);
    return [];
  }
}

async function cleanupUserNotes(dryRun = true) {
  console.log('Starting cleanup of user notes.md files...\n');
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No files will be deleted\n');
  }

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

  // Group by parent folder ID (correct grouping)
  const groups = {};
  for (const file of userNotesFiles) {
    if (!groups[file.parentId]) {
      groups[file.parentId] = [];
    }
    groups[file.parentId].push(file);
  }

  // Check for duplicates in each folder group
  let totalToDelete = 0;
  for (const [parentId, files] of Object.entries(groups)) {
    if (files.length > 1) {
      const folderName = files[0].folderName || `Folder ID: ${parentId}`;
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

      console.log(`   → Would keep newest: ${newest.path}`);
      console.log(`   → Would delete ${toDelete.length} older file(s)...`);

      if (!dryRun) {
        for (const file of toDelete) {
          try {
            const { stdout } = await execAsync(
              `gog drive delete "${file.id}"`,
              { encoding: 'utf-8' }
            );
            console.log(`      ✓ Deleted: ${file.path}`);
            totalToDelete++;
          } catch (error) {
            console.error(`      ✗ Failed to delete ${file.path}:`, error.message);
          }
        }
      } else {
        totalToDelete += toDelete.length;
        toDelete.forEach(f => {
          console.log(`      [DRY RUN] Would delete: ${f.path}`);
        });
      }
    }
  }

  if (dryRun) {
    console.log(`\n✅ Dry run complete! Found ${totalToDelete} duplicate user notes.md file(s) that would be deleted.`);
    console.log('To actually delete, run: node cleanup_user_notes_fixed.js --delete');
  } else {
    console.log(`\n✅ Cleanup complete! Deleted ${totalToDelete} duplicate user notes.md file(s).`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--delete');

// Run cleanup
cleanupUserNotes(dryRun).catch(console.error);