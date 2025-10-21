import { Router } from "express";
import { resumenAlbumPorNombre } from "../src/controllers/album.controller.js";
const r = Router();
r.get("/resumen/:nombreUsuario/:edicion", resumenAlbumPorNombre);
export default r;
