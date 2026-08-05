"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage });
router.post('/', auth_1.protect, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ message: 'No image provided' });
            return;
        }
        const b64 = Buffer.from(req.file.buffer).toString('base64');
        const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
        const result = await cloudinary_1.default.uploader.upload(dataURI, {
            resource_type: 'auto',
            folder: 'rivochain/deposits',
        });
        res.json({
            url: result.secure_url,
            public_id: result.public_id,
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Image upload failed' });
    }
});
exports.default = router;
