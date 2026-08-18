const fs = require('fs');
const path = require('path');
const prettier = require('prettier');

// Target folders to format
const TARGET_FOLDERS = ['frontend', 'extensions'];

// Supported file extensions
const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.md'];

// Folders to safely ignore
const IGNORED_FOLDERS = ['node_modules', 'dist', 'build', '.git', '.tmp'];

/**
 * Recursively scans a directory for files matching the allowed extensions.
 * Ignores specified folders to speed up the process and avoid modifying build artifacts.
 * 
 * @param {string} dir - Directory to scan
 * @param {string[]} fileList - Accumulator array for file paths
 * @returns {string[]} Array of file paths
 */
function getFilesToFormat(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORED_FOLDERS.includes(file)) {
        getFilesToFormat(fullPath, fileList);
      }
    } else {
      if (EXTENSIONS.includes(path.extname(fullPath))) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

/**
 * Main execution function.
 * Checks each file to see if it's already formatted.
 * Skips formatted files to save IO operations, and formats the rest.
 */
async function runFormatter() {
  console.log('Starting Prettier formatting process...');
  
  const files = [];
  for (const folder of TARGET_FOLDERS) {
    const folderPath = path.join(__dirname, '..', folder);
    getFilesToFormat(folderPath, files);
  }

  console.log(`Found ${files.length} valid files to check.`);
  
  let formattedCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    try {
      const source = fs.readFileSync(file, 'utf8');
      
      // Resolve prettier config specific to the file's location
      const options = await prettier.resolveConfig(file) || {};
      options.filepath = file;

      // Check if the file already conforms to Prettier rules
      const isFormatted = await prettier.check(source, options);
      
      if (!isFormatted) {
        // File is not formatted, so we format and overwrite it
        console.log(`Formatting: ${path.relative(path.join(__dirname, '..'), file)}`);
        const formatted = await prettier.format(source, options);
        fs.writeFileSync(file, formatted, 'utf8');
        formattedCount++;
      } else {
        // File is already perfectly formatted, omit it
        skippedCount++;
      }
    } catch (error) {
      console.error(`Error formatting ${file}:`, error.message);
    }
  }

  console.log('----------------------------------------');
  console.log('Formatting completely finished!');
  console.log(`Formatted files: ${formattedCount}`);
  console.log(`Skipped (already formatted): ${skippedCount}`);
}

runFormatter();
