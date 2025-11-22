import express from "express";
import cors from "cors";
import morgan from "morgan";

// Importación de rutas
import authRoutes from "../routes/auth.routes.js";
import userRoutes from "../routes/user.routes.js";
import packsRoutes from "../routes/packs.routes.js";
import albumRoutes from "../routes/album.routes.js";
import playerRoutes from "../routes/player.routes.js";
import exchangeRoutes from "../routes/exchange.routes.js";

// Factory CRUD
import { crudRouter } from "../routes/crud.factory.js";

// Modelos
import Usuario from "../models/Usuario.js";
import Jugador from "../models/Jugador.js";
import Sticker from "../models/sticker.js";
import PackType from "../models/TipoPaquete.js";
import PackOpening from "../models/AperturaPaquete.js";
import UserSticker from "../models/UsuariosAlbum.js";

const app = express();



app.use(
  cors({
    origin: "https://fifaalbum.vercel.app",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(morgan("dev"));

// --- RUTA PARA VER SI EL BACKEND ESTÁ VIVO ---
app.get("/", (req, res) => {
  res.send("⚽ Fanscore API running!");
});

// Health check
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// --- RUTAS ---
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", crudRouter(Usuario));
app.use("/api/jugadores", crudRouter(Jugador));
app.use("/api/stickers", crudRouter(Sticker));
app.use("/api/packtypes", crudRouter(PackType));
app.use("/api/packopenings", crudRouter(PackOpening));
app.use("/api/userstickers", crudRouter(UserSticker));
app.use("/api/packs", packsRoutes);
app.use("/api/album", albumRoutes);
app.use("/api/users", userRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/exchange", exchangeRoutes);

console.log("✅ API inicializada correctamente");

export default app;
