const express = require('express');
const {
  createDownloadHistory,
  getDownloadHistory
} = require('../controllers/downloadHistoryController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authMiddleware, createDownloadHistory);
router.get('/', authMiddleware, getDownloadHistory);

module.exports = router;
