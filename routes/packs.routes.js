// routes/packs.routes.js
import { Router } from "express";

import Usuario        from "../models/Usuario.js";
import Sticker        from "../models/sticker.js";
import UsuariosAlbum  from "../models/UsuariosAlbum.js";   // estado por usuario (enAlbum, repetidos)
import AperturaPaquete from "../models/AperturaPaquete.js"; // bitácora de aperturas

// --- ¡ESTA ES LA LÍNEA QUE TE FALTA! ---
const r = Router();
// ---------------------------------------

/**
 * POST /api/packs/open-especial-usuario
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
      (await UsuariosAlbum.find({ userId: user._id, inAlbum: true }).select("stickerId"))
        .map(r => r.stickerId.toString())
    );

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

    const [escudos, jugadores] = await Promise.all([
      sampleNuevos({ edicion, tipo: "escudo" }, 1),
      sampleNuevos({ edicion, tipo: "jugador" }, 3),
    ]);
    const nuevos = [...escudos, ...jugadores];

    user.oro = (user.oro ?? 0) - precioOro;
    user.jugadoresPegados = Number(user.jugadoresPegados ?? 0);
    user.escudosPegados   = Number(user.escudosPegados ?? 0);

    const items = [];
    for (const st of nuevos) {
      await UsuariosAlbum.updateOne(
        { userId: user._id, stickerId: st._id },
        {
          $setOnInsert: {
            userId: user._id,
            stickerId: st._id,
            inAlbum: true,
            duplicates: 0,
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


/**
 * POST /api/packs/open-normal
 * CAMBIO: Ahora cobra 1 SOBRE del inventario, no ORO.
 */
r.post("/open-normal", async (req, res) => {
  try {
    const { nombreUsuario, edicion, packSize = 5 } = req.body || {};
    
    if (!nombreUsuario || !edicion) return res.status(400).json({ msg: "Faltan datos" });

    // 1. Validar Usuario
    const user = await Usuario.findOne({ nombre: nombreUsuario });
    if (!user) return res.status(404).json({ msg: "Usuario no existe" });

    // 2. Validar/Cobrar Sobres
    const sobresDisponibles = user.sobres || 0;
    if (sobresDisponibles < 1) return res.status(400).json({ msg: "Sin sobres disponibles" });

    user.sobres = sobresDisponibles - 1;
    
    // 3. Obtener Stickers Random
    let stickersDelSobre = await Sticker.aggregate([
      { $match: { edicion: edicion } },
      { $sample: { size: packSize } } 
    ]);
    
    if (stickersDelSobre.length < packSize) return res.status(500).json({ msg: "Error DB: Faltan stickers" });

    // Popular datos del jugador (por si acaso los usas)
    await Sticker.populate(stickersDelSobre, { path: 'playerId' });

    // 4. Calcular Frecuencias (cuántas veces salió cada uno en este sobre)
    const stickerFrequency = new Map(); 
    const stickerInfoMap = new Map();

    for (const sticker of stickersDelSobre) {
      const id = sticker._id.toString();
      stickerFrequency.set(id, (stickerFrequency.get(id) || 0) + 1);
      stickerInfoMap.set(id, sticker);
    }

    // 5. Preparar Guardado en BD (UsuariosAlbum)
    const uniqueIdsInPack = [...stickerFrequency.keys()];
    const bulkOps = [];
    const itemsBitacora = [];
    const now = new Date();

    // Consultar cuáles ya tiene el usuario
    const existingEntries = await UsuariosAlbum.find({
      userId: user._id,
      stickerId: { $in: uniqueIdsInPack }
    });
    
    const existingEntryMap = new Map(
      existingEntries.map(entry => [entry.stickerId.toString(), entry])
    );

    // 6. Procesar lógica de Repetidas vs Nuevas
    for (const [stickerId, count] of stickerFrequency.entries()) {
      const stickerFull = stickerInfoMap.get(stickerId);
      const existingEntry = existingEntryMap.get(stickerId);
      
      // --- LÓGICA VISUAL (Qué enviamos al frontend) ---
      // Prioridad de Imagen: Campo 'imagen' directo > Player poblado > Placeholder
      let imgUrl = stickerFull.imagen;
      if (!imgUrl && stickerFull.playerId?.image) imgUrl = stickerFull.playerId.image;
      if (!imgUrl) imgUrl = "https://via.placeholder.com/150?text=" + encodeURIComponent(stickerFull.titulo || "Sticker");

      // Prioridad de Nombre
      let nombreSticker = stickerFull.titulo || stickerFull.playerId?.name || "Sticker";

      const itemLog = { 
          stickerId, 
          // Datos visuales para que Vue los muestre
          name: nombreSticker,
          image: imgUrl,
          team: stickerFull.equipo || stickerFull.playerId?.team || "FIFA",
          position: stickerFull.tipo,
          
          duplicateBefore: !!existingEntry, 
          placedNow: !existingEntry
      };

      // --- GUARDADO EN TU MODELO 'UsuariosAlbum' (UserSticker) ---
      if (existingEntry) {
        // YA LO TIENE: Actualizamos 'duplicates' y 'lastObtainedAt'
        bulkOps.push({
          updateOne: {
            filter: { _id: existingEntry._id },
            update: { 
                $inc: { duplicates: count }, 
                $set: { lastObtainedAt: now } 
            }
          }
        });
        // Logs visuales
        for (let i = 0; i < count; i++) itemsBitacora.push({...itemLog, isNew: false});

      } else {
        // ES NUEVA: Creamos el documento
        bulkOps.push({
          insertOne: {
            document: {
              userId: user._id, 
              stickerId: stickerId, 
              inAlbum: true,          // <--- Se marca como pegado
              duplicates: count - 1,  // Si salieron 2 iguales nuevas, 1 va al álbum, 1 es repe
              firstObtainedAt: now, 
              lastObtainedAt: now
            }
          }
        });

        // Actualizar estadísticas del usuario
        if (stickerFull.tipo === "jugador") user.jugadoresPegados = (user.jugadoresPegados || 0) + 1;
        else if (stickerFull.tipo === "escudo") user.escudosPegados = (user.escudosPegados || 0) + 1;
        
        itemsBitacora.push({...itemLog, isNew: true});
        for (let i = 0; i < count - 1; i++) itemsBitacora.push({...itemLog, isNew: false});
      }
    }

    // 7. EJECUTAR ESCRITURA EN BD
    if (bulkOps.length > 0) {
      await UsuariosAlbum.bulkWrite(bulkOps);
    }
    
    await user.save();

    // 8. Guardar historial de apertura
    await AperturaPaquete.create({
      userId: user._id, edicion, packTypeId: null,
      spent: { coins: 0, gems: 0 }, items: itemsBitacora, openedAt: now
    });

    // 9. Responder
    res.status(201).json({
      ok: true,
      usuario: {
        nombre: user.nombre, oro: user.oro, sobres: user.sobres,
        jugadoresPegados: user.jugadoresPegados, escudosPegados: user.escudosPegados
      },
      items: itemsBitacora 
    });

  } catch (e) {
    console.error(e);
    res.status(400).json({ msg: "Error al abrir sobre", error: e.message });
  }
});

/**
 * POST /api/packs/buy
 * Body: { "nombreUsuario": "Demo", "cantidad": 1, "precioUnitario": 100 }
 * * Compra sobres usando oro y los guarda en el inventario.
 */
r.post("/buy", async (req, res) => {
  try {
    const { nombreUsuario, cantidad = 1, precioUnitario = 100 } = req.body;
    
    const user = await Usuario.findOne({ nombre: nombreUsuario });
    if (!user) return res.status(404).json({ msg: "Usuario no encontrado" });

    const costoTotal = cantidad * precioUnitario;

    // Verificar saldo
    if (user.oro < costoTotal) {
      return res.status(400).json({ 
        msg: "Oro insuficiente", 
        falta: costoTotal - user.oro 
      });
    }

    // Transacción: Restar oro, Sumar sobres
    user.oro -= costoTotal;
    user.sobres = (user.sobres || 0) + cantidad;
    
    await user.save();

    res.json({
      ok: true,
      msg: `Compraste ${cantidad} sobre(s)`,
      usuario: {
        oro: user.oro,
        sobres: user.sobres
      }
    });

  } catch (error) {
    res.status(500).json({ msg: "Error en compra", error: error.message });
  }
});

export default r;