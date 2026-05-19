import express from 'express';
import { sendBulkEmails, scheduleCampaign, getScheduledCampaigns, cancelScheduledCampaign, deleteCampaign, getCampaignById } from '../controllers/emailController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/send', protect, sendBulkEmails);
router.post('/schedule', protect, scheduleCampaign);
router.get('/scheduled', protect, getScheduledCampaigns);
router.delete('/scheduled/:id', protect, cancelScheduledCampaign);
router.get('/campaign/:id', protect, getCampaignById);
router.delete('/campaign/:id', protect, deleteCampaign);

export default router;
