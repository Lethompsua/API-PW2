import { Router } from "express";
import Player from "../models/Jugador.js";

const router = Router();

// GET /api/players
// Obtiene todos los jugadores para la enciclopedia
router.get("/", async (req, res) => {
  try {
    const players = await Player.find().sort({ rating: -1 }); // Ordenados por los mejores
    res.json(players);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error obteniendo jugadores" });
  }
});

// POST /api/players (Solo para que puedas meter datos rápido con Postman)
router.post("/", async (req, res) => {
    try {
        const newPlayer = await Player.create(req.body);
        res.json(newPlayer);
    } catch (error) {
        res.status(500).json({ msg: "Error creando jugador" });
    }
});

export default router;