import express, { Request, Response } from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary';
import { protect } from '../middleware/auth';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/', protect, upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No image provided' });
      return;
    }

    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    
    const result = await cloudinary.uploader.upload(dataURI, {
      resource_type: 'auto',
      folder: 'rivochain/deposits',
    });

    res.json({
      secureUrl: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Image upload failed' });
  }
});

export default router;
