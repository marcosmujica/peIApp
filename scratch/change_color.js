const { Jimp } = require('jimp');

async function processImage(inputPath, outputPath) {
    try {
        const image = await Jimp.read(inputPath);
        
        image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
            // idx is the index of the current pixel's R channel
            // The channels are RGBA: idx (R), idx+1 (G), idx+2 (B), idx+3 (A)
            
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];
            const a = this.bitmap.data[idx + 3];
            
            // Si el pixel no es transparente
            if (a > 0) {
                // Detectar si es azulado. En el logo de MercadoLibre o peiapp, el azul es prominente.
                // Si B es significativamente mayor que R y G.
                // O podemos buscar cualquier color oscuro y volverlo blanco.
                // El fondo del logo suele ser amarillo, y las manos azules.
                // Si B > R y B > G (color predominantemente azul)
                if (b > r + 20 && b > g + 20) {
                    // Cambiar a blanco puro
                    this.bitmap.data[idx + 0] = 255;
                    this.bitmap.data[idx + 1] = 255;
                    this.bitmap.data[idx + 2] = 255;
                }
                
                // Si el azul es muy oscuro, R, G, B pueden ser bajos, por ejemplo R=10, G=20, B=60.
                // La condición b > r+20 && b > g+20 debería capturarlo.
            }
        });

        await image.write(outputPath);
        console.log(`Guardado exitosamente: ${outputPath}`);
    } catch (err) {
        console.error(err);
    }
}

// Reemplazar icono principal
processImage(
    'c:\\trabajos\\test\\test13\\app\\assets\\icon.png', 
    'c:\\trabajos\\test\\test13\\app\\assets\\icon_white.png'
);
