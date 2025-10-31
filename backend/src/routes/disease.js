import express from 'express';

const router = express.Router();

// Placeholder: accepts an image URL or base64 in future
router.post('/analyze', async (req, res) => {
	// For now, return a stub response
	return res.json({
		status: 'stub',
		message: 'Plant disease detection will be added in a future update',
		probabilities: {}
	});
});

export default router;


