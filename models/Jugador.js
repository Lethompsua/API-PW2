import { Schema, model } from "mongoose";

const PlayerSchema = new Schema({
  // Identificación
  name: { type: String, required: true },       // "Lionel Messi"
  fullName: { type: String },                   // "Lionel Andrés Messi"
  country: { type: String, required: true },    // "argentina" (minusculas para filtrar facil)
  team: { type: String, required: true },       // "psg"
  position: { type: String, required: true },   // "delantero"
  
  // Ficha Técnica
  age: { type: Number },
  height: { type: String }, // "170 cm"
  weight: { type: String }, // "72 kg"
  preferredFoot: { type: String, enum: ["Derecho", "Izquierdo", "Ambos"] },
  
  // Visuales
  image: { type: String },  // URL de la foto
  rating: { type: Number, default: 75 }, // 93
  description: { type: String }, // Biografía corta
  
  // Stats tipo FIFA (Objeto anidado)
  stats: {
    velocidad: { type: Number, default: 50 },
    regate:    { type: Number, default: 50 },
    tiro:      { type: Number, default: 50 },
    defensa:   { type: Number, default: 50 },
    pase:      { type: Number, default: 50 },
    fisico:    { type: Number, default: 50 }
  },

  // Listas de texto
  skills: [String],        // ["Regate", "Visión"]
  achievements: [String],  // ["8x Balón de Oro"]

}, { timestamps: true, versionKey: false });

// Índices para búsqueda rápida
PlayerSchema.index({ name: 'text', fullName: 'text' }); 

export default model("Player", PlayerSchema);