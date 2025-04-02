import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Alert, Platform } from 'react-native';

interface PDFOptions {
  html: string;
  fileName: string;
  directory?: string;
}

export const PDFService = {
  /**
   * Asegura que el directorio existe, lo crea si no existe
   * @param directory Nombre del directorio dentro de documentDirectory
   */
  async ensureDirectoryExists(directory: string): Promise<string> {
    try {
      const docsDir = FileSystem.documentDirectory || '';
      const dirPath = `${docsDir}${directory}`;
      
      // Verificar si el directorio existe
      const dirInfo = await FileSystem.getInfoAsync(dirPath);
      
      // Si no existe, crearlo
      if (!dirInfo.exists) {
        console.log(`Creando directorio: ${dirPath}`);
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
      }
      
      return dirPath;
    } catch (error) {
      console.error('Error al crear directorio:', error);
      throw error;
    }
  },
  
  /**
   * Genera un PDF a partir de HTML usando APIs de Expo
   * @param options Opciones para generar PDF
   * @returns Ruta del archivo PDF generado
   */
  async generatePDF(options: PDFOptions): Promise<string> {
    try {
      console.log('Generando PDF usando expo-print...');
      
      // Crear PDF con expo-print
      const { uri } = await Print.printToFileAsync({
        html: options.html,
        base64: false
      });
      
      console.log('PDF temporal generado en:', uri);
      
      // Crear directorio si es necesario
      const baseDir = options.directory 
        ? await this.ensureDirectoryExists(options.directory)
        : FileSystem.documentDirectory;
      
      // Definir ruta de destino
      const destinationUri = `${baseDir}/${options.fileName}.pdf`;
      
      // Copiar el archivo temporal a la ubicación final
      await FileSystem.copyAsync({
        from: uri,
        to: destinationUri
      });
      
      console.log('PDF guardado en:', destinationUri);
      return destinationUri;
    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw error;
    }
  },
  
  /**
   * Comparte un archivo PDF
   * @param filePath Ruta del archivo PDF
   * @param title Título para el diálogo de compartir
   */
  async sharePDF(filePath: string, title: string = 'Compartir PDF'): Promise<void> {
    try {
      // Verificar si el archivo existe
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        throw new Error(`El archivo ${filePath} no existe`);
      }
      
      // Verificar si el dispositivo puede compartir
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert(
          'Compartir no disponible',
          'La función de compartir no está disponible en este dispositivo'
        );
        return;
      }
      
      // Compartir el archivo
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/pdf',
        dialogTitle: title,
        UTI: 'com.adobe.pdf' // Para iOS
      });
      
      console.log('PDF compartido exitosamente');
    } catch (error) {
      console.error('Error al compartir PDF:', error);
      Alert.alert('Error', 'No se pudo compartir el archivo PDF');
    }
  },

  /**
   * Elimina un archivo PDF
   * @param filePath Ruta del archivo PDF
   * @returns true si se eliminó correctamente
   */
  async deletePDF(filePath: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(filePath);
        console.log(`Archivo eliminado: ${filePath}`);
        return true;
      } else {
        console.log(`El archivo ${filePath} no existe, no es necesario eliminarlo`);
        return false;
      }
    } catch (error) {
      console.error('Error al eliminar PDF:', error);
      return false;
    }
  },

  /**
   * Lista todos los archivos PDF en un directorio
   * @param directory Nombre del directorio
   * @returns Array con las rutas de los archivos PDF
   */
  async listPDFs(directory: string = 'Documents'): Promise<string[]> {
    try {
      const dirPath = await this.ensureDirectoryExists(directory);
      const files = await FileSystem.readDirectoryAsync(dirPath);
      const pdfFiles = files
        .filter(file => file.endsWith('.pdf'))
        .map(file => `${dirPath}/${file}`);
      
      return pdfFiles;
    } catch (error) {
      console.error('Error al listar PDFs:', error);
      return [];
    }
  }
}; 