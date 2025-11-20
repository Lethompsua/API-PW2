// routes/album.routes.js
import { Router } from "express";
import Usuario from "../models/Usuario.js";
import Sticker from "../models/sticker.js";
import UsuariosAlbum from "../models/UsuariosAlbum.js";

const router = Router();

// GET /api/album/grid/:nombreUsuario?edicion=WC-2026
router.get("/grid/:nombreUsuario", async (req, res) => {
  try {
    const { nombreUsuario } = req.params;
    const { edicion = "WC-2026" } = req.query;

    // 1. Buscar Usuario
    const user = await Usuario.findOne({ nombre: nombreUsuario });
    if (!user) return res.status(404).json({ msg: "Usuario no encontrado" });

    // 2. Obtener TODOS los stickers de esa edición (Catálogo completo)
    // Ordenados por número para que salgan en orden 1, 2, 3...
    const catalogStickers = await Sticker.find({ edicion }).sort({ numero: 1 }).lean();

    // 3. Obtener los que el usuario YA TIENE
    const userStickers = await UsuariosAlbum.find({ userId: user._id, inAlbum: true }).lean();

    // Crear un Map para búsqueda rápida:  stickerId -> datos del usuario (repetidos, etc)
    const ownedMap = new Map();
    userStickers.forEach(us => {
        ownedMap.set(us.stickerId.toString(), us);
    });

    // 4. Mezclar datos (Catálogo + Estado del Usuario)
    const albumGrid = catalogStickers.map(sticker => {
        const ownedData = ownedMap.get(sticker._id.toString());
        
        // Si es 'player', intentamos armar nombre/imagen si no vienen en el sticker
        // (Depende de si usas populate, pero con tu esquema nuevo de Sticker con imagen es fácil)
        
        return {
            id: sticker._id,
            number: sticker.numero,
            name: sticker.titulo || "Desconocido", // Tu campo 'titulo'
            image: sticker.imagen || "https://via.placeholder.com/150",
            team: sticker.equipo || "FIFA",
            position: sticker.tipo, // 'jugador', 'escudo'
            rarity: sticker.rareza || "comun",
            
            // Estado del usuario
            obtained: !!ownedData, // true si existe en el mapa
            duplicates: ownedData ? ownedData.duplicates : 0,
            
            // Descripción para el modal
            description: `Sticker oficial de ${sticker.equipo || 'la Copa'}. Tipo: ${sticker.tipo.toUpperCase()}.`
        };
    });

    res.json({
        ok: true,
        total: albumGrid.length,
        obtained: userStickers.length,
        stickers: albumGrid
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Error al cargar álbum" });
  }
});

export default router;