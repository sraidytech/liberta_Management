import { Router } from 'express';
import { satisfactionSurveysController } from './satisfaction-surveys.controller';

const router = Router();

// Survey CRUD operations
router.post('/', async (req, res) => {
  await satisfactionSurveysController.createSurvey(req, res);
});

router.put('/:orderId', async (req, res) => {
  await satisfactionSurveysController.updateSurvey(req, res);
});

router.get('/order/:orderId', async (req, res) => {
  await satisfactionSurveysController.getSurveyByOrderId(req, res);
});

router.get('/order/:orderId/history', async (req, res) => {
  await satisfactionSurveysController.getSurveyHistory(req, res);
});

router.get('/missing', async (req, res) => {
  await satisfactionSurveysController.getOrdersWithoutSurveys(req, res);
});

router.get('/', async (req, res) => {
  await satisfactionSurveysController.listSurveys(req, res);
});

router.delete('/:id', async (req, res) => {
  await satisfactionSurveysController.deleteSurvey(req, res);
});

// Analytics endpoints
router.get('/analytics/overview', async (req, res) => {
  await satisfactionSurveysController.getOverviewMetrics(req, res);
});

router.get('/analytics/agents', async (req, res) => {
  await satisfactionSurveysController.getAgentPerformance(req, res);
});

router.get('/analytics/stores', async (req, res) => {
  await satisfactionSurveysController.getStorePerformance(req, res);
});

router.get('/analytics/products', async (req, res) => {
  await satisfactionSurveysController.getProductSatisfaction(req, res);
});

router.get('/analytics/wilayas', async (req, res) => {
  await satisfactionSurveysController.getWilayaSatisfaction(req, res);
});

router.get('/analytics/low-ratings', async (req, res) => {
  await satisfactionSurveysController.getLowRatings(req, res);
});

export default router;