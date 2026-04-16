// routes/simple-font-test.js
const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

console.log('🎨 Simple Canvas Font Test\n');

// 1. First test without registering fonts
console.log('1. Testing WITHOUT font registration:');
const canvas1 = createCanvas(800, 200);
const ctx1 = canvas1.getContext('2d');

ctx1.fillStyle = '#ffffff';
ctx1.fillRect(0, 0, 800, 200);

ctx1.fillStyle = '#000000';
ctx1.font = 'bold 30px Roboto';
ctx1.fillText('Test without font registration', 20, 50);

console.log('   Font used:', ctx1.font);

// Save image
const buffer1 = canvas1.toBuffer('image/png');
fs.writeFileSync('test-without-fonts.png', buffer1);
console.log('   Saved: test-without-fonts.png\n');

// 2. Now test WITH font registration
console.log('2. Testing WITH font registration:');

// Get font paths
const fontsDir = path.join(__dirname, '..', 'fonts');
const regularPath = path.join(fontsDir, 'Roboto-Regular.ttf');
const boldPath = path.join(fontsDir, 'Roboto-Bold.ttf');

console.log('   Regular path:', regularPath);
console.log('   Exists:', fs.existsSync(regularPath));
console.log('   Bold path:', boldPath);
console.log('   Exists:', fs.existsSync(boldPath));

try {
  // Register fonts
  registerFont(regularPath, { family: 'Roboto', weight: 'normal' });
  registerFont(boldPath, { family: 'Roboto', weight: 'bold' });
  console.log('   ✅ Fonts registered\n');
  
  // Create new canvas with registered fonts
  const canvas2 = createCanvas(800, 300);
  const ctx2 = canvas2.getContext('2d');
  
  ctx2.fillStyle = '#ffffff';
  ctx2.fillRect(0, 0, 800, 300);
  
  // Test Roboto Bold
  ctx2.fillStyle = '#000000';
  ctx2.font = 'bold 30px Roboto';
  console.log('   Font set to: "bold 30px Roboto"');
  console.log('   Actual font:', ctx2.font);
  ctx2.fillText('Roboto Bold - 30px', 20, 50);
  
  // Test Roboto Regular
  ctx2.font = '30px Roboto';
  console.log('   Font set to: "30px Roboto"');
  console.log('   Actual font:', ctx2.font);
  ctx2.fillText('Roboto Regular - 30px', 20, 100);
  
  // Test different sizes
  ctx2.font = 'bold 40px Roboto';
  ctx2.fillText('Roboto Bold - 40px', 20, 160);
  
  ctx2.font = '20px Roboto';
  ctx2.fillText('Roboto Regular - 20px', 20, 200);
  
  // Test fallback
  ctx2.fillStyle = '#ff0000';
  ctx2.font = 'bold 25px InvalidFont, Roboto, Arial';
  ctx2.fillText('Fallback test (InvalidFont, Roboto, Arial)', 20, 250);
  
  // Save image
  const buffer2 = canvas2.toBuffer('image/png');
  fs.writeFileSync('test-with-fonts.png', buffer2);
  console.log('\n   ✅ Saved: test-with-fonts.png');
  
} catch (error) {
  console.log('   ❌ Font registration failed:', error.message);
  console.log('   Error details:', error);
}

console.log('\n📝 Instructions:');
console.log('1. Open test-without-fonts.png and test-with-fonts.png');
console.log('2. Compare the text rendering');
console.log('3. If they look the same, fonts are NOT working');
console.log('4. If they look different, fonts ARE working');