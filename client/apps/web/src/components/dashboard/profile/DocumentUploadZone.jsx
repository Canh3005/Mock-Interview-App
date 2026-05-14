import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { uploadDocumentRequest, resetPollingState } from '../../../store/slices/profileSlice';
import { UploadCloud, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import FitAssessmentSummary from './FitAssessmentSummary';

export default function DocumentUploadZone() {
  const dispatch = useDispatch();
  const { uploadingDoc, pollingStatus, pollingResult } = useSelector(state => state.profile);
  
  const [dragActive, setDragActive] = useState(false);
  const [uploadType, setUploadType] = useState('CV'); // 'CV' or 'JD'
  const inputRef = useRef(null);
  const hasFitScore =
    pollingResult?.fitScore !== null && pollingResult?.fitScore !== undefined;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const validateAndUpload = (file) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only PDF and DOCX files are supported.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than or equal to 5MB.');
      return;
    }

    dispatch(uploadDocumentRequest({ file, type: uploadType }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Type Selector */}
      <div className="flex gap-4 mb-2">
        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
          <input 
            type="radio" 
            name="docType" 
            value="CV" 
            checked={uploadType === 'CV'}
            onChange={() => setUploadType('CV')}
            className="text-cta focus:ring-cta bg-slate-800 border-slate-600"
          />
          Upload CV Profile
        </label>
        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
          <input 
            type="radio" 
            name="docType" 
            value="JD" 
            checked={uploadType === 'JD'}
            onChange={() => setUploadType('JD')}
            className="text-cta focus:ring-cta bg-slate-800 border-slate-600"
          />
          Upload Job Description (JD)
        </label>
      </div>

      {/* Drag & Drop Area */}
      <div 
        className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl transition-all duration-200 ${
          dragActive ? 'border-cta bg-cta/10' : 'border-slate-600 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800'
        } ${uploadingDoc ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
      >
        <input 
          ref={inputRef}
          type="file" 
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden" 
          onChange={handleChange}
        />
        
        {uploadingDoc ? (
          <div className="flex flex-col items-center text-cta">
            <Loader2 size={40} className="animate-spin mb-3" />
            <p className="font-semibold">{pollingStatus === 'waiting' ? 'Queueing document...' : 'AI is analyzing document (approx ~10s)...'}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-slate-400">
            <UploadCloud size={40} className="mb-3 text-slate-500 group-hover:text-cta transition-colors" />
            <p className="font-medium text-slate-300">Click or drag & drop a PDF or DOCX here</p>
            <p className="text-sm mt-1">Maximum file size 5MB.</p>
          </div>
        )}
      </div>

      {/* Result Area */}
      {pollingStatus === 'completed' && pollingResult && (
        <div className="mt-4 p-4 bg-green-900/20 border border-green-800/50 rounded-xl relative">
           <button 
             onClick={() => dispatch(resetPollingState())}
             className="absolute top-3 right-3 text-slate-400 hover:text-white"
           >
             <XCircle size={20} />
           </button>
           <div className="flex items-center gap-3 mb-3 text-green-400">
             <CheckCircle size={24} />
             <h3 className="font-semibold text-lg">Analysis Complete!</h3>
           </div>
           
           {pollingResult.type === 'CV' && (
             <p className="text-slate-300 text-sm">
               Your CV has been successfully processed. Look at the Profile Information below to see your extracted Data!
             </p>
           )}

           {pollingResult.type === 'JD' && hasFitScore && (
             <div className="mt-4 space-y-4">
               <div>
                  <h4 className="text-white font-medium mb-1">Fit Score Requirement</h4>
                  <div className="w-full bg-slate-800 rounded-full h-4 relative overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-cta h-4 rounded-full"
                      style={{ width: `${pollingResult.fitScore}%` }}
                    />
                  </div>
                  <p className="text-end text-sm text-cta font-bold mt-1">{pollingResult.fitScore}% Match</p>
               </div>
               
               <FitAssessmentSummary summary={pollingResult.fitAssessmentSummary} />
             </div>
           )}

           {pollingResult.type === 'JD' && !hasFitScore && (
             <p className="text-slate-300 text-sm">
               {pollingResult.missingSources?.includes('cv_context')
                 ? 'Your JD has been processed. Upload a CV to generate the fit breakdown for this role.'
                 : 'Your JD has been processed, but the fit breakdown could not be generated yet. Please try again later.'}
             </p>
           )}
        </div>
      )}
    </div>
  );
}
