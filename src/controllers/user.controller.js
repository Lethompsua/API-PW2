import User from '../../models/Usuario.js'; 
import mongoose from 'mongoose';

// Función para obtener datos del perfil
export const getUserProfile = async (req, res) => {
    try {
        const userId = req.params.userId;
        // ... (Verificaciones de ID)
        
        const user = await User.findById(userId).select('-password'); 
        if (!user) { /* ... */ return res.status(404).json({ msg: 'Usuario no encontrado' }); }

        res.json({
            id: user._id,
            nombre: user.nombre, 
            email: user.email,
            
            // 🛑 DEVOLVER TODOS LOS CAMPOS PARA LA SINCRONIZACIÓN GLOBAL 🛑
            bio: user.bio || 'Coleccionista de cromos.',
            birthDate: user.birthDate || 'No especificada', 
            favoriteTeam: user.favoriteTeam || 'No especificado',
            avatarURL: user.avatar || 'URL_DEFAULT', // Usar avatarURL

            // Datos del Dashboard (ejemplos)
            username: user.username || `@${user.nombre ? user.nombre.split(' ')[0] : 'Fan'}`,
            nivel: user.nivel || 1, 
            progresoAlbum: user.progresoAlbum || 0,
            cromosObtenidos: user.cromosObtenidos || 0,
            sobresDisponibles: user.sobresDisponibles || 0,
            intercambios: user.intercambios || 0
        });

    } catch (error) {
        console.error('ERROR EN BACKEND - Obtener perfil:', error);
        res.status(500).json({ msg: 'Error interno del servidor al cargar el perfil.' });
    }
};


// Función para actualizar datos del perfil
export const updateProfile = async (req, res) => {
    const userId = req.params.userId;
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
            { $set: updates }, 
            { new: true, runValidators: true } 
        ).select('-password'); 

        if (!updatedUser) {
            return res.status(404).json({ msg: 'Usuario no encontrado para actualizar.' });
        }

        // 3. Respuesta exitosa
        // 🛑 DEVOLVEMOS EL OBJETO COMPLETO Y ACTUALIZADO PARA FACILITAR LA SINCRONIZACIÓN 🛑
        res.json({
            msg: 'Perfil actualizado con éxito.',
            user: {
                id: updatedUser._id,
                nombre: updatedUser.nombre,
                email: updatedUser.email,
                bio: updatedUser.bio,
                birthDate: updatedUser.birthDate,
                favoriteTeam: updatedUser.favoriteTeam,
                avatar: updatedUser.avatar
            }
        });

    } catch (error) {
        console.error('ERROR EN BACKEND - Actualizar perfil:', error);

        if (error.name === 'ValidationError') {
             return res.status(400).json({ msg: `Error de formato de datos: ${error.message}` });
        }
        
        if (error.code === 11000) {
            return res.status(400).json({ msg: 'Ese email o nombre de usuario ya está en uso.' });
        }

        res.status(500).json({ msg: 'Error interno del servidor al actualizar el perfil.' });
    }
};