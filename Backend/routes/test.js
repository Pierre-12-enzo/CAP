// routes/test.js - FIXED
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking font files from routes directory...\n');

// Get the actual Backend directory (go up one level from routes)
const backendDir = path.join(__dirname, '..');
const fontsDir = path.join(backendDir, 'fonts');

console.log('Backend directory:', backendDir);
console.log('Fonts directory:', fontsDir);

// List all files in fonts directory
if (fs.existsSync(fontsDir)) {
  console.log('Files in fonts directory:');
  const files = fs.readdirSync(fontsDir);
  files.forEach(file => {
    const filePath = path.join(fontsDir, file);
    const stats = fs.statSync(filePath);
    console.log(`  📄 ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
  });
} else {
  console.log('❌ Fonts directory does not exist!');
}

// Check specific font files
const fontFiles = ['Roboto-Regular.ttf', 'Roboto-Bold.ttf'];

console.log('\n🔍 Checking specific fonts:');
fontFiles.forEach(fontFile => {
  const fontPath = path.join(fontsDir, fontFile);
  
  if (fs.existsSync(fontPath)) {
    const stats = fs.statSync(fontPath);
    const fileSize = (stats.size / 1024).toFixed(2);
    
    console.log(`✅ ${fontFile}:`);
    console.log(`   Size: ${fileSize} KB`);
    console.log(`   Path: ${fontPath}`);
    
    // Read first bytes to check file type
    const buffer = fs.readFileSync(fontPath);
    const header = buffer.slice(0, 4).toString('hex');
    console.log(`   Header (hex): ${header}`);
    
    // Common font headers:
    // TTF: 00010000
    // OTF: 4F54544F ("OTTO")
    // WOFF: 774F4646 ("wOFF")
    // WOFF2: 774F4632 ("wOF2")
    
    if (header === '00010000') {
      console.log('   ✅ TrueType Font (TTF)');
    } else if (header === '4f54544f') {
      console.log('   ✅ OpenType Font (OTF)');
    } else if (header === '774f4646') {
      console.log('   ⚠️ WOFF file - needs conversion to TTF');
    } else if (header === '774f4632') {
      console.log('   ⚠️ WOFF2 file - needs conversion to TTF');
    } else {
      console.log(`   ❓ Unknown file type (header: ${header})`);
    }
  } else {
    console.log(`❌ ${fontFile} not found in ${fontsDir}`);
  }
  console.log('');
});