import React, { useState } from 'react';
import { Upload, X, CheckCircle2, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

interface SupabaseUploaderProps {
  bucketName: string;
  onUploadSuccess: (url: string) => void;
  onUploadError: (error: string) => void;
  acceptedFileTypes?: string;
  label?: string;
  maxSizeMB?: number;
}

export default function SupabaseUploader({
  bucketName,
  onUploadSuccess,
  onUploadError,
  acceptedFileTypes = '*/*',
  label = 'اسحب الملف هنا أو اضغط للاختيار',
  maxSizeMB = 100,
}: SupabaseUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      onUploadError(`حجم الملف يجب ألا يتجاوز ${maxSizeMB} ميجابايت`);
      return;
    }

    if (!supabase) {
      onUploadError('لم يتم إعداد Supabase (مفاتيح API مفقودة)');
      return;
    }

    try {
      setIsUploading(true);
      setProgress(10); // initial progress
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      setProgress(30);

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      setProgress(80);

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      setProgress(100);
      setUploadedUrl(publicUrlData.publicUrl);
      onUploadSuccess(publicUrlData.publicUrl);

    } catch (error: any) {
      console.error('Error uploading:', error.message);
      onUploadError(error.message || 'حدث خطأ أثناء رفع الملف');
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return (
    <div className="w-full">
      {!uploadedUrl ? (
        <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <input
            type="file"
            accept={acceptedFileTypes}
            onChange={handleFileChange}
            disabled={isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  جاري الرفع... {progress}%
                </p>
                <div className="w-full max-w-xs bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                  <div 
                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
                  <Upload className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">
                  {label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  الحد الأقصى: {maxSizeMB} MB
                </p>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-xl">
          <div className="flex items-center gap-2 overflow-hidden">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <span className="text-sm text-green-700 dark:text-green-300 truncate">
              تم الرفع بنجاح
            </span>
          </div>
          <button
            onClick={() => {
                setUploadedUrl(null);
                onUploadSuccess(''); // reset parent state
            }}
            className="p-1.5 hover:bg-green-100 dark:hover:bg-green-800 rounded-lg transition-colors text-green-700 dark:text-green-300"
            title="حذف واختيار ملف آخر"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
