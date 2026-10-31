const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');
const documentsDir = path.join(uploadsRoot, 'documents');
const avatarsDir = path.join(uploadsRoot, 'avatars');

for (const dir of [documentsDir, avatarsDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, documentsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const documentFileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.txt', '.md'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, TXT, and MD files are supported'));
  }
};

const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  }
});

const avatarFileFilter = (req, file, cb) => {
  const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PNG, JPG, and WEBP images are supported'));
  }
};

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = { uploadDocument, uploadAvatar, documentsDir, avatarsDir };
