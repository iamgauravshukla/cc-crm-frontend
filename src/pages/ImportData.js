import React, { useState, useRef } from 'react';
import { FiUploadCloud, FiFileText, FiCheckCircle, FiAlertCircle, FiX, FiInfo } from 'react-icons/fi';
import { importBookings } from '../services/api';
import Sidebar from '../components/Sidebar';
import './ImportData.css';

export default function ImportData() {
  const [file, setFile]         = useState(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus]     = useState('idle'); // idle | uploading | done | error
  const [result, setResult]     = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef();

  const pickFile = f => {
    if (!f) return;
    if (!/\.(xlsx|xls)$/i.test(f.name)) {
      setErrorMsg('Please select an .xlsx or .xls file.');
      return;
    }
    setFile(f);
    setResult(null);
    setErrorMsg('');
    setStatus('idle');
  };

  const onInputChange = e => pickFile(e.target.files?.[0]);

  const onDrop = e => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const onDragOver = e => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const clearFile = () => {
    setFile(null);
    setResult(null);
    setErrorMsg('');
    setStatus('idle');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus('uploading');
    setResult(null);
    setErrorMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await importBookings(fd);
      setResult(res.data);
      setStatus('done');
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Upload failed');
      setStatus('error');
    }
  };

  return (
    <div className="import-container">
      <Sidebar />
      <div className="import-main">

        <div className="import-header">
          <FiUploadCloud size={22} className="import-header-icon" />
          <div>
            <h1 className="import-title">Import Bookings</h1>
            <p className="import-subtitle">
              Append new rows from an Excel file — existing records are skipped automatically
            </p>
          </div>
        </div>

        <div className="import-body">

          {/* Info banner */}
          <div className="import-info-banner">
            <FiInfo size={15} />
            <span>
              Use the same <strong>MASTER_RECORDS</strong> sheet format as the master booking Excel.
              Only rows with a new <code>record_id</code> (column 38) will be inserted — duplicates
              are safely ignored.
            </span>
          </div>

          {/* Drop zone */}
          <div
            className={`import-dropzone${dragging ? ' dragging' : ''}${file ? ' has-file' : ''}`}
            onClick={() => !file && inputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={onInputChange}
            />

            {file ? (
              <div className="import-file-info">
                <FiFileText size={28} className="import-file-icon" />
                <div className="import-file-details">
                  <span className="import-file-name">{file.name}</span>
                  <span className="import-file-size">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <button
                  className="import-clear-btn"
                  onClick={e => { e.stopPropagation(); clearFile(); }}
                  title="Remove file"
                >
                  <FiX size={16} />
                </button>
              </div>
            ) : (
              <div className="import-drop-prompt">
                <FiUploadCloud size={40} className="import-drop-icon" />
                <p className="import-drop-text">Drag &amp; drop your Excel file here</p>
                <p className="import-drop-hint">or click to browse &nbsp;·&nbsp; .xlsx / .xls only</p>
              </div>
            )}
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="import-alert error">
              <FiAlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Upload button */}
          <button
            className="import-upload-btn"
            onClick={handleUpload}
            disabled={!file || status === 'uploading'}
          >
            {status === 'uploading' ? (
              <>
                <span className="import-spinner" />
                Importing…
              </>
            ) : (
              <>
                <FiUploadCloud size={16} />
                Import to Database
              </>
            )}
          </button>

          {/* Result summary */}
          {status === 'done' && result && (
            <div className="import-result">
              <div className="import-result-header">
                <FiCheckCircle size={18} className="import-result-icon" />
                <span>Import complete</span>
              </div>
              <div className="import-result-stats">
                <div className="import-stat total">
                  <span className="import-stat-value">{result.total?.toLocaleString()}</span>
                  <span className="import-stat-label">Total rows</span>
                </div>
                <div className="import-stat inserted">
                  <span className="import-stat-value">{result.inserted?.toLocaleString()}</span>
                  <span className="import-stat-label">Inserted</span>
                </div>
                <div className="import-stat skipped">
                  <span className="import-stat-value">{result.skipped?.toLocaleString()}</span>
                  <span className="import-stat-label">Skipped (duplicates)</span>
                </div>
                {result.errors > 0 && (
                  <div className="import-stat errors">
                    <span className="import-stat-value">{result.errors}</span>
                    <span className="import-stat-label">Errors</span>
                  </div>
                )}
              </div>
              {result.errDetails?.length > 0 && (
                <details className="import-err-details">
                  <summary>Show error details ({result.errDetails.length})</summary>
                  <ul>
                    {result.errDetails.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
