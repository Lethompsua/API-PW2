import User from '../../models/Usuario.js'; 
import mongoose from 'mongoose';

export const getUserProfile = async (req, res) => {
    // ESTA LÓGICA PERTENECE AL PERFIL, NO AL ÁLBUM
    try {
        const userId = req.params.userId;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ msg: 'ID de usuario inválido.' });
        }

        const user = await User.findById(userId).select('-password'); 
        if (!user) {
            return res.status(404).json({ msg: 'Usuario no encontrado' });
        }

        // Devolvemos los datos del perfil (nombre, nivel, email, etc.)
        res.json({
            id: user._id,
            nombre: user.nombre, 
            email: user.email,
            oro: user.oro,
            gemas: user.gemas,
            
            // Datos que tu frontend espera (ajusta los nombres si es necesario)
            username: `@${user.nombre ? user.nombre.split(' ')[0] : 'Fan'}`, 
            nivel: 15, // o user.nivel si lo tienes
            avatarURL: user.avatar || 'URL_DEFAULT',
            // ... otros campos del perfil
        });

    } catch (error) {
        console.error('ERROR EN BACKEND - Obtener perfil:', error);
        res.status(500).json({ msg: 'Error interno del servidor al cargar el perfil.' });
    }
}; 

export const updateProfile = async (req, res) => {
    const userId = req.params.userId;
    // La data a actualizar viene del cuerpo de la petición (Frontend)
    const updates = req.body; 
    
    // 1. Validar ID de MongoDB
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ msg: 'ID de usuario inválido.' });
    }

    try {
        // 2. Buscar y actualizar el documento en MongoDB
        // Usamos findByIdAndUpdate para aplicar los cambios directamente
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            // $set: Aplica solo los campos que están en 'updates'
            { $set: updates }, 
            { new: true, runValidators: true } // new: true devuelve el doc actualizado
        ).select('-password'); // Excluimos la contraseña

        if (!updatedUser) {
            return res.status(404).json({ msg: 'Usuario no encontrado para actualizar.' });
        }

        // 3. Respuesta exitosa
        res.json({
            msg: 'Perfil actualizado con éxito.',
            user: {
                id: updatedUser._id,
                nombre: updatedUser.nombre,
                email: updatedUser.email,
                // Puedes devolver aquí los campos actualizados que el Frontend necesita
            }
        });

    } catch (error) {
        console.error('ERROR EN BACKEND - Actualizar perfil:', error);

        // Manejo de errores de validación de Mongoose (formatos de fecha, etc.)
        if (error.name === 'ValidationError') {
             // Devolver un error 400 que el Frontend sepa leer
             return res.status(400).json({ msg: `Error de formato de datos: ${error.message}` });
        }
        
        // Manejo de error de clave duplicada
        if (error.code === 11000) {
            return res.status(400).json({ msg: 'Ese email o nombre de usuario ya está en uso.' });
        }

        res.status(500).json({ msg: 'Error interno del servidor al actualizar el perfil.' });
    }
};