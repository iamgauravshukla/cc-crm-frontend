import React from 'react';
import './Loader.css';

function Loader({ message = 'Loading...' }) {
  return (
    <div className="modern-loader-container">
      <div className="modern-loader">
        <div className="loader-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <p className="loader-message">{message}</p>
      </div>
    </div>
  );
}

export default Loader;
