const express = require("express");
const multer = require("multer");
const {
  uploadDocument,
  downloadDocument,
  getDocuments,
  deleteDocument,
  updateDocument,
  verifyDocumentSignaturee,
  getAllDocuments,
  deleteDocumentt,
  updateDocumentt,
} = require("../controllers/documentController");
const auth = require("../middleware/verifyToken");
const checkRole = require("../middleware/checkRole");
const userRole = require("../utils/enums/userRole");

const uploadMiddleware = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// Upload (POST /api/documents/upload)
router.post("/upload", auth, checkRole([userRole.STAFF, userRole.ADMIN]), uploadMiddleware.single("file"), uploadDocument);

// GET (GET /api/documents)
router.get("/", auth,checkRole([userRole.STAFF, userRole.ADMIN]), getDocuments);
// GET (GET /api/documents/all)
router.get("/all", auth, checkRole([userRole.ADMIN, userRole.USER]), getAllDocuments);

router.delete("/:docId", auth,checkRole([userRole.STAFF, userRole.ADMIN]), deleteDocument);
router.delete(
  "/delete/:docId",
  auth,
  checkRole([userRole.ADMIN]),
  deleteDocumentt
);

router.patch("/:id", auth, checkRole([userRole.STAFF, userRole.ADMIN]),updateDocument);
router.patch("/update/:id", auth, checkRole([userRole.ADMIN]), updateDocumentt);

// Download (GET /api/documents/:id/download)
router.get("/:id/download", auth, downloadDocument);

// Verify (GET /api/documents/:id/verify)
router.get("/:id/verify", auth,checkRole([userRole.STAFF, userRole.ADMIN]), verifyDocumentSignaturee);

module.exports = router;
