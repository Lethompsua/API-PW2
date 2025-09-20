// models/Player.js
import { Schema, model } from "mongoose";

const JugadoresSchema = new Schema({
  codigo:   { type: String, required: true, unique: true }, // ej. "ARG-10"
  nombre:   { type: String, required: true },
  equipo:   { type: String, required: true },               // "ARG"
  posicion: { type: String, enum: ["POR","DEF","MED","DEL"], required: true },
  estadisticas: {
    edad: Number, alturaCm: Number, dorsal: Number, goles: Number, equipo: String
  }
}, { timestamps: true, versionKey: false });

export default model("Jugadores", JugadoresSchema);
