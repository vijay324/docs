/**
 * Utility functions for file downloads
 */


import { apiClient } from '@/lib/api';

export interface DownloadOptions {
  filename?: string;
  showProgress?: boolean;
  onProgress?: (progress: number) => void;
  onError?: (error: string) => void;
  onSuccess?: () => void;
  forceDownload?: boolean; // Force download instead of opening in browser
}

export interface PreviewOptions {
  onError?: (error: string) => void;
  onSuccess?: () => void;
  preferEmbedded?: boolean; // Whether to prefer embedded preview over new tab
}

/**
 * Downloads a file from a URL with proper filename and progress tracking
 */
export async function downloadFile(url: string, options: DownloadOptions = {}) {
  const {
    filename,
    showProgress = false,
    onProgress,
    onError,
    onSuccess,
    forceDownload = true
  } = options;

  try {
    // For signed URLs from cloud storage, try direct download first (faster)
    if (forceDownload && isSignedUrl(url)) {
      try {
        await downloadViaDirectLink(url, { filename, onSuccess, onError });
        return;
      } catch (directError) {
        console.log('Direct download failed, trying blob method:', directError);
        // Fallback to blob method if direct download fails
        await downloadFileAsBlob(url, { filename, showProgress, onProgress, onError, onSuccess });
        return;
      }
    }

    // For other URLs or when not forcing download, fetch as blob
    if (forceDownload) {
      await downloadFileAsBlob(url, { filename, showProgress, onProgress, onError, onSuccess });
      return;
    }

    // Fallback: Direct link (may open in browser for some file types)
    const link = document.createElement('a');
    link.href = url;
    if (filename) {
      link.download = filename;
    }
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('Download started:', filename || 'file');
    onSuccess?.();
  } catch (error) {
    console.error('Download error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Download failed';
    console.error('Download failed:', errorMessage);
    onError?.(errorMessage);
  }
}

/**
 * Checks if a URL is a signed URL from cloud storage
 */
function isSignedUrl(url: string): boolean {
  return url.includes('amazonaws.com') ||
         url.includes('cloudflare') ||
         url.includes('r2.cloudflarestorage.com') ||
         url.includes('X-Amz-Signature') ||
         url.includes('Signature=');
}

/**
 * Downloads a file via direct link (for signed URLs)
 */
async function downloadViaDirectLink(url: string, options: DownloadOptions = {}) {
  const { filename, onSuccess, onError } = options;

  console.log('Starting download...', filename || 'file');

  // Create a direct download link
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'download';
  link.style.display = 'none';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';

  // Add event listeners to detect if download started
  let downloadStarted = false;

  const handleFocus = () => {
    downloadStarted = true;
    console.log('Download started:', filename || 'File');
    onSuccess?.();
  };

  const handleBlur = () => {
    // Window lost focus, likely due to download dialog
    downloadStarted = true;
  };

  window.addEventListener('focus', handleFocus);
  window.addEventListener('blur', handleBlur);

  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Check if download started after a short delay
  setTimeout(() => {
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('blur', handleBlur);

    if (!downloadStarted) {
      console.log('Download initiated:', filename || 'File');
      onSuccess?.();
    }
  }, 2000);
}

/**
 * Downloads a file via the backend stream endpoint (avoids CORS and forces download)
 */
async function downloadViaStream(fileId: string, options: DownloadOptions = {}) {
  const { filename, onSuccess, onError } = options;

  console.log('Downloading...', filename || 'file');

  try {
    // Use the API client to make authenticated request to stream endpoint
    const response = await apiClient.get(`/files/${fileId}/stream`, {
      responseType: 'blob' // Important: get response as blob
    });

    // Create blob from response
    const blob = response.data;

    // Create download link with blob URL
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    link.style.display = 'none';

    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up blob URL after a short delay
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);

    console.log('Download completed:', filename || 'File');

    onSuccess?.();
  } catch (error) {
    console.error('Stream download error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Stream download failed';
    onError?.(errorMessage);
    throw error; // Re-throw to allow fallback
  }
}

/**
 * Downloads a file by fetching it as a blob (forces download)
 */
async function downloadFileAsBlob(url: string, options: DownloadOptions = {}) {
  const {
    filename,
    showProgress = false,
    onProgress,
    onError,
    onSuccess
  } = options;

  try {
    console.log('Downloading...', filename || 'file');

    // Fetch the file with progress tracking
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit' // Don't send credentials for signed URLs
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      received += value.length;

      if (showProgress && total > 0) {
        const progress = (received / total) * 100;
        onProgress?.(progress);
      }
    }

    // Combine chunks into a single Uint8Array
    const blob = new Blob(chunks as BlobPart[]);

    // Create download link with forced download MIME type
    const downloadBlob = new Blob([blob], { type: 'application/octet-stream' });
    const downloadUrl = URL.createObjectURL(downloadBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    link.style.display = 'none';

    // Force download by setting additional attributes
    link.setAttribute('download', filename || 'download');
    link.setAttribute('target', '_self');

    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the object URL after a short delay
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);

    console.log('Download completed:', filename || 'File');
    onSuccess?.();
  } catch (error) {
    console.error('Download error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Download failed';
    console.error('Download failed:', errorMessage);
    onError?.(errorMessage);
  }
}

/**
 * Downloads a file using the backend API endpoint
 */
// Track active downloads to prevent duplicates
const activeDownloads = new Set<string>();

export async function downloadFileFromApi(fileId: string, options: DownloadOptions = {}) {
  const { onError, onSuccess, forceDownload = true } = options;

  // Prevent duplicate downloads for the same file
  if (activeDownloads.has(fileId)) {
    return;
  }

  activeDownloads.add(fileId);

  try {
    console.log('Preparing download...');

    // Use the API client which includes authentication
    const response = await apiClient.get(`/files/${fileId}/download`);

    if (!response.data.success) {
      throw new Error('Failed to get download URL');
    }

    const downloadData = response.data.data;

    if (!downloadData.downloadUrl) {
      throw new Error('No download URL received');
    }

    // For forced downloads, prioritize methods based on URL type
    if (forceDownload) {
      let downloadSuccessful = false;

      // For S3 signed URLs, use direct link first (bypasses CORS)
      if (isSignedUrl(downloadData.downloadUrl)) {
        try {
          await downloadViaDirectLink(downloadData.downloadUrl, {
            filename: downloadData.filename,
            onSuccess: () => {
              downloadSuccessful = true;
            },
            onError: (error) => {
              console.log('Direct link download failed:', error);
            }
          });

          if (downloadSuccessful) {
            console.log('Download started:', downloadData.filename || 'File');

            onSuccess?.();
            activeDownloads.delete(fileId);
            return;
          }
        } catch (directError) {
          console.log('Direct link method failed, trying alternatives:', directError);
        }
      }

      // Try stream method (works for backend-proxied downloads)
      if (!downloadSuccessful) {
        try {
          await downloadViaStream(fileId, {
            ...options,
            filename: downloadData.filename
          });

          downloadSuccessful = true;

          console.log('Download completed:', downloadData.filename || 'File');

          onSuccess?.();
          activeDownloads.delete(fileId);
          return;
        } catch (streamError) {
          console.log('Stream download failed:', streamError);
        }
      }

      // Fallback: direct link for non-signed URLs
      if (!downloadSuccessful) {
        const link = document.createElement('a');
        link.href = downloadData.downloadUrl;
        link.download = downloadData.filename || 'download';
        link.style.display = 'none';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('Download started:', downloadData.filename || 'File');

        onSuccess?.();
        activeDownloads.delete(fileId);
        return;
      }
    } else {
      // If not forcing download (preview mode), use the signed URL directly
      await downloadFile(downloadData.downloadUrl, {
        ...options,
        filename: downloadData.filename,
        forceDownload
      });

      onSuccess?.();
      activeDownloads.delete(fileId); // Clean up before return
    }
  } catch (error) {
    console.error('API download error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Download failed';
    console.error('Download failed:', errorMessage);
    onError?.(errorMessage);
  } finally {
    // Always clean up the active download tracking
    activeDownloads.delete(fileId);
  }
}

/**
 * Opens a file for preview using the most reliable method available
 */
export async function previewFileFromApi(fileId: string, options: PreviewOptions = {}) {
  const { onError, onSuccess, preferEmbedded = false } = options;

  try {
    // Use the new view endpoint for better browser viewing experience
    const response = await apiClient.get(`/files/${fileId}/view`);

    if (!response.data.success) {
      throw new Error('Failed to get preview URL');
    }

    const viewData = response.data.data;

    if (!viewData.viewUrl) {
      throw new Error('No preview URL received');
    }

    // Try different preview methods based on file type and user preference
    const success = await tryPreviewMethods(viewData.viewUrl, viewData.filename, {
      preferEmbedded,
      onSuccess,
      onError
    });

    if (!success) {
      throw new Error('All preview methods failed. Please try downloading the file instead.');
    }

  } catch (error) {
    console.error('API preview error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Preview failed';
    console.error('Preview failed:', errorMessage);
    onError?.(errorMessage);
  }
}

/**
 * Tries multiple methods to open a file for preview
 */
async function tryPreviewMethods(
  url: string,
  filename: string,
  options: {
    preferEmbedded?: boolean;
    onSuccess?: () => void;
    onError?: (error: string) => void;
  }
): Promise<boolean> {
  const { preferEmbedded = false, onSuccess, onError } = options;

  // Method 1: Try direct navigation (most reliable, but replaces current tab)
  if (preferEmbedded) {
    try {
      window.location.href = url;
      console.log('Preview opened:', filename);
      onSuccess?.();
      return true;
    } catch (error) {
      console.log('Direct navigation failed:', error);
    }
  }

  // Method 2: Try creating a link and clicking it (most compatible)
  try {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';

    // Add to DOM temporarily
    document.body.appendChild(link);

    // Trigger click - this should work even with popup blockers
    // since it's a direct user-initiated action
    link.click();

    // Clean up
    document.body.removeChild(link);

    // Give it a moment to process
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('Preview opened:', filename);
    onSuccess?.();
    return true;
  } catch (error) {
    console.log('Link click method failed:', error);
  }

  // Method 3: Try window.open as fallback
  try {
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');

    if (newWindow) {
      console.log('Preview opened:', filename);
      onSuccess?.();
      return true;
    } else {
      throw new Error('Popup blocked');
    }
  } catch (error) {
    console.log('Window.open method failed:', error);
  }

  // Method 4: Try iframe approach for certain file types
  try {
    const fileExtension = getFileExtension(filename).toLowerCase();
    const previewableInIframe = ['pdf', 'txt', 'html', 'jpg', 'jpeg', 'png', 'gif', 'svg'];

    if (previewableInIframe.includes(fileExtension)) {
      // Create a modal with iframe
      createPreviewModal(url, filename);

      console.log('Preview opened:', filename);
      onSuccess?.();
      return true;
    }
  } catch (error) {
    console.log('Iframe method failed:', error);
  }

  return false;
}

/**
 * Creates a modal with iframe for file preview
 */
function createPreviewModal(url: string, filename: string) {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  `;

  // Create modal content
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white;
    border-radius: 8px;
    width: 90%;
    height: 90%;
    max-width: 1200px;
    max-height: 800px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;

  // Create header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 16px 20px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f9fafb;
  `;

  const title = document.createElement('h3');
  title.textContent = filename;
  title.style.cssText = `
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #111827;
  `;

  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
  `;
  closeButton.onmouseover = () => closeButton.style.background = '#f3f4f6';
  closeButton.onmouseout = () => closeButton.style.background = 'none';

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.style.cssText = `
    flex: 1;
    border: none;
    width: 100%;
  `;

  // Assemble modal
  header.appendChild(title);
  header.appendChild(closeButton);
  modal.appendChild(header);
  modal.appendChild(iframe);
  overlay.appendChild(modal);

  // Close handlers
  const closeModal = () => {
    document.body.removeChild(overlay);
  };

  closeButton.onclick = closeModal;
  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };

  // Escape key handler
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  // Add to DOM
  document.body.appendChild(overlay);
}

/**
 * Downloads multiple files as a ZIP (if supported by backend)
 */
export async function downloadMultipleFiles(fileIds: string[], options: DownloadOptions = {}) {
  // For now, download files individually
  // TODO: Implement ZIP download if backend supports it
  for (const fileId of fileIds) {
    await downloadFileFromApi(fileId, options);
    // Add small delay between downloads to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

/**
 * Gets file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
}

/**
 * Validates if a file can be downloaded based on its type
 */
export function canDownloadFile(mimeType: string): boolean {
  // Most files can be downloaded, but we might want to restrict some types
  const restrictedTypes = [
    'application/x-executable',
    'application/x-msdownload'
  ];

  return !restrictedTypes.includes(mimeType.toLowerCase());
}

/**
 * Determines if a file can be previewed in the browser
 */
export function canPreviewFile(mimeType: string, filename: string): boolean {
  const lowerMimeType = mimeType.toLowerCase();
  const lowerFilename = filename.toLowerCase();

  // Image types that browsers can display
  const previewableImages = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp'
  ];

  // Document types that browsers can display
  const previewableDocuments = [
    'application/pdf',
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'text/xml',
    'application/xml'
  ];

  // Video types that browsers can play
  const previewableVideos = [
    'video/mp4',
    'video/webm',
    'video/ogg'
  ];

  // Audio types that browsers can play
  const previewableAudio = [
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/mpeg'
  ];

  // Check by MIME type
  if (previewableImages.includes(lowerMimeType) ||
      previewableDocuments.includes(lowerMimeType) ||
      previewableVideos.includes(lowerMimeType) ||
      previewableAudio.includes(lowerMimeType)) {
    return true;
  }

  // Check by file extension as fallback
  const extension = getFileExtension(lowerFilename);
  const previewableExtensions = [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp',
    'pdf', 'txt', 'html', 'css', 'js', 'json', 'xml',
    'mp4', 'webm', 'ogg', 'mp3', 'wav'
  ];

  return previewableExtensions.includes(extension);
}

/**
 * Gets the appropriate preview type for a file
 */
export function getPreviewType(mimeType: string, filename: string): 'image' | 'document' | 'video' | 'audio' | 'unknown' {
  const lowerMimeType = mimeType.toLowerCase();

  if (lowerMimeType.startsWith('image/')) return 'image';
  if (lowerMimeType.startsWith('video/')) return 'video';
  if (lowerMimeType.startsWith('audio/')) return 'audio';
  if (lowerMimeType === 'application/pdf' || lowerMimeType.startsWith('text/')) return 'document';

  return 'unknown';
}

/**
 * Formats download progress for display
 */
export function formatDownloadProgress(progress: number, total?: number): string {
  if (total) {
    return `${Math.round(progress)}% (${formatBytes(progress * total / 100)} / ${formatBytes(total)})`;
  }
  return `${Math.round(progress)}%`;
}

/**
 * Formats bytes to human readable string
 */
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
