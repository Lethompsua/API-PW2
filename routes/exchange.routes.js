// routes/exchange.routes.js
import { Router } from "express";
import Usuario from "../models/Usuario.js";
import Sticker from "../models/sticker.js"; // Ojo con la mayúscula/minúscula de tu archivo
import UsuariosAlbum from "../models/UsuariosAlbum.js";
import Intercambio from "../models/intercambio.js";

const router = Router();


// 1. OBTENER MIS DUPLICADOS (CORREGIDA Y BLINDADA)
// GET /api/exchange/duplicates/:nombreUsuario
router.get("/duplicates/:nombreUsuario", async (req, res) => {
  try {
    const user = await Usuario.findOne({ nombre: req.params.nombreUsuario });
    if (!user) return res.status(404).json({ msg: "Usuario no encontrado" });

    // Buscar stickers donde duplicates > 0
    const misRepetidas = await UsuariosAlbum.find({ 
        userId: user._id, 
        duplicates: { $gt: 0 } 
    }).populate('stickerId'); 

    // --- FILTRADO DE SEGURIDAD ---
    // Filtramos para asegurarnos de que stickerId NO sea null (evita el error 500)
    const repetidasValidas = misRepetidas.filter(item => item.stickerId != null);

    // Formatear
    const data = repetidasValidas.map(item => ({
        id: item.stickerId._id,
        number: item.stickerId.numero,
        name: item.stickerId.titulo || item.stickerId.playerId?.name || "Sticker", // Fallback de nombre
        image: item.stickerId.imagen || "https://via.placeholder.com/150",
        team: item.stickerId.equipo || "FIFA",
        position: item.stickerId.tipo,
        duplicates: item.duplicates
    }));

    res.json(data);
  } catch (e) {
    console.error("Error en duplicates:", e); // Imprime el error real en la terminal
    res.status(500).json({ error: e.message });
  }
});

// 2. VER MERCADO (Intercambios disponibles)
// GET /api/exchange/feed
router.get("/feed", async (req, res) => {
  try {
    // Traer solo los ABIERTOS y llenar los datos de usuario y stickers
    const intercambios = await Intercambio.find({ estado: "ABIERTO" })
        .populate("creadorId", "nombre") // Solo nombre del creador
        .populate("oferta") // Datos de stickers ofrecidos
        .populate("demanda") // Datos de stickers buscados
        .sort({ createdAt: -1 });

    // Mapear al formato de tu HTML
    const feed = intercambios.map(trade => ({
        id: trade._id,
        user: {
            name: trade.creadorId.nombre,
            // Avatar aleatorio o real si tienes
            avatar: `https://ui-avatars.com/api/?name=${trade.creadorId.nombre}&background=random`
        },
        offers: trade.oferta.map(s => ({
            id: s._id, name: s.titulo, team: s.equipo, position: s.tipo, number: s.numero, image: s.imagen
        })),
        wants: trade.demanda.map(s => ({
            id: s._id, name: s.titulo, team: s.equipo, position: s.tipo, number: s.numero, image: s.imagen
        }))
    }));

    res.json(feed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3. CREAR INTERCAMBIO (Publicar oferta)
// POST /api/exchange/create
router.post("/create", async (req, res) => {
    try {
        const { nombreUsuario, ofertaIds, demandaIds } = req.body;
        const user = await Usuario.findOne({ nombre: nombreUsuario });
        if(!user) return res.status(404).json({msg: "Usuario no encontrado"});

        // Validar que el usuario realmente tenga esas repetidas (Opcional pero recomendado)
        // Por simplicidad, asumimos que el frontend no miente.
        
        // IMPORTANTE: Al crear el intercambio, RESTAMOS las repetidas del usuario
        // para que no las ofrezca dos veces.
        for (const stickerId of ofertaIds) {
            await UsuariosAlbum.updateOne(
                { userId: user._id, stickerId: stickerId },
                { $inc: { duplicates: -1 } } 
            );
        }

        const nuevoTrade = await Intercambio.create({
            creadorId: user._id,
            oferta: ofertaIds,
            demanda: demandaIds,
            estado: "ABIERTO"
        });

        res.json({ ok: true, msg: "Intercambio publicado" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4. ACEPTAR INTERCAMBIO (¡La magia!)
// POST /api/exchange/accept
router.post("/accept", async (req, res) => {
    try {
        const { nombreUsuario, tradeId, stickerEntregadoId } = req.body;
        
        // A) Usuario que ACEPTA (Tú)
        const aceptante = await Usuario.findOne({ nombre: nombreUsuario });
        
        // B) Buscar el Intercambio
        const trade = await Intercambio.findById(tradeId);
        if(!trade || trade.estado !== "ABIERTO") {
            return res.status(400).json({ msg: "Este intercambio ya no está disponible" });
        }

        const creadorId = trade.creadorId;
        const stickerRecibidoId = trade.oferta[0]; // Asumimos 1x1 para simplificar lógica

        // --- TRANSACCIÓN ---

        // 1. ACEPTANTE: Pierde el sticker que entrega (su repetida)
        await UsuariosAlbum.updateOne(
            { userId: aceptante._id, stickerId: stickerEntregadoId },
            { $inc: { duplicates: -1 } }
        );

        // 2. ACEPTANTE: Gana el sticker de la oferta (Nueva o +1 repe)
        // Verificamos si ya lo tiene para hacer update o insert
        const existeEnAceptante = await UsuariosAlbum.findOne({ userId: aceptante._id, stickerId: stickerRecibidoId });
        if(existeEnAceptante) {
            existeEnAceptante.duplicates += 1;
            await existeEnAceptante.save();
        } else {
            await UsuariosAlbum.create({
                userId: aceptante._id, stickerId: stickerRecibidoId, inAlbum: true, duplicates: 0, firstObtainedAt: new Date()
            });
        }

        // 3. CREADOR: Gana el sticker que el aceptante entregó
        // (Nota: El creador ya "perdió" su sticker cuando creó la oferta en /create)
        const existeEnCreador = await UsuariosAlbum.findOne({ userId: creadorId, stickerId: stickerEntregadoId });
        if(existeEnCreador) {
            existeEnCreador.duplicates += 1;
            await existeEnCreador.save();
        } else {
             await UsuariosAlbum.create({
                userId: creadorId, stickerId: stickerEntregadoId, inAlbum: true, duplicates: 0, firstObtainedAt: new Date()
            });
        }

        // 4. Cerrar el trade
        trade.estado = "COMPLETADO";
        trade.completadoPorId = aceptante._id;
        await trade.save();

        res.json({ ok: true, msg: "¡Intercambio exitoso!" });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

export default router;