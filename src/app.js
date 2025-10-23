import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from '../routes/auth.routes.js';

import { crudRouter } from "../routes/crud.factory.js";


import Usuario     from "../models/Usuario.js";
import Jugador     from "../models/Jugador.js";
import Sticker     from "../models/sticker.js";
import PackType    from "../models/TipoPaquete.js";
import PackOpening from "../models/AperturaPaquete.js";
import UserSticker from "../models/UsuariosAlbum.js";
import packsRoutes from "../routes/packs.routes.js";
import albumRoutes from "../routes/album.routes.js";


const app = express();
app.use(cors());
app.use(express.json());              
app.use(morgan("dev"));


app.get("/api/health", (_req,res)=>res.json({ ok:true }));
app.use('/api/auth', authRoutes);

// CRUD routers
app.use("/api/usuarios",      crudRouter(Usuario));
app.use("/api/jugadores",     crudRouter(Jugador));
app.use("/api/stickers",      crudRouter(Sticker));
app.use("/api/packtypes",     crudRouter(PackType));
app.use("/api/packopenings",  crudRouter(PackOpening));
app.use("/api/userstickers",  crudRouter(UserSticker));

// Extra Functions Routes
app.use("/api/packs", packsRoutes);
app.use("/api/album", albumRoutes);

console.log(" rutas /api/usuarios, /api/jugadores, ... montadas"); // debug

export default app;
