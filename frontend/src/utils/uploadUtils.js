import * as tus from 'tus-js-client';
import { supabaseUrl, supabaseKey, supabase } from '../supabaseClient';

export const uploadWithTus = (file, uniqueName) => {
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
        'x-upsert': 'true',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: 'crm-uploads',
        objectName: uniqueName,
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
      },
      chunkSize: 6 * 1024 * 1024, // 6MB chunks
      onError: function (error) {
        console.error('TUS upload failed:', error);
        reject(error);
      },
      onProgress: function (bytesUploaded, bytesTotal) {
        const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
        console.log(`Uploading ${file.name}: ${bytesUploaded}/${bytesTotal} (${percentage}%)`);
      },
      onSuccess: function () {
        console.log(`TUS upload complete for ${file.name}`);
        // Return public URL after success
        const { data } = supabase.storage.from('crm-uploads').getPublicUrl(uniqueName);
        resolve(data.publicUrl);
      },
    });

    // Check for previous uploads to resume
    upload.findPreviousUploads().then(function (previousUploads) {
      if (previousUploads.length > 0) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    }).catch((err) => {
      // If findPreviousUploads fails, try starting fresh
      console.warn('Failed to find previous uploads, starting fresh', err);
      upload.start();
    });
  });
};
