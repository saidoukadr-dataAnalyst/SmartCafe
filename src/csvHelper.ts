import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Exports a CSV string as a file.
 * On native platforms, it writes to the cache directory and shares the file.
 * On web/desktop, it triggers a file download (or web sharing if supported).
 * Includes the UTF-8 BOM so Microsoft Excel can display accents and Arabic text correctly.
 */
export const exportCSV = async (csvContent: string, filename: string) => {
  try {
    if (Capacitor.isNativePlatform()) {
      // 1. Convert CSV content to base64
      // We prepend the UTF-8 BOM character (\uFEFF)
      const contentWithBOM = '\uFEFF' + csvContent;
      // Convert to base64 safely supporting UTF-8 characters (like Arabic or French accents)
      const base64Data = btoa(unescape(encodeURIComponent(contentWithBOM)));
      
      // 2. Write file to device cache directory
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
      });

      // 3. Share the file natively
      await Share.share({
        title: 'Rapport SmartCafe',
        text: `Veuillez trouver ci-joint le document CSV : ${filename}`,
        url: writeResult.uri,
        dialogTitle: 'Partager le fichier CSV avec',
      });
    } else {
      // Fallback for Web / Desktop
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
      const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
      const file = new File([blob], filename, { type: 'text/csv' });
      
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Rapport SmartCafe',
            text: `Veuillez trouver ci-joint le document : ${filename}`
          });
        } else {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        console.log('Partage web non supporté ou annulé, téléchargement classique...', err);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la génération du CSV :', error);
    alert('Une erreur est survenue lors de la création ou du partage du fichier CSV.');
  }
};
