import React, { useRef, useEffect } from 'react';

/**
 * ScrollableTable
 * Wraps a scrollable table container and adds a mirrored scrollbar at the top
 * so users can scroll horizontally from either the top or bottom of the table.
 *
 * Usage:
 *   <ScrollableTable className="table-container">
 *     <table>...</table>
 *   </ScrollableTable>
 */
const ScrollableTable = ({ children, className = '', style }) => {
  const topBarRef  = useRef(null);
  const spacerRef  = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const topBar  = topBarRef.current;
    const content = contentRef.current;
    const spacer  = spacerRef.current;
    if (!topBar || !content || !spacer) return;

    // Keep spacer width in sync so top scrollbar range matches content
    const syncWidth = () => {
      spacer.style.width = content.scrollWidth + 'px';
    };
    syncWidth();

    const ro = new ResizeObserver(syncWidth);
    ro.observe(content);

    // Sync scroll positions
    const onTopScroll     = () => { content.scrollLeft = topBar.scrollLeft; };
    const onContentScroll = () => { topBar.scrollLeft  = content.scrollLeft; };

    topBar.addEventListener('scroll',  onTopScroll);
    content.addEventListener('scroll', onContentScroll);

    return () => {
      topBar.removeEventListener('scroll',  onTopScroll);
      content.removeEventListener('scroll', onContentScroll);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="dual-scroll-wrapper">
      {/* Top mirror scrollbar */}
      <div ref={topBarRef} className="dual-scroll-top">
        <div ref={spacerRef} style={{ height: 1 }} />
      </div>
      {/* Actual scrollable content */}
      <div ref={contentRef} className={className} style={style}>
        {children}
      </div>
    </div>
  );
};

export default ScrollableTable;
