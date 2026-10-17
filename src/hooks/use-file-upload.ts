import { useMutation } from '@tanstack/react-query';
import { platformApi } from '@/sdk/core/request';

/**
 * Request body for generating a presigned S3 upload URL
 */
export interface PresignedUrlRequest {
  fileName: string;
  contentType: string;
}

/**
 * Response from the presigned URL endpoint
 */
export interface PresignedUrlResponse {
  success: boolean;
  presignedUrl: string;
  realFileUrl: string;
  fileKey: string;
  expiresIn: number;
}

/**
 * Options for the complete file upload process
 */
export interface FileUploadOptions {
  file: File;
  onProgress?: (progress: number) => void;
}

/**
 * Result of the complete file upload process
 */
export interface FileUploadResult {
  fileUrl: string;
  fileKey: string;
}

/**
 * Hook to generate presigned URLs for S3 uploads
 *
 * This is step 1 of the two-step upload process:
 * 1. Call this endpoint to get a presigned URL
 * 2. Use the presigned URL to upload the file directly to S3
 *
 * @example
 * const { mutateAsync: generatePresignedUrl } = useGeneratePresignedUrl();
 * const response = await generatePresignedUrl({
 *   fileName: 'document.pdf',
 *   contentType: 'application/pdf'
 * });
 */
export function useGeneratePresignedUrl() {
  return useMutation({
    mutationFn: async (request: PresignedUrlRequest): Promise<PresignedUrlResponse> => {
      const response = await platformApi.post(
        '/main/official-api/presign-s3-upload',
        request,
        {
          headers: {
            'X-CREAO-API-NAME': 'CreaoFileUpload',
            'X-CREAO-API-PATH': '/main/official-api/presign-s3-upload',
            'X-CREAO-API-ID': '68b68b97ac476c8df7efbeaf',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to generate presigned URL' }));
        throw new Error(error.message || 'Failed to generate presigned URL');
      }

      return response.json();
    },
  });
}

/**
 * Upload a file to S3 using a presigned URL
 * This is step 2 of the two-step upload process
 *
 * @param presignedUrl - The presigned URL from step 1
 * @param file - The file to upload
 * @param contentType - The MIME type of the file
 * @param onProgress - Optional callback for upload progress
 */
async function uploadToS3(
  presignedUrl: string,
  file: File,
  contentType: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete);
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was aborted'));
    });

    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.send(file);
  });
}

/**
 * Hook for the complete file upload process
 *
 * This hook handles both steps of the upload process:
 * 1. Generate a presigned URL from the API
 * 2. Upload the file directly to S3 using the presigned URL
 *
 * @example
 * const { mutateAsync: uploadFile, isPending } = useFileUpload();
 *
 * const handleUpload = async (file: File) => {
 *   const result = await uploadFile({
 *     file,
 *     onProgress: (progress) => console.log(`Upload progress: ${progress}%`)
 *   });
 *   console.log('File uploaded to:', result.fileUrl);
 * };
 */
export function useFileUpload() {
  const { mutateAsync: generatePresignedUrl } = useGeneratePresignedUrl();

  return useMutation({
    mutationFn: async (options: FileUploadOptions): Promise<FileUploadResult> => {
      const { file, onProgress } = options;

      // Step 1: Generate presigned URL
      const presignedResponse = await generatePresignedUrl({
        fileName: file.name,
        contentType: file.type,
      });

      // Step 2: Upload to S3
      await uploadToS3(
        presignedResponse.presignedUrl,
        file,
        file.type,
        onProgress
      );

      // Return the final file URL and key
      return {
        fileUrl: presignedResponse.realFileUrl,
        fileKey: presignedResponse.fileKey,
      };
    },
  });
}
