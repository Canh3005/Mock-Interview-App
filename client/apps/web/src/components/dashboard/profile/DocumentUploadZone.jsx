import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  uploadDocumentRequest,
  documentParseSuccess,
  documentParseFailure,
} from '../../../store/slices/profileSlice';
import { UploadCloud, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function DocumentUploadZone({ uploadType, onTypeChange }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { uploadingDoc, lastJobId, parsingDoc, parseResult, parseError } =
    useSelector((state) => state.profile);
  const accessToken = useSelector((state) => state.auth.accessToken);

  const inputRef = useRef(null);

  // SSE: open parse stream when a new jobId arrives
  useEffect(() => {
    if (!lastJobId || !accessToken) return;

    let done = false;
    const es = new EventSource(
      `${API_BASE_URL}/documents/jobs/${lastJobId}/stream?t=${accessToken}`,
    );

    es.onmessage = (e) => {
      if (done) return;
      done = true;
      es.close();
      try {
        const data = JSON.parse(e.data);
        if (data.type !== 'error') {
          dispatch(documentParseSuccess(data));
          toast.success(t('profile.toast.processingComplete'));
        } else {
          dispatch(documentParseFailure(data.message || t('profile.toast.unknownError')));
          toast.error(data.message || t('profile.toast.unknownError'));
        }
      } catch {
        dispatch(documentParseFailure(t('profile.toast.unknownError')));
      }
    };

    es.onerror = () => {
      if (done) return;
      done = true;
      es.close();
      dispatch(documentParseFailure(t('profile.toast.jobStatusFailed')));
      toast.error(t('profile.toast.jobStatusFailed'));
    };

    return () => {
      done = true;
      es.close();
    };
  }, [lastJobId, accessToken, dispatch, t]);

  const validateAndUpload = (file) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(t('profile.upload.errors.unsupportedType'));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t('profile.upload.errors.tooLarge'));
      return;
    }
    dispatch(uploadDocumentRequest({ file, type: uploadType }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) validateAndUpload(e.dataTransfer.files[0]);
  };

  const handleDrag = (e) => {
    e.preventDefault();
  };

  const isLoading = uploadingDoc || parsingDoc;

  return (
    <div className="space-y-2">
      {/* Type Selector */}
      <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900/40 p-1">
        {['CV', 'JD'].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onTypeChange(type)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              uploadType === type
                ? 'bg-cta text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {type === 'CV' ? t('profile.upload.cv') : t('profile.upload.jd')}
          </button>
        ))}
      </div>

      {/* Drop Zone */}
      <div
        className={`flex items-center justify-center w-full min-h-20 border border-dashed rounded-xl px-4 py-3 transition-all duration-200 ${
          isLoading
            ? 'opacity-60 pointer-events-none border-slate-600 bg-slate-800/50'
            : 'cursor-pointer border-slate-600 bg-slate-800/50 hover:border-cta/50 hover:bg-slate-800'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isLoading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && validateAndUpload(e.target.files[0])}
        />
        {isLoading ? (
          <div className="flex items-center gap-3 text-cta">
            <Loader2 size={24} className="animate-spin shrink-0" />
            <p className="text-sm font-medium">
              {uploadingDoc ? t('profile.upload.queueing') : t('profile.upload.analyzing')}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-slate-400 text-left">
            <UploadCloud size={24} className="text-slate-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-300">{t('profile.upload.dropTitle')}</p>
              <p className="text-xs mt-0.5">{t('profile.upload.maxSize')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Status */}
      {parseResult && !isLoading && (
        <div className="flex items-center gap-2 text-sm text-green-400 px-1">
          <CheckCircle2 size={15} />
          <span>
            {t('profile.upload.analysisComplete')}
            {' · '}
            <span className="text-slate-400">
              {parseResult.type === 'CV' ? parseResult.cvData?.name || 'CV' : parseResult.jdData?.role || 'JD'}
            </span>
          </span>
        </div>
      )}
      {parseError && !isLoading && (
        <div className="flex items-center gap-2 text-sm text-red-400 px-1">
          <XCircle size={15} />
          <span>{parseError}</span>
        </div>
      )}
    </div>
  );
}
