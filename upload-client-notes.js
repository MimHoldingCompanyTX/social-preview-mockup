const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const SERVICE_ACCOUNT_KEY_PATH = '/Users/clawdallen/Desktop/GoogleServiceAccount/googleServiceAcct.json';
const FOLDER_ID = '1W9TG1y4fFY8ATbw34tKFPTfucDJFIX_a';
const TEMP_DIR = '/tmp/tom_sherry_processing';

async function setup() {
  try {
    // Create temp directory
    await execAsync(`mkdir -p ${TEMP_DIR}`);
    
    // Check if images exist, download if not
    const images = ['IMG_4634.jpg', 'IMG_4635.jpg', 'IMG_4636.jpg', 'IMG_4637.jpg', 'IMG_4638.jpg', 'IMG_4640.jpg'];
    for (const img of images) {
      const imgPath = path.join(TEMP_DIR, img);
      if (!fs.existsSync(imgPath)) {
        console.log(`Downloading ${img}...`);
        const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_KEY_PATH, 'utf8'));
        const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] });
        const drive = google.drive({ version: 'v3', auth });
        
        // Find the file ID
        const response = await drive.files.list({
          q: `name = '${img}' and '${FOLDER_ID}' in parents and trashed = false`,
          fields: 'files(id)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });
        
        if (response.data.files.length > 0) {
          const fileId = response.data.files[0].id;
          const fileResponse = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
          const writeStream = fs.createWriteStream(imgPath);
          await new Promise((resolve, reject) => {
            fileResponse.data.pipe(writeStream).on('finish', resolve).on('error', reject);
          });
          console.log(`  Downloaded ${img}`);
        }
      }
    }
    
    console.log('All images ready.');
  } catch (error) {
    console.error('Setup error:', error.message);
    process.exit(1);
  }
}

async function processImages() {
  try {
    const images = ['IMG_4634.jpg', 'IMG_4635.jpg', 'IMG_4636.jpg', 'IMG_4637.jpg', 'IMG_4638.jpg', 'IMG_4640.jpg'];
    const observations = [];
    
    for (const img of images) {
      const imgPath = path.join(TEMP_DIR, img);
      console.log(`Processing ${img}...`);
      
      const prompt = `You are an expert interior designer conducting a detailed site visit. Describe EVERYTHING visible in this photo with exhaustive specificity. Cover every category below:

ROOM TYPE: What room or space does this appear to be? Base this only on visible evidence.
LAYOUT & SPATIAL FLOW: How is the space organized? Where are entry points, traffic paths, and furniture groupings relative to each other? Note any cramped areas or wasted space.
WALLS: Exact color description, material, condition, trim color, any accent walls.
FLOORING: Material, color/pattern, condition, grout color if tile.
CEILING: Estimated height, color, features (beams, fans, recessed lighting, crown molding).
FURNITURE: Every piece visible — type, style, material, color, condition, approximate size.
FIXTURES & FITTINGS: Sinks, toilets, tubs, vanities, mirrors, towel bars, built-ins, fireplace details, TV mounts, etc.
LIGHTING: Every light source — natural and artificial. Note fixture style, finish, and any dark zones.
TEXTILES: Curtains/drapes, rugs, towels, throw pillows, blankets, upholstery fabrics.
DECOR & ART: Wall art, plants, books, decorative objects, personal items.
STORAGE: Visible storage solutions — cabinets, shelves, closets, baskets, bins.
CONDITION & WEAR: Any damage, dated elements, water stains, peeling paint, worn carpet, outdated fixtures.
ESTIMATED DIMENSIONS: Rough room size based on scale of visible furniture and fixtures.

Be brutally specific about colors — use descriptive names like "warm honey oak" not just "brown". Only describe what is literally, unambiguously visible. No assumptions or fabrications. Missing information is better than invented information. If you cannot see something clearly, do NOT include it in your description.`;
      
      try {
        // Save prompt to file
        const promptPath = path.join(TEMP_DIR, 'prompt.txt');
        fs.writeFileSync(promptPath, prompt);
        
        // Run Ollama
        const { stdout } = await execAsync(`echo '${prompt.replace(/'/g, "'\\''")}' | ollama run llava-llama3:latest '${imgPath}' 2>&1 | head -200`, {
          cwd: TEMP_DIR,
          timeout: 120000,
        });
        
        observations.push(`=== ${img} ===\n${stdout}`);
        console.log(`  Completed ${img}`);
      } catch (err) {
        console.error(`  Error processing ${img}:`, err.message);
        observations.push(`=== ${img} ===\n[Failed to process: ${err.message}]`);
      }
    }
    
    return observations.join('\n\n');
  } catch (error) {
    console.error('Processing error:', error.message);
    process.exit(1);
  }
}

async function generateNotes(observations) {
  try {
    const synthesisPrompt = `You are an interior designer who just completed an initial visit to a client's home. You took 6 photos of one room. Here are your raw observations from each photo:

${observations}

Now write polished, professional client visit notes. Synthesize ALL observations into unified paragraphs — do NOT list per-photo. Write as one designer describing one room in your own voice.

Follow this EXACT format and fill EVERY section with rich, specific detail:

# Client Visit Notes — Tom and Sherry Bedroom, Initial Visit
**Date:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
**Designer:** Designer

## Room: [identify the room type from observations]

## Dimensions
Estimate the room size from what you observed. Include width, length, and ceiling height estimates. Clearly label as "estimated."

## Observations

Write these as cohesive narrative paragraphs, NOT bullet lists.

### Layout & Flow
How the room is organized. Entry points, traffic flow, furniture groupings, spatial relationships.

### Surfaces
Walls (color, material, condition), flooring (type, color, pattern, condition), ceiling (height, color).

### Fixtures & Features
Every fixture and furniture piece as a unified inventory.

### Lighting
Every light source — natural and artificial.

### Textiles & Decor
Curtains, rugs, throw pillows, blankets, wall art, plants.

## Pain Points
List 3-5 specific, observable issues.

## Designer's Initial Impressions
Write in first person. Include what works well (min 3), what needs attention (min 3), key design opportunities (min 2).

## Mood Board Direction
3-5 specific design vibes.

## Color Palette
4-6 colors drawn DIRECTLY from observable elements. Format: #HEXCODE Descriptive Name

## Next Steps
5-7 specific, actionable items prioritized by impact.

CRITICAL RULES:
- Every statement must originate from the photo observations. If not seen, do not write it.
- No interpolation: Do not invent hybrid features by merging details from different photos.
- Avoid uncertainty markers: Eliminate phrases like "likely," "probably," "seems to have."
- Sound like a human designer, not an AI generating a report.
- Minimum 1500 words.`;
    
    console.log('Running synthesis with llama3.2:3b...');
    
    // Save prompt to file
    const promptPath = path.join(TEMP_DIR, 'synthesis_prompt.txt');
    fs.writeFileSync(promptPath, synthesisPrompt);
    
    // Run Ollama with the prompt
    const { stdout } = await execAsync(`echo '${synthesisPrompt.replace(/'/g, "'\\''")}' | ollama run llama3.2:3b 2>&1 | head -2000`, {
      cwd: TEMP_DIR,
      timeout: 180000,
    });
    
    return stdout;
  } catch (error) {
    console.error('Synthesis error:', error.message);
    process.exit(1);
  }
}

async function saveAndUpload(markdown) {
  try {
    // Save file
    const outputPath = path.join(TEMP_DIR, 'client_notes_ver_3.md');
    fs.writeFileSync(outputPath, markdown);
    console.log(`Saved: ${outputPath}`);
    
    // Check file size
    const stats = fs.statSync(outputPath);
    console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
    
    // Upload to Google Drive
    const credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_KEY_PATH, 'utf8'));
    const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] });
    const drive = google.drive({ version: 'v3', auth });
    
    console.log('Uploading to Google Drive...');
    
    const fileMetadata = {
      name: 'client_notes_ver_3.md',
      parents: [FOLDER_ID],
      mimeType: 'text/markdown',
    };
    
    const media = {
      mimeType: 'text/markdown',
      body: fs.createReadStream(outputPath),
    };
    
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, mimeType',
      supportsAllDrives: true,
    });
    
    const file = response.data;
    console.log('Upload successful!');
    console.log(`File ID: ${file.id}`);
    console.log(`File Name: ${file.name}`);
    console.log(`View URL: ${file.webViewLink}`);
    
    return file;
  } catch (error) {
    console.error('Upload error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

async function cleanup() {
  try {
    await execAsync(`rm -rf ${TEMP_DIR}`);
    console.log('Cleanup complete.');
  } catch (error) {
    console.error('Cleanup error:', error.message);
  }
}

async function main() {
  console.log('=== Tom and Sherry Bedroom Initial Visit Processing ===\n');
  
  console.log('1. Setting up temp directory and downloading images...');
  await setup();
  
  console.log('\n2. Processing images with Ollama...');
  const observations = await processImages();
  
  console.log('\n3. Generating synthesis...');
  const markdown = await generateNotes(observations);
  
  console.log('\n4. Saving and uploading...');
  const file = await saveAndUpload(markdown);
  
  console.log('\n5. Cleaning up...');
  await cleanup();
  
  console.log('\n=== COMPLETE ===');
  console.log(`File: ${file.name}`);
  console.log(`ID: ${file.id}`);
  console.log(`URL: ${file.webViewLink}`);
}

main().catch(console.error);