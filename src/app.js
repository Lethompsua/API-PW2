import express from "express";
import cors from "cors";
import morgan from "morgan";

import { crudRouter } from "../routes/crud.factory.js";


import Usuario     from "../models/Usuario.js";
import Jugador     from "../models/Jugador.js";
import Sticker     from "../models/sticker.js";
import PackType    from "../models/TipoPaquete.js";
import PackOpening from "../models/AperturaPaquete.js";
import UserSticker from "../models/UsuariosAlbum.js";

const app = express();
app.use(cors());
app.use(express.json());              
app.use(morgan("dev"));


app.get("/api/health", (_req,res)=>res.json({ ok:true }));

// CRUD routers
app.use("/api/usuarios",      crudRouter(Usuario));
app.use("/api/jugadores",     crudRouter(Jugador));
app.use("/api/stickers",      crudRouter(Sticker));
app.use("/api/packtypes",     crudRouter(PackType));
app.use("/api/packopenings",  crudRouter(PackOpening));
app.use("/api/userstickers",  crudRouter(UserSticker));

console.log(" rutas /api/usuarios, /api/jugadores, ... montadas"); // debug

export default app;
