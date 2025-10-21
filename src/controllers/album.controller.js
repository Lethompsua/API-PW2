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
