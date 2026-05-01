import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../public/data');
const outputDir = path.resolve(__dirname, '../src/data');
const outputFile = path.join(outputDir, 'novelsIndex.json');

// Ensure output dir exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Auto-generate toc.json from chapters/ directory if it doesn't exist.
 * Reads each chapter JSON, extracts the title, and writes toc.json.
 */
function generateTocIfMissing(folderPath) {
  const tocPath = path.join(folderPath, 'toc.json');
  const chaptersDir = path.join(folderPath, 'chapters');

  if (fs.existsSync(tocPath)) return; // already exists
  if (!fs.existsSync(chaptersDir)) return; // no chapters folder

  try {
    const chapterFiles = fs.readdirSync(chaptersDir)
      .filter(f => f.startsWith('chapter') && f.endsWith('.json'))
      .sort((a, b) => {
        const numA = parseInt(a.replace('chapter', '').replace('.json', ''), 10);
        const numB = parseInt(b.replace('chapter', '').replace('.json', ''), 10);
        return numA - numB;
      });

    const titles = [];
    for (const file of chapterFiles) {
      try {
        const raw = fs.readFileSync(path.join(chaptersDir, file), 'utf8');
        const data = JSON.parse(raw);
        titles.push(data.title || file.replace('.json', ''));
      } catch {
        titles.push(file.replace('.json', ''));
      }
    }

    fs.writeFileSync(tocPath, JSON.stringify(titles, null, 2), 'utf8');
    console.log(`  → Auto-generated toc.json (${titles.length} chapters) for ${path.basename(folderPath)}`);
  } catch (err) {
    console.error(`  → Failed to generate toc.json for ${path.basename(folderPath)}:`, err.message);
  }
}

function generateIndex() {
  const novels = [];

  try {
    const folders = fs.readdirSync(dataDir);
    
    for (const folderName of folders) {
      const folderPath = path.join(dataDir, folderName);
      
      if (fs.statSync(folderPath).isDirectory()) {
        const statusPath = path.join(folderPath, 'status.json');
        
        if (fs.existsSync(statusPath)) {
          // Auto-generate toc.json if missing
          generateTocIfMissing(folderPath);

          const statusRaw = fs.readFileSync(statusPath, 'utf8');
          try {
            const status = JSON.parse(statusRaw);
            
            // Find cover image
            let coverImage = '';
            const files = fs.readdirSync(folderPath);
            const imageExts = ['.png', '.jpg', '.jpeg', '.webp'];
            for (const file of files) {
              const ext = path.extname(file).toLowerCase();
              if (imageExts.includes(ext)) {
                coverImage = `/data/${encodeURIComponent(folderName)}/${encodeURIComponent(file)}`;
                break;
              }
            }

            novels.push({
              id: status.book_id || folderName, // Use book_id as primary ID
              title: status.book_name,
              author: status.author,
              status: status.status === 'finished' ? 'Hoàn thành' : 'Đang ra',
              tags: status.tags || [],
              intro: status.description || '',
              cover: coverImage,
              word_count: status.word_count,
              chapter_count: status.chapter_count,
              update_time: status.update_time,
              folder: folderName
            });
            
          } catch (e) {
            console.error(`Error parsing JSON for ${folderName}:`, e.message);
          }
        }
      }
    }

    // Sort by update_time descending (newest first)
    novels.sort((a, b) => {
      if (!a.update_time && !b.update_time) return 0;
      if (!a.update_time) return 1;
      if (!b.update_time) return -1;
      return b.update_time.localeCompare(a.update_time);
    });

    fs.writeFileSync(outputFile, JSON.stringify(novels, null, 2), 'utf8');
    console.log(`Generated index with ${novels.length} novels at ${outputFile}`);
  } catch (error) {
    console.error('Error generating index:', error);
  }
}

generateIndex();
