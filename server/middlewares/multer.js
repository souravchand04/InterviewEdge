import multer from "multer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const uploadDir = process.env.VERCEL === "1" ? os.tmpdir() : "public";
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const filename = Date.now() + "-" + file.originalname;
        cb(null, path.basename(filename));
    }
})

export const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit

});
