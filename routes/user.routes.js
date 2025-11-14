import { Router } from 'express';
import { getUserProfile, updateProfile } from '../src/controllers/user.controller.js'; 

const router = Router();

// GET para cargar perfil (ya funciona)
router.get('/:userId', getUserProfile);

// 🛑 ESTA LÍNEA DEBE SER CORRECTA Y EXISTIR 🛑
router.patch('/:userId', updateProfile); // <--- DEBE SER PATCH

export default router;