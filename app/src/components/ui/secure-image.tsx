import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { isTauri } from '@tauri-apps/api/core';
import { getApiClient } from '../../api/client';
import { cn } from '../../lib/utils';

interface SecureImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
}

export function SecureImage({ src, fallbackSrc, className, alt, ...props }: SecureImageProps) {
  // In native mode, start with empty string to prevent immediate 401/CORS error
  // which would trigger onError before the blob is fetched
  const isNativeMode = Capacitor.isNativePlatform() || isTauri();
  const [imageSrc, setImageSrc] = useState<string>(isNativeMode ? '' : src);
  const [isLoading, setIsLoading] = useState(true);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const isNative = Capacitor.isNativePlatform();
    const isTauriApp = isTauri();

    // If not native/Tauri, just use the src directly
    if (!isNative && !isTauriApp) {
      setImageSrc(src);
      setIsLoading(false);
      return;
    }

    // If native/Tauri, fetch as blob to bypass CORS
    
    // Cleanup previous object URL if exists
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    // Reset state for new src
    setImageSrc('');
    setIsLoading(true);

    const fetchImage = async () => {
      try {
        const client = getApiClient();
        const response = await client.get(src, { 
          responseType: 'blob' 
        });
        
        if (!isCancelled && response.data) {
          const blob = response.data as Blob;
          if (blob.size > 0) {
            const url = URL.createObjectURL(blob);
            // Store in ref so we can cleanup later
            objectUrlRef.current = url;
            setImageSrc(url);
          } else {
            // Empty blob, try original src
            setImageSrc(src);
          }
        }
      } catch (error) {
        console.error('Failed to fetch secure image:', src, error);
        if (!isCancelled) {
          // Fallback to original src if blob fetch fails
          setImageSrc(src);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchImage();

    return () => {
      isCancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    // Ignore errors that happen while we are explicitly loading the blob
    // This prevents the "No Image" placeholder from showing up prematurely
    if (isLoading && isNativeMode) return;

    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
    } else if (props.onError) {
      props.onError(e);
    }
  };

  // If loading in native mode, show a placeholder or nothing
  // This prevents the browser from trying to load an empty src or the remote src
  if (isLoading && isNativeMode) {
    return <div className={cn(className, "animate-pulse bg-muted flex items-center justify-center")} />;
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={cn(
        className,
        isLoading && "animate-pulse bg-muted"
      )}
      onError={handleError}
      {...props}
    />
  );
}
