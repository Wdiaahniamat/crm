import api from '../api';

const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB

export const uploadWithTus = async (file, uniqueName) => {
  try {
    const fileSize = file.size;
    const finalUniqueName = uniqueName || file.name;

    if (fileSize <= CHUNK_SIZE) {
      // Small file, normal upload
      const formData = new FormData();
      formData.append('file', file, finalUniqueName);

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentage = ((progressEvent.loaded / progressEvent.total) * 100).toFixed(2);
            console.log(`Uploading ${file.name}: ${progressEvent.loaded}/${progressEvent.total} (${percentage}%)`);
          }
        },
      });

      if (res.data && res.data.url) {
        let fullUrl = res.data.url;
        if (fullUrl.startsWith('/')) {
          fullUrl = `${api.defaults.baseURL.replace('/api', '')}${fullUrl}`;
        }
        return fullUrl;
      }
      throw new Error('No URL returned from backend');
    }

    // Large file, chunked upload
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
    
    const chunkPromises = Array.from({ length: totalChunks }, (_, chunkIndex) => {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const chunk = file.slice(start, end);

      const chunkFileName = `${finalUniqueName}.part${chunkIndex + 1}`;
      
      const formData = new FormData();
      formData.append('file', chunk, chunkFileName);

      console.log(`Uploading chunk ${chunkIndex + 1}/${totalChunks} for ${file.name}`);
      return api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then(res => {
        if (res.data && res.data.url) {
          let fullUrl = res.data.url;
          if (fullUrl.startsWith('/')) {
            fullUrl = `${api.defaults.baseURL.replace('/api', '')}${fullUrl}`;
          }
          return { index: chunkIndex, url: fullUrl };
        } else {
          throw new Error(`No URL returned for chunk ${chunkIndex + 1}`);
        }
      });
    });

    const results = await Promise.all(chunkPromises);
    // Sort by index to maintain original order
    results.sort((a, b) => a.index - b.index);
    const chunkUrls = results.map(r => r.url);

    // Return the stringified array of chunk URLs
    return JSON.stringify(chunkUrls);

  } catch (err) {
    console.error('Upload failed:', err);
    throw err;
  }
};
