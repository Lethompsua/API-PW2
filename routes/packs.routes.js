// routes/packs.routes.js
import { Router } from "express";


import Usuario        from "../models/Usuario.js";
import Sticker        from "../models/sticker.js";
import UsuariosAlbum  from "../models/UsuariosAlbum.js";   // estado por usuario (enAlbum, repetidos)
import AperturaPaquete from "../models/AperturaPaquete.js"; // bitácora de aperturas

const r = Router();

/**
 * POST /api/packs/open-especial-usuario
 * Body:
 * {
 *   "nombreUsuario": "Demo",
 *   "precioOro": 100,
 *   "edicion": "WC-2026"
 * }
 *
 * Reglas:
 * - Cobra sólo con nombre de usuario y su oro.
 * - Entrega 1 escudo + 3 jugadores diferentes (si ya están pegados se descartan).
 * - Actualiza contadores del usuario: jugadoresPegados, escudosPegados.
 * - Registra la apertura en AperturaPaquete.
 */
r.post("/open-especial-usuario", async (req, res) => {
  try {
    const { nombreUsuario, precioOro, edicion } = req.body || {};
    if (!nombreUsuario || typeof precioOro !== "number" || !edicion) {
      return res.status(400).json({ msg: "nombreUsuario, precioOro y edicion son requeridos" });
    }

    const user = await Usuario.findOne({ nombre: nombreUsuario });
    if (!user) return res.status(404).json({ msg: "usuario no existe" });
    if ((user.oro ?? 0) < precioOro) return res.status(400).json({ msg: "oro insuficiente", saldoOro: user.oro });

    // set de stickers ya pegados para DESCARTAR
    const yaPegados = new Set(
      (await UsuariosAlbum.find({ userId: user._id, enAlbum: true }).select("stickerId"))
        .map(r => r.stickerId.toString())
    );

    // helper para muestrear evitando pegados
    async function sampleNuevos(match, size) {
      const candidates = await Sticker.aggregate([
        { $match: match },
        { $sample: { size: Math.max(size * 8, 8) } }
      ]);
      const picked = [];
      for (const s of candidates) {
        if (!yaPegados.has(String(s._id))) {
          picked.push(s);
          if (picked.length === size) break;
        }
      }
      return picked;
    }

    // 1 escudo + 3 jugadores (nuevos; si no hay, se entregan menos)
    const [escudos, jugadores] = await Promise.all([
      sampleNuevos({ edicion, tipo: "escudo" }, 1),
      sampleNuevos({ edicion, tipo: "jugador" }, 3),
    ]);
    const nuevos = [...escudos, ...jugadores];

    // Cobro
    user.oro = (user.oro ?? 0) - precioOro;
    user.jugadoresPegados = Number(user.jugadoresPegados ?? 0);
    user.escudosPegados   = Number(user.escudosPegados ?? 0);

    // Pegado (sin contar repetidos)
    const items = [];
    for (const st of nuevos) {
      await UsuariosAlbum.updateOne(
        { userId: user._id, stickerId: st._id },
        {
          $setOnInsert: {
            userId: user._id,
            stickerId: st._id,
            edicion,
            inAlbum: true,
            repetidos: 0,
            firstObtainedAt: new Date()
          },
          $set: { lastObtainedAt: new Date() }
        },
        { upsert: true }
      );

      if (st.tipo === "jugador") user.jugadoresPegados += 1;
      else if (st.tipo === "escudo") user.escudosPegados += 1;

      items.push({ stickerId: st._id, duplicateBefore: false, placedNow: true });
    }

    await user.save();

    await AperturaPaquete.create({
      userId: user._id,
      edicion,
      packTypeId: null,
      spent: { coins: precioOro, gems: 0 },
      items,
      openedAt: new Date()
    });

    res.status(201).json({
      ok: true,
      usuario: {
        nombre: user.nombre,
        oro: user.oro,
        jugadoresPegados: user.jugadoresPegados,
        escudosPegados: user.escudosPegados
      },
      entregados: items.length,
      meta: { solicitados: { escudos: 1, jugadores: 3 } },
      items
    });
  } catch (e) {
    console.error(e);
    res.status(400).json({ msg: "error en open-especial-usuario", error: e.message });
  }
});

export default r;
