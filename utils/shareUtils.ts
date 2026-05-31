import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export const shareFile = async (blob: Blob, fileName: string, title: string) => {
    const safeFileName = fileName.replace(/[^\u0600-\u06FFa-zA-Z0-9._-]/g, '_');
    
    // 1. Check if running on Web (Standard browser)
    const isNative = Capacitor.isNativePlatform();
    
    if (!isNative) {
        // Standard Web Browser environment (like er055bf.github.io)
        try {
            const file = new File([blob], safeFileName, { type: 'application/pdf' });
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: title,
                });
                return;
            }
        } catch (webShareError) {
            console.warn('Web Share failed, falling back to download:', webShareError);
        }
        
        // Fallback to direct download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = safeFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
    }

    // 2. Native Platform (Capacitor)
    return new Promise<void>((resolve, reject) => {
        try {
            const reader = new FileReader();
            reader.readAsDataURL(blob);

            reader.onloadend = async () => {
                try {
                    const base64data = reader.result as string;
                    const base64Content = base64data.split(',')[1];

                    const result = await Filesystem.writeFile({
                        path: safeFileName,
                        data: base64Content,
                        directory: Directory.Cache,
                    });

                    await Share.share({
                        title: title,
                        files: [result.uri],
                    });

                    resolve();
                } catch (e) {
                    console.error('Error inside reader.onloadend:', e);
                    reject(e);
                }
            };

            reader.onerror = (error) => {
                console.error('Error reading blob:', error);
                reject(error);
            };

        } catch (error) {
            console.error('Share failed immediately:', error);
            reject(error);
        }
    });
};


