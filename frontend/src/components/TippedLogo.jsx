import React, { useRef, useState, useEffect, useId } from 'react';

/**
 * TIPped Official Brand Logo Component (Shadow-Removed Brand Specification)
 * 
 * Brand Guidelines Specification:
 * - Center location pin with Honey (#FDE68A) to Ember (#D97706) linear gradient.
 * - Dot and stem forming a person and the letter 'i' inside the pin in Midnight (#0F172A).
 * - Four Amber (#F59E0B) focus brackets framing the issue like a camera finding focus.
 * - Clear space maintained equal to the width of the pin's head circle (32px relative).
 * - Minimum size 32px on screen. Below that, drop the brackets and render the pin alone.
 * - Shadow removed from brand mark per updated guidelines.
 */
export default function TippedLogo({
  className = '',
  size,
  height,
  width,
  showWordmark = true,
  withTile = false,
  ...props
}) {
  const containerRef = useRef(null);
  const [isBelow32, setIsBelow32] = useState(false);
  const uniqueId = useId().replace(/:/g, '');
  const gradientId = `tippedPinGrad-${uniqueId}`;

  // Evaluate explicit size prop and dynamically observe rendering dimensions
  useEffect(() => {
    const explicitDimension = Number(size || height);
    if (explicitDimension && explicitDimension > 0) {
      setIsBelow32(explicitDimension < 32);
      return;
    }

    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const measuredHeight = entry.contentRect.height;
        if (measuredHeight > 0) {
          setIsBelow32(measuredHeight < 32);
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [size, height]);

  // Drop brackets below 32px
  const dropBrackets = isBelow32 || (size && size < 32) || (height && height < 32);

  const viewBox = showWordmark ? "0 0 1180 400" : "0 0 400 400";
  const renderHeight = height || size || (showWordmark ? "40" : "32");

  return (
    <div
      ref={containerRef}
      className={`tipped-logo-container inline-flex items-center select-none ${className}`.trim()}
      style={{
        padding: '0 4px',
        margin: '0',
      }}
      {...props}
    >
      <svg
        className={`tipped-logo-svg ${dropBrackets ? 'logo-compact' : ''}`}
        viewBox={viewBox}
        height={renderHeight}
        width={width}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="TIPped Logo"
      >
        <defs>
          {/* Honey (#FDE68A) to Ember (#D97706) Pin Linear Gradient */}
          <linearGradient id={gradientId} x1="0.1" y1="0.05" x2="0.9" y2="0.95">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>

        {/* Optional Brand Tile Background (Midnight #0F172A) */}
        {withTile && (
          <rect width="400" height="400" rx="40" fill="#0F172A" />
        )}

        {/* Mark Group: Exact Vector Paths from Official Shadow-Removed Brand SVG */}
        <g className="tipped-mark-group">
          {/* Four Amber (#F59E0B) Focus Brackets (dropped below 32px) */}
          {!dropBrackets && (
            <g
              className="tipped-logo-brackets"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="22"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path className="corner-tl" d="M66 140V76a10 10 0 0 1 10-10h64" />
              <path className="corner-tr" d="M260 66h64a10 10 0 0 1 10 10v64" />
              <path className="corner-bl" d="M66 260v64a10 10 0 0 0 10 10h64" />
              <path className="corner-br" d="M260 334h64a10 10 0 0 0 10-10v-64" />
            </g>
          )}

          {/* Location Pin with Honey-to-Ember Gradient (Shadow Removed) */}
          <path
            className="tipped-pin-body"
            d="M200 92C154 92 118 128 118 174c0 52 56 100 82 126 26-26 82-74 82-126 0-46-36-82-82-82z"
            fill={`url(#${gradientId})`}
          />

          {/* Student / lowercase 'i' inside pin in Midnight (#0F172A) */}
          <g transform="translate(0 -4)" fill="#0F172A">
            <circle cx="200" cy="154" r="15" />
            <path d="M180 238V204a20 20 0 0 1 40 0v34a8 8 0 0 1-8 8h-24a8 8 0 0 1-8-8z" />
          </g>
        </g>

        {/* Wordmark: Bricolage Grotesque ExtraBold with Clear Space equal to pin head circle */}
        {showWordmark && (
          <text
            x="410"
            y="272"
            fontFamily="'Bricolage Grotesque', sans-serif"
            fontSize="210"
            fontWeight="800"
            letterSpacing="-6"
            className="tipped-wordmark"
          >
            <tspan fill="#F59E0B">TIP</tspan>
            <tspan className="fill-[#0F172A] dark:fill-[#F8FAFC]" fill="currentColor">
              ped
            </tspan>
          </text>
        )}
      </svg>
    </div>
  );
}
