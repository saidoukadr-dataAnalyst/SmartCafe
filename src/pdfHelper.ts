import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const exportPDF = async (doc: jsPDF, filename: string) => {
  try {
    if (Capacitor.isNativePlatform()) {
      // 1. Generate PDF as base64
      const pdfBase64 = doc.output('datauristring');
      // The output returns "data:application/pdf;filename=generated.pdf;base64,JVBERi0xLjMK..."
      const base64Data = pdfBase64.split(',')[1];
      
      // 2. Write file to device
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache, // Use Cache so we can easily share it
      });

      // 3. Share the file natively
      await Share.share({
        title: 'Facture / Rapport SmartCafe',
        text: `Veuillez trouver ci-joint le document : ${filename}`,
        url: writeResult.uri,
        dialogTitle: 'Partager le PDF avec',
      });
    } else {
      // Fallback for Web / Desktop (Electron handles its own via main.cjs will-download)
      doc.save(filename);
    }
  } catch (error) {
    console.error('Erreur lors de la génération du PDF :', error);
    alert('Une erreur est survenue lors de la création ou du partage du fichier PDF.');
  }
};
