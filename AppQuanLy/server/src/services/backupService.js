const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

/**
/ Service tự động sao lưu dữ liệu ra file JSON
 */
async function createDatabaseBackup() {
  try {
    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folderName = `backup-${timestamp}`;
    const targetFolder = path.join(backupDir, folderName);
    fs.mkdirSync(targetFolder, { recursive: true });

    const collections = await mongoose.connection.db.listCollections().toArray();
    const manifest = {
      createdAt: new Date(),
      collections: []
    };

    for (const col of collections) {
      const colName = col.name;
      const data = await mongoose.connection.db.collection(colName).find({}).toArray();
      const filePath = path.join(targetFolder, `${colName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      manifest.collections.push({ name: colName, count: data.length });
    }

    fs.writeFileSync(path.join(targetFolder, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

    // Giữ tối đa 10 bản sao lưu gần nhất, xóa bớt bản cũ
    cleanOldBackups(backupDir, 10);

    console.log(`[Backup] Sao lưu thành công tại: ${folderName}`);
    return { success: true, folderName, collections: manifest.collections };
  } catch (error) {
    console.error('[Backup Error]', error);
    return { success: false, error: error.message };
  }
}

function cleanOldBackups(backupDir, maxKeep = 10) {
  try {
    const files = fs.readdirSync(backupDir);
    const backupFolders = files
      .filter(f => f.startsWith('backup-'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    if (backupFolders.length > maxKeep) {
      const toDelete = backupFolders.slice(maxKeep);
      for (const item of toDelete) {
        fs.rmSync(item.path, { recursive: true, force: true });
      }
    }
  } catch (err) {
    console.error('[Clean Backups Error]', err);
  }
}

function getBackupList() {
  try {
    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) return [];
    const files = fs.readdirSync(backupDir);
    return files
      .filter(f => f.startsWith('backup-'))
      .map(f => {
        const p = path.join(backupDir, f);
        const stat = fs.statSync(p);
        let manifest = null;
        if (fs.existsSync(path.join(p, 'manifest.json'))) {
          try { manifest = JSON.parse(fs.readFileSync(path.join(p, 'manifest.json'), 'utf8')); } catch (e) {}
        }
        return {
          folderName: f,
          createdAt: stat.mtime,
          manifest
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (err) {
    return [];
  }
}

module.exports = {
  createDatabaseBackup,
  getBackupList
};
