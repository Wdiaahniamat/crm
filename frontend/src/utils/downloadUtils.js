export const downloadFileFromDataUrl = async (dataUrl, fileName) => {
  if (!dataUrl) return;

  // Check if dataUrl is a stringified JSON array of chunks
  let isChunked = false;
  let chunkUrls = [];
  try {
    const parsed = JSON.parse(dataUrl);
    if (Array.isArray(parsed) && parsed.length > 0) {
      isChunked = true;
      chunkUrls = parsed;
    }
  } catch (e) {
    // Not a JSON array, treat as regular URL
  }

  try {
    if (isChunked) {
      console.log(`Downloading ${chunkUrls.length} chunks for ${fileName}...`);
      
      const chunkPromises = chunkUrls.map(async (url, i) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch chunk ${i + 1}`);
        return { index: i, blob: await res.blob() };
      });
      const results = await Promise.all(chunkPromises);
      results.sort((a, b) => a.index - b.index);
      const blobs = results.map(r => r.blob);
      
      const finalBlob = new Blob(blobs);
      const url = window.URL.createObjectURL(finalBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 100);

    } else {
      // Normal download
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
    }
  } catch (err) {
    console.error('Download failed, using fallback:', err);
    // fallback
    if (!isChunked) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('Failed to download chunked file. Please try again.');
    }
  }
};
