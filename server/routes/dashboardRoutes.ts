import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';

const router = Router();

// Dashboard CRUD routes
router.get('/', (req, res, next) => dashboardController.list(req, res, next));
router.post('/', (req, res, next) => dashboardController.create(req, res, next));
router.get('/:id', (req, res, next) => dashboardController.getById(req, res, next));
router.put('/:id', (req, res, next) => dashboardController.update(req, res, next));
router.patch('/:id', (req, res, next) => dashboardController.update(req, res, next));
router.delete('/:id', (req, res, next) => dashboardController.delete(req, res, next));

// Sub-resource stream routes
router.post('/:id/streams', (req, res, next) => dashboardController.addStream(req, res, next));
router.delete('/:id/streams/:streamId', (req, res, next) => dashboardController.removeStream(req, res, next));

export default router;
