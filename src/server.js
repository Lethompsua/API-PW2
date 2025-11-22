import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";

// 1. Definir el puerto: Si .env no tiene PORT, usamos 27017 por defecto para evitar conflicto.
const PORT = process.env.PORT || 3001; 

// 2. Obtener la URI de la DB: Usamos el nombre correcto de la variable de tu .env.
const MONGO_URI = process.env.MONGO_URI; 

(async () => {
    try {
        // Aseguramos que la URI exista antes de conectar
        if (!MONGO_URI) {
            throw new Error("MONGO_URI no está definida en el archivo .env.");
        }
        
        // 3. Conectar la Base de Datos
        await connectDB(MONGO_URI);

        // 4. Iniciar el servidor Express
        app.listen(PORT, () => console.log(`🚀 API corriendo en: http://localhost:${PORT}`));
    } catch (error) {
        console.error("❌ Fallo al iniciar el servidor:", error.message);
        process.exit(1); // Detiene la app si la conexión falla
    }
})();