const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Đường dẫn nguồn và đích
const srcDir = path.resolve(__dirname, '../client/dist');
const destDir = path.resolve(__dirname, 'dist');

// Hàm sao chép đệ quy thư mục
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Build Client trước
console.log('📦 1. Đang build client React (Vite)...');
try {
  execSync('npm run build', { 
    cwd: path.resolve(__dirname, '..'), 
    stdio: 'inherit',
    env: { ...process.env, BUILD_TARGET: 'desktop' }
  });
  console.log('✅ Build client thành công!');
} catch (error) {
  console.error('❌ Lỗi build client:', error.message);
  process.exit(1);
}

// 2. Xóa và sao chép dist cũ trong thư mục desktop
console.log('\n📂 2. Đang chuẩn bị tệp tin cho ứng dụng desktop...');
if (fs.existsSync(destDir)) {
  console.log('🗑️  Xóa thư mục desktop/dist cũ...');
  fs.rmSync(destDir, { recursive: true, force: true });
}

console.log(`🚚 Sao chép từ ${srcDir} sang ${destDir}...`);
try {
  copyDir(srcDir, destDir);
  console.log('✅ Sao chép tệp thành công!');
} catch (error) {
  console.error('❌ Lỗi sao chép tệp:', error.message);
  process.exit(1);
}

// 3. Đóng gói Electron bằng electron-builder
console.log('\n🏗️  3. Đang đóng gói ứng dụng Desktop (electron-builder)...');
try {
  execSync('npm run build', { cwd: __dirname, stdio: 'inherit' });
  console.log('\n🎉 Đóng gói thành công! File cài đặt nằm ở thư mục "desktop/dist-electron/".');
} catch (error) {
  console.error('❌ Lỗi đóng gói Electron:', error.message);
  process.exit(1);
}
