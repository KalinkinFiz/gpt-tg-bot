import { rm } from 'fs/promises';

export async function removeFile(path) {
    try {
        await rm(path);
    } catch (e) {
        console.log('Error while removing file', e.message);
    }
}
