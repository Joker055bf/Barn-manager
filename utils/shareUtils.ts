import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

export const shareFile = async (blob: Blob, fileName: string, title: string) => {
    return new Promise<void>((resolve, reject) => {
        try {
            const reader = new FileReader();
            reader.readAsDataURL(blob);

            reader.onloadend = async () => {
                try {
                    const base64data = reader.result as string;
                    const base64Content = base64data.split(',')[1];
                    const safeFileName = fileName.replace(/[^\u0600-\u06FFa-zA-Z0-9._-]/g, '_');

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

