// src/controllers/album.controller.js
import Usuario from "../../models/Usuario.js";
import UserSticker from "../../models/UsuariosAlbum.js";
import Sticker from "../../models/sticker.js";



// Normaliza tipos a español para el JSON final
const mapTipo = (t) => ({ player: "jugador", crest: "escudo" }[t] || t);

export async function resumenAlbumPorNombre(req, res) {
  const { nombreUsuario, edicion } = req.params;

  const user = await Usuario.findOne({ nombre: nombreUsuario });
  if (!user) return res.status(404).json({ msg: "usuario no existe" });

  // 1) Trae pegados del usuario y POPULATE del sticker para saber edicion/tipo
  const pegadosDocs = await UserSticker.find({ userId: user._id, inAlbum: true })
    .populate({ path: "stickerId", select: "edicion tipo" })
    .lean();

  // 2) Filtra SOLO los de la edición pedida y cuenta por tipo
  let pegJug = 0, pegEsc = 0;
  for (const us of pegadosDocs) {
    const st = us.stickerId;
    if (!st || st.edicion !== edicion) continue; // ojo: tu Sticker usa 'edicion'
    const tipo = mapTipo(st.tipo);
    if (tipo === "jugador") pegJug++;
    if (tipo === "escudo")  pegEsc++;
  }

  // 3) Totales por tipo en ESA edición (desde stickers)
  const [totJug, totEsc] = await Promise.all([
    Sticker.countDocuments({ edicion, tipo: { $in: ["jugador", "player"] } }),
    Sticker.countDocuments({ edicion, tipo: { $in: ["escudo", "crest"] } })
  ]);

  return res.json({
    usuario: user.nombre,
    edicion,
    progreso: {
      jugadores: { pegados: pegJug, total: totJug },
      escudos:   { pegados: pegEsc, total: totEsc }
    }
  });
}

export const abrirSobre = async (req, res) => {
  try {
    const userId = req.user.id; // Asumo que esto viene de tu middleware de auth
    const PRECIO_SOBRE = 100; // Define el precio en oro

    // 1. Verificar y cobrar al usuario
    const user = await Usuario.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    if (user.oro < PRECIO_SOBRE) {
      return res.status(400).json({ message: 'No tienes suficiente oro' });
    }
    user.oro -= PRECIO_SOBRE; // Resta el oro

    // 2. Obtener los stickers del paquete
    // ¡Aquí usas tu función!
    const newStickerIds = tuLogicaDeAbrirSobre(); // Ej: ['id_A', 'id_B', 'id_A', 'id_C']
    
    if (!newStickerIds || newStickerIds.length === 0) {
      return res.status(500).json({ message: 'Error al generar stickers' });
    }

    // 3. Contar la frecuencia de los stickers obtenidos
    // (Para manejar si en el MISMO sobre te salen repetidas)
    const stickerFrequency = new Map();
    for (const id of newStickerIds) {
      stickerFrequency.set(id, (stickerFrequency.get(id) || 0) + 1);
    }
    // Resultado: Map { 'id_A' => 2, 'id_B' => 1, 'id_C' => 1 }

    // 4. Preparar la operación de base de datos
    const uniqueIdsInPack = [...stickerFrequency.keys()];
    const bulkOps = [];
    const now = new Date();

    // Busca las entradas que el usuario YA tiene en su álbum
    const existingEntries = await UserSticker.find({
      userId: userId,
      stickerId: { $in: uniqueIdsInPack }
    });
    
    // Mapea las entradas existentes para un acceso rápido
    const existingEntryMap = new Map(
      existingEntries.map(entry => [entry.stickerId.toString(), entry])
    );

    for (const [stickerId, count] of stickerFrequency.entries()) {
      const existingEntry = existingEntryMap.get(stickerId);

      if (existingEntry) {
        // --- CASO 1: YA TIENE ESTE STICKER (Repetida) ---
        // Simplemente incrementa el contador de duplicados
        bulkOps.push({
          updateOne: {
            filter: { _id: existingEntry._id }, // Busca por el ID único de la entrada
            update: {
              $inc: { duplicates: count }, // Incrementa por la cantidad de veces que salió
              $set: { lastObtainedAt: now }
            }
          }
        });
      } else {
        // --- CASO 2: ES UN STICKER NUEVO ---
        // La primera se marca como 'inAlbum: true'
        // El resto (count - 1) se van a duplicados
        bulkOps.push({
          insertOne: {
            document: {
              userId: userId,
              stickerId: stickerId,
              inAlbum: true,       // ¡Pegada en el álbum!
              duplicates: count - 1, // Si count es 1, duplicates es 0 (perfecto)
              firstObtainedAt: now,
              lastObtainedAt: now
            }
          }
        });
      }
    }

    // 5. Ejecutar TODAS las operaciones de una sola vez
    if (bulkOps.length > 0) {
      await UserSticker.bulkWrite(bulkOps);
    }
    
    // 6. Guardar el cambio de oro del usuario
    await user.save();

    // 7. Responder al frontend con los stickers que salieron
    // El frontend usará este array para la animación
    res.status(200).json({
      message: '¡Sobre abierto con éxito!',
      stickersObtenidos: newStickerIds, // Envía los IDs para la animación
      oroRestante: user.oro
    });

  } catch (error) {
    console.error('Error al abrir sobre:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};
