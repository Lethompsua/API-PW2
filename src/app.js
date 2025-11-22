import express from "express";
import cors from "cors";
import morgan from "morgan";

// Importación de rutas
import authRoutes from '../routes/auth.routes.js';
import userRoutes from '../routes/user.routes.js';
import packsRoutes from "../routes/packs.routes.js";
import albumRoutes from "../routes/album.routes.js";
import playerRoutes from '../routes/player.routes.js'; 
import exchangeRoutes from '../routes/exchange.routes.js';

// Factory de CRUD
import { crudRouter } from "../routes/crud.factory.js";

// Modelos
import Usuario     from "../models/Usuario.js";
import Jugador     from "../models/Jugador.js";
import Sticker     from "../models/sticker.js"; 
import PackType    from "../models/TipoPaquete.js";
import PackOpening from "../models/AperturaPaquete.js";
import UserSticker from "../models/UsuariosAlbum.js";

const app = express();

// 🛑 SOLUCIÓN EXTREMA: Manejar el método OPTIONS manualmente 
// Esto asegura que la respuesta preflight sea correcta y permita PATCH
app.use((req, res, next) => {
    // Definir los encabezados de CORS explícitamente
    res.header('Access-Control-Allow-Origin', 'https://fifaalbum.vercel.app');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Si el método es OPTIONS (el preflight de CORS), responder inmediatamente con 200 (OK)
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// --- CONFIGURACIÓN CORS PARA VERCEL (AHORA ES REDUNDANTE, PERO LA MANTENEMOS) ---
app.use(cors({
    origin: 'https://fifaalbum.vercel.app', 
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());              
app.use(morgan("dev"));

// --- RUTA RAÍZ (NECESARIA PARA VERCEL) ---
app.get("/", (req, res) => {
    res.send("⚽ Fanscore API is running on Vercel! 🚀");
});

app.get("/api/health", (_req,res)=>res.json({ ok:true }));

// Rutas Principales
app.use('/api/auth', authRoutes);

// CRUD routers
app.use("/api/usuarios",      crudRouter(Usuario));
app.use("/api/jugadores",     crudRouter(Jugador));
app.use("/api/stickers",      crudRouter(Sticker));
app.use("/api/packtypes",     crudRouter(PackType));
app.use("/api/packopenings",  crudRouter(PackOpening));
app.use("/api/userstickers",  crudRouter(UserSticker));

// Extra Functions Routes
app.use("/api/packs", packsRoutes);
app.use("/api/album", albumRoutes);
app.use('/api/users', userRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/exchange', exchangeRoutes);

console.log("✅ Rutas montadas correctamente");

export default app;