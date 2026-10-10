import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Lightbulb, X } from 'lucide-react';
import './CampusMap.css';
import TippedLogo from '../TippedLogo';
import {
  CAMPUS_PLACES,
  CAMPUS_VIEWS,
  BUILDING_CODES,
  OPEN_AREA_PLACES,
  formatLocationString
} from '../../constants/campusData';

const getParentPlaceId = (id) =>
  ['cli', 'ces', 'sec'].includes(id)
    ? 'PE'
    : ['Canteen', 'Study Area', 'can'].includes(id)
      ? 'sta'
      : id;

const NAMED_PLACE_IDS = {
  Security: 'sec',
  Clinic: 'cli',
  CES: 'ces',
  'PE Center Annex': 'ann',
  Annex: 'ann',
  'Casal Garden': 'gar',
  'Student Hub': 'hub',
  HUB: 'hub',
  'Study Area': 'sta',
  Canteen: 'can'
};

const CampusMap = ({
  mode = 'picker',
  defaultLocation = '',
  onSelect = () => {},
  onLocationSelect = () => {}
}) => {
  const [campus, setCampus] = useState('Casal');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [mobileProTipOpen, setMobileProTipOpen] = useState(false);

  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const vbRef = useRef({ x: 0, y: 0, w: 1200, h: 900 });
  const ptrRef = useRef(new Map());
  const pdRef = useRef(0);
  const movedRef = useRef(0);

  const applyViewBox = useCallback(() => {
    if (svgRef.current) {
      const { x, y, w, h } = vbRef.current;
      svgRef.current.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
    }
  }, []);

  const getTargetViewBox = useCallback((cx, cy, w) => {
    const cw = svgRef.current?.clientWidth || 1000;
    const ch = svgRef.current?.clientHeight || 750;
    const h = (w * ch) / cw;
    const isDesktop = cw > 720;
    return {
      x: cx + (isDesktop ? (340 / cw) * (w / 2) : 0) - w / 2,
      y: cy + (isDesktop ? 0 : h * 0.18) - h / 2,
      w,
      h
    };
  }, []);

  const flyTo = useCallback(
    (target) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const start = { ...vbRef.current };
      const startTime = performance.now();

      const step = (now) => {
        let progress = Math.min(1, (now - startTime) / 650);
        progress = 1 - Math.pow(1 - progress, 3);
        for (const dim of ['x', 'y', 'w', 'h']) {
          vbRef.current[dim] = start[dim] + (target[dim] - start[dim]) * progress;
        }
        applyViewBox();
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step);
        }
      };

      rafRef.current = requestAnimationFrame(step);
    },
    [applyViewBox]
  );

  const zoomAt = useCallback(
    (px, py, factor) => {
      const svg = svgRef.current;
      if (!svg) return;
      const cw = svg.clientWidth || 1;
      const ch = svg.clientHeight || 1;
      const nw = Math.min(2600, Math.max(260, vbRef.current.w * factor));
      const nh = (nw * ch) / cw;
      vbRef.current.x += (px / cw) * (vbRef.current.w - nw);
      vbRef.current.y += (py / ch) * (vbRef.current.h - nh);
      vbRef.current.w = nw;
      vbRef.current.h = nh;
      applyViewBox();
    },
    [applyViewBox]
  );

  const calculateBoundingBox = useCallback((place) => {
    if (!place) return { cx: 600, cy: 450, w: 1000 };
    if (place.g) return { cx: place.x || 600, cy: place.y || 450, w: 40 };
    if (!place.pts || typeof place.pts !== 'string') {
      const cx = Array.isArray(place.l) ? place.l[0] : 600;
      const cy = Array.isArray(place.l) ? place.l[1] : 450;
      return { cx, cy, w: 60 };
    }
    const numbers = place.pts.trim().split(/[\s,]+/).map(Number).filter((n) => !isNaN(n));
    if (numbers.length < 2) return { cx: 600, cy: 450, w: 60 };
    const xs = numbers.filter((_, i) => i % 2 === 0);
    const ys = numbers.filter((_, i) => i % 2 !== 0);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    return {
      cx: isNaN(x0) || isNaN(x1) ? 600 : (x0 + x1) / 2,
      cy: isNaN(y0) || isNaN(y1) ? 450 : (y0 + y1) / 2,
      w: Math.max(100, isNaN(x0) || isNaN(x1) ? 200 : x1 - x0, isNaN(y0) || isNaN(y1) ? 200 : y1 - y0)
    };
  }, []);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage('');
    }, 2600);
  }, []);

  const pickPlace = useCallback(
    (id, floorNum, noFly = false) => {
      if (!id) {
        setSelectedPlace(null);
        setSelectedPlaceId(null);
        setSelectedFloor(null);
        return;
      }

      setMobileProTipOpen(false);

      const targetId = NAMED_PLACE_IDS[id] || (id === 'cha' ? 'PC12' : id);
      const targetFloor = id === 'cha' ? 1 : floorNum;

      const place = CAMPUS_PLACES.find((p) => p.id === targetId);
      if (!place) {
        setSelectedPlace(null);
        setSelectedPlaceId(null);
        setSelectedFloor(null);
        return;
      }

      setSelectedPlace(place);
      setSelectedPlaceId(
        id === 'Canteen' || id === 'Study Area' ? id : targetId
      );
      const floors = place.fl ? Object.keys(place.fl).map(Number) : [];
      const resolvedFloor = place.fl
        ? targetFloor && place.fl[targetFloor]
          ? Number(targetFloor)
          : (floors.length > 0 ? floors[0] : 1)
        : null;
      setSelectedFloor(resolvedFloor);
      setCampus(place.c || 'Casal');

      if (!noFly) {
        const bbox = calculateBoundingBox(place);
        flyTo(getTargetViewBox(bbox.cx, bbox.cy, Math.max(bbox.w * 2.6, 480)));
      }
    },
    [calculateBoundingBox, flyTo, getTargetViewBox]
  );

  const pick = pickPlace;
  const setCamp = useCallback(
    (c) => {
      setCampus(c);
      if (CAMPUS_VIEWS[c]) {
        flyTo(getTargetViewBox(...CAMPUS_VIEWS[c]));
      }
    },
    [flyTo, getTargetViewBox]
  );
  const fly = (target) => {
    if (Array.isArray(target)) {
      flyTo(getTargetViewBox(...target));
    } else {
      flyTo(target);
    }
  };

  const handleReport = () => {
    if (!selectedPlace) return;
    const pickedPlaceId = selectedPlaceId || selectedPlace.id;
    const confirmedPlaceId = getParentPlaceId(pickedPlaceId);
    const confirmedPlace = CAMPUS_PLACES.find((place) => place.id === confirmedPlaceId) || selectedPlace;
    const dropdownBuildings = {
      F: "Founder's (F)",
      C: 'Building 2 (C)',
      A: 'Arlegui (A)',
      PC5: 'PC 5',
      PC12: 'PC 12',
      PE: 'PE Center',
      ann: 'PE Center Annex',
      hub: 'Student Hub',
      sta: 'Study Area / Canteen',
      gar: 'Casal Garden',
      con: 'Congregating Area'
    };
    const subAreaNames = {
      cli: 'Clinic',
      ces: 'CES',
      sec: 'Security',
      Canteen: 'Canteen',
      'Study Area': 'Study Area'
    };
    const building = dropdownBuildings[confirmedPlaceId] || confirmedPlace.n;
    const specificArea = subAreaNames[pickedPlaceId] ||
      (['F', 'C', 'A', 'PC5', 'PC12', 'PE'].includes(confirmedPlaceId)
        ? building
        : confirmedPlace.n);
    const locationPayload = {
      building,
      specificArea,
      campus: confirmedPlace.c || campus,
      floor: selectedFloor || 1
    };
    const formattedLocation = `${specificArea}, Floor ${locationPayload.floor}, ${locationPayload.campus} Campus`;
    if (typeof onLocationSelect === 'function') {
      onLocationSelect(locationPayload);
    }
    if (typeof onSelect === 'function') {
      onSelect(locationPayload);
    }
    window.dispatchEvent(new CustomEvent('tip:location', { detail: formattedLocation }));
    try {
      navigator.clipboard.writeText(formattedLocation);
    } catch (err) {
      // Ignore clipboard write restrictions
    }
    showToast(`Location ready: ${formattedLocation}`);
  };

  const handleCampusSwitch = (c) => {
    if (mode === 'readonly') return;
    pickPlace(null);
    setCampus(c);
    flyTo(getTargetViewBox(...CAMPUS_VIEWS[c]));
  };

  // Pointer & Gesture navigation
  const handlePointerDown = (e) => {
    ptrRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    movedRef.current = 0;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const handlePointerMove = (e) => {
    const p = ptrRef.current.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;

    const svg = svgRef.current;
    if (!svg) return;
    const cw = svg.clientWidth || 1;
    const ch = svg.clientHeight || 1;

    if (ptrRef.current.size === 1) {
      movedRef.current += Math.abs(dx) + Math.abs(dy);
      if (movedRef.current > 5) {
        if (!isDragging) setIsDragging(true);
        vbRef.current.x -= (dx * vbRef.current.w) / cw;
        vbRef.current.y -= (dy * vbRef.current.h) / ch;
        applyViewBox();
      }
    } else if (ptrRef.current.size === 2) {
      const [a, b] = [...ptrRef.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = svg.getBoundingClientRect();
      movedRef.current = 99;
      if (pdRef.current) {
        zoomAt((a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top, pdRef.current / dist);
      }
      pdRef.current = dist;
    }
  };

  const handlePointerUp = (e) => {
    ptrRef.current.delete(e.pointerId);
    pdRef.current = 0;
    setIsDragging(false);
  };

  const handleSvgClick = (e) => {
    if (mode === 'readonly') return;
    if (movedRef.current > 5) return;
    const target = e.target.closest('[data-id]');
    if (target) {
      const id = target.getAttribute('data-id');
      if (id === 'cha') {
        pick('PC12');
      } else if (id === 'can') {
        pick('Canteen');
      } else if (id === 'sta') {
        pick('Study Area');
      } else {
        pick(id);
      }
    } else {
      pick(null);
    }
  };

  const handleElementKeyDown = (e, id) => {
    if (mode === 'readonly') return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (id === 'cha') {
        pick('PC12');
      } else if (id === 'can') {
        pick('Canteen');
      } else if (id === 'sta') {
        pick('Study Area');
      } else {
        pick(id);
      }
    }
  };

  // Wheel zoom listener (non-passive to prevent scroll propagation)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e) => {
      e.preventDefault();
      zoomAt(e.offsetX, e.offsetY, e.deltaY > 0 ? 1.12 : 0.89);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  // Initial ViewBox setup & ResizeObserver
  useEffect(() => {
    const initialView = getTargetViewBox(...CAMPUS_VIEWS.Casal);
    vbRef.current = { ...initialView };
    applyViewBox();

    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      const cw = svgRef.current?.clientWidth || 0;
      const ch = svgRef.current?.clientHeight || 0;
      if (cw > 10 && ch > 10) {
        vbRef.current.h = (vbRef.current.w * ch) / cw;
        applyViewBox();
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [applyViewBox, getTargetViewBox]);

  // Admin Auto-Pan & Parsing Hook
  useEffect(() => {
    if (mode !== 'readonly' || typeof defaultLocation !== 'string') return;

    const location = defaultLocation.trim();
    if (!location) {
      setCampus('Casal');
      setSelectedPlace(null);
      setSelectedPlaceId(null);
      setSelectedFloor(null);
      flyTo(getTargetViewBox(...CAMPUS_VIEWS.Casal));
      return;
    }

    const locationCampus = /\barlegui\b/i.test(location) ? 'Arlegui' : 'Casal';
    setCamp(locationCampus);

    try {
      let placeId = null;
      let floor = null;
      const normalizedLocation = location.toLowerCase();

      if (normalizedLocation.includes('security')) {
        placeId = 'Security';
      } else if (normalizedLocation.includes('clinic')) {
        placeId = 'Clinic';
      } else if (/\bces\b/i.test(normalizedLocation)) {
        placeId = 'CES';
      } else if (/\b(?:PE\s+Center\s+)?Annex\b/i.test(location)) {
        placeId = 'PE Center Annex';
      } else if (/\bCasal\s+Garden\b/i.test(location)) {
        placeId = 'Casal Garden';
      } else if (/\b(?:Student\s+Hub|HUB)\b/i.test(location)) {
        placeId = 'Student Hub';
      } else if (/\bStudy\s+Area\b/i.test(location)) {
        placeId = 'Study Area';
      } else if (/\bCanteen\b/i.test(location)) {
        placeId = 'Canteen';
      } else if (/\bCongregating\s+Area\b/i.test(location)) {
        placeId = 'con';
      } else if (/\b(?:common area|open area)\b/i.test(location)) {
        placeId = null;
      } else if (/\bchapel\b/i.test(location)) {
        placeId = 'cha';
      } else {
        const arleguiRoom = location.match(
          /\b(?:A\s*[-–—]\s*|Arlegui(?:\s+Campus)?[\s\-–—]+)(\d)(?:\d{2}|XX)\b/i
        );
        const casalRoom = location.match(
          /\b(?:Building\s*2|C)\s*[-–—]?\s*(\d)\s*(?:\d{2}|XX)\b/i
        );
        const codedRoom = location.match(
          /\b(PC\s*[-–—]?\s*12|PC\s*[-–—]?\s*5|PE|F|C|A)[\s\-–—]*(\d)\s*(?:\d{2}|XX)\b/i
        );
        const floorMatch = location.match(/\b(?:Floor|Flr)\s*(\d+)\b/i) ||
          location.match(/\bA\s*[-–—]\s*(\d)\b/i);

        if (arleguiRoom) {
          placeId = 'A';
          floor = Number(arleguiRoom[1]);
        } else if (casalRoom) {
          placeId = 'C';
          floor = Number(casalRoom[1]);
        } else if (codedRoom) {
          const code = codedRoom[1].toUpperCase().replace(/[\s\-–—]/g, '');
          placeId = code === 'PC12' ? 'PC12' : code === 'PC5' ? 'PC5' : code;
          floor = Number(codedRoom[2]);
        } else if (/\b(?:building\s*2|C)\b/i.test(location)) {
          placeId = 'C';
        } else if (/\b(?:PC\s*[-–—]?\s*12)\b/i.test(location)) {
          placeId = 'PC12';
        } else if (/\b(?:PC\s*[-–—]?\s*5)\b/i.test(location)) {
          placeId = 'PC5';
        } else if (/\b(?:PE\s+Center|Physical\s+Education\s+Center|PE)\b/i.test(location)) {
          placeId = 'PE';
        } else if (/\b(?:Founder'?s(?:\s+Building)?|F\s+Building|F)\b/i.test(location)) {
          placeId = 'F';
        } else if (
          /\bArlegui(?:\s+Campus)?\b/i.test(location) ||
          /\bA\s*[-–—]\s*(?:\d{3}|\d)\b/i.test(location)
        ) {
          placeId = 'A';
        }

        if (placeId && floorMatch) floor = Number(floorMatch[1]);
      }

      const targetId = placeId ? NAMED_PLACE_IDS[placeId] || placeId : null;
      const target = targetId ? CAMPUS_PLACES.find((place) => place.id === targetId) : null;
      const timeoutId = setTimeout(() => {
        if (target) {
          pick(placeId, floor || undefined);
        } else {
          pick(null);
        }
      }, 150);
      return () => clearTimeout(timeoutId);
    } catch (err) {
      console.error('Failed to parse defaultLocation or auto-pan:', err);
      setCampus('Casal');
      setSelectedPlace(null);
      setSelectedFloor(null);
      setSelectedPlaceId(null);
      if (CAMPUS_VIEWS.Casal) {
        flyTo(getTargetViewBox(...CAMPUS_VIEWS.Casal));
      }
    }
  }, [mode, defaultLocation, pick, setCamp, flyTo, getTargetViewBox]);

  // Global keydown (Escape closes panel)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (mode !== 'readonly' && e.key === 'Escape' && selectedPlace) {
        pickPlace(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, selectedPlace, pickPlace]);

  // Cleanup animation frame and timeout on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  return (
    <div
      className="relative w-full h-full min-h-[500px] bg-slate-900 flex overflow-hidden campus-map-wrapper flex-col"
      ref={containerRef}
    >
      {/* Top Header Bar */}
      <div className="campus-map-bar">
        <div className="campus-map-brand">
          <TippedLogo size={32} showWordmark={false} className="h-8 w-8" />
          <span>T.I.P. Manila</span>
        </div>

        <div className="campus-map-seg" role="group" aria-label="Campus selector">
          <button
            id="b-Casal"
            type="button"
            className={campus === 'Casal' ? 'on' : ''}
            onClick={() => handleCampusSwitch('Casal')}
            disabled={mode === 'readonly'}
          >
            Casal
          </button>
          <button
            id="b-Arlegui"
            type="button"
            className={campus === 'Arlegui' ? 'on' : ''}
            onClick={() => handleCampusSwitch('Arlegui')}
            disabled={mode === 'readonly'}
          >
            Arlegui
          </button>
        </div>
      </div>

      {/* Interactive Campus SVG Canvas */}
      <svg
        ref={svgRef}
        id="map"
        className={`campus-map-svg ${isDragging ? 'drg' : ''} ${selectedPlace ? 'has' : ''}`}
        viewBox="0 0 1200 900"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={mode === 'readonly' ? undefined : handleSvgClick}
      >
        {/* Grounds */}
        <polygon
          className="gd"
          points="180,755 423,150 730,150 757,203 835,508 832,750 895,752 1040,845 1048,965 822,915 635,852 465,815 335,795"
        />

        {/* Roads */}
        <polyline
          className="rd"
          strokeWidth="40"
          strokeLinejoin="round"
          points="1203,55 1265,1000 1330,1250 1490,1880"
        />
        <polyline
          className="rd"
          strokeWidth="85"
          points="-60,762 1285,1067"
        />

        {/* Street Labels */}
        <text className="rl" dy="7" transform="translate(560 903) rotate(12.8)">
          P. CASAL ST.
        </text>
        <text className="rl" dy="7" transform="translate(1299 1130) rotate(75.4)">
          ARLEGUI ST.
        </text>
        <text className="rl" dy="7" transform="translate(1444 1700) rotate(75.8)">
          ARLEGUI ST.
        </text>

        {/* Non-gate places */}
        {CAMPUS_PLACES.filter((p) => !p.g).map((p) => {
          const renderedPlace = p.id === 'sec'
            ? { ...p, pts: '772,462 820,462 820,500 772,500', l: [796, 481] }
            : p;
          const isSelected =
            selectedPlaceId === p.id ||
            (p.id === 'can' && selectedPlaceId === 'Canteen') ||
            (p.id === 'sta' && selectedPlaceId === 'Study Area') ||
            (selectedPlace?.id === 'PC12' && p.id === 'cha');
          const lines = (p.t || p.n).split('|');
          const handleSelectPlace = (event) => {
            if (mode === 'readonly') return;
            event.stopPropagation();
            if (p.id === 'cha') {
              pick('PC12');
            } else if (p.id === 'can') {
              pick('Canteen');
            } else if (p.id === 'sta') {
              pick('Study Area');
            } else {
              pick(p.id);
            }
          };
          return (
            <g
              key={p.id}
              className={`p ${p.o ? 'o' : ''} ${isSelected ? 'sel' : ''}`}
              data-id={p.id}
              tabIndex={mode === 'readonly' ? -1 : 0}
              role="button"
              aria-label={p.n}
              aria-disabled={mode === 'readonly'}
              onClick={mode === 'readonly' ? undefined : handleSelectPlace}
              onKeyDown={(e) => {
                if (mode === 'readonly') return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectPlace();
                }
              }}
            >
              <polygon
                points={renderedPlace.pts}
                style={p.id === 'can'
                  ? {
                    fill: selectedPlaceId === 'Canteen' ? '#FBBF24' : '#1E293B',
                    opacity: 1
                  }
                  : undefined}
              />
              <text
                className="lb"
                x={renderedPlace.l[0]}
                y={renderedPlace.l[1] + 6}
                style={{
                  pointerEvents: 'none',
                  ...(p.id === 'sec' ? { fontSize: '10px' } : {})
                }}
              >
                {lines.map((text, i) => (
                  <tspan
                    key={i}
                    x={renderedPlace.l[0]}
                    dy={i ? 21 : -(lines.length - 1) * 10.5}
                  >
                    {text}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}

        {/* Gates */}
        {CAMPUS_PLACES.filter((p) => p.g).map((p) => {
          const isSelected = selectedPlace?.id === p.id;
          return (
            <g
              key={p.id}
              className={`gate ${isSelected ? 'sel' : ''}`}
              data-id={p.id}
              tabIndex={mode === 'readonly' ? -1 : 0}
              role="button"
              aria-label={p.n}
              aria-disabled={mode === 'readonly'}
              onKeyDown={mode === 'readonly' ? undefined : (e) => handleElementKeyDown(e, p.id)}
            >
              <circle className="ring" cx={p.x} cy={p.y} r="16" />
              <rect
                x={p.x - 31}
                y={p.y - 12}
                width="62"
                height="24"
                rx="6"
              />
              <text x={p.x} y={p.y + 5}>
                {p.t || p.n.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Zoom / View Controls */}
      <div className="campus-map-zc">
        <button
          id="zi"
          type="button"
          onClick={() =>
            zoomAt(
              (svgRef.current?.clientWidth || 1000) / 2,
              (svgRef.current?.clientHeight || 750) / 2,
              0.7
            )
          }
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          id="zo"
          type="button"
          onClick={() =>
            zoomAt(
              (svgRef.current?.clientWidth || 1000) / 2,
              (svgRef.current?.clientHeight || 750) / 2,
              1.4
            )
          }
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          id="zr"
          type="button"
          onClick={() => {
            pickPlace(null);
            flyTo(getTargetViewBox(...CAMPUS_VIEWS[campus]));
          }}
          aria-label="Reset map view"
        >
          ↺
        </button>
      </div>

      {/* Floating Lightbulb Button for Mobile (Constraint 1) */}
      {!selectedPlace && (
        <button
          type="button"
          onClick={() => setMobileProTipOpen((prev) => !prev)}
          className="campus-map-lightbulb-btn md:hidden"
          aria-label="Toggle Pro Tip"
        >
          <Lightbulb size={20} className="text-amber-500" />
          <span>Pro Tip</span>
        </button>
      )}

      {/* Side Panel (Desktop) / Bottom Sheet (Mobile) */}
      <div
        className={`campus-map-panel ${
          !selectedPlace
            ? mobileProTipOpen
              ? 'mobile-protip-open'
              : 'mobile-protip-hidden'
            : ''
        }`}
        id="pn"
      >
        {!selectedPlace ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div className="campus-map-k" style={{ margin: 0 }}>T.I.P.ian pro tip</div>
              {mode !== 'readonly' && (
                <button
                  type="button"
                  className="campus-map-x mobile-only-close"
                  onClick={() => setMobileProTipOpen(false)}
                  aria-label="Close Pro Tip"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="campus-map-rc">
              <div>
                <span style={{ color: 'var(--map-acc)' }}>F</span>
                <i>Building</i>
              </div>
              <span>-</span>
              <div>
                <span style={{ color: '#0EA5E9' }}>3</span>
                <i>Floor</i>
              </div>
              <div>
                <span>06</span>
                <i>Room</i>
              </div>
            </div>
            <div className="campus-map-k">Building codes</div>
            <div className="campus-map-cl">
              {BUILDING_CODES.map(([id, code, desc]) => {
                const place = CAMPUS_PLACES.find((x) => x.id === id);
                if (!place) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => pickPlace(id)}
                    disabled={mode === 'readonly'}
                    aria-label={`Select ${place.n}`}
                  >
                    <b>{code}</b>
                    <span>
                      {place.n}
                      {desc && <small> {desc}</small>}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="campus-map-k" style={{ marginTop: '16px' }}>Open Area</div>
            <div className="campus-map-cl">
              {OPEN_AREA_PLACES.map(([id, label]) => {
                const place = CAMPUS_PLACES.find((x) => x.id === id);
                if (!place) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => pickPlace(id)}
                    disabled={mode === 'readonly'}
                    aria-label={`Select ${label}`}
                  >
                    <b>OA</b>
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            <div className="campus-map-k" style={{ marginTop: '16px' }}>Student Hub</div>
            <div className="campus-map-cl">
              <button
                type="button"
                onClick={() => pickPlace('Student Hub')}
                disabled={mode === 'readonly'}
                aria-label="Select Student Hub"
              >
                <b>HUB</b>
                <span>Student Hub</span>
              </button>
            </div>
          </>
        ) : (
          <>
            {mode !== 'readonly' && (
              <button
                type="button"
                className="campus-map-x"
                onClick={() => pickPlace(null)}
                aria-label="Close details"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}

            <div className="campus-map-k">
              {selectedPlace?.k ?? 'Location'} · {selectedPlace?.c ?? campus} Campus
            </div>
            <h2 className="campus-map-title">{selectedPlace?.n ?? 'Selected Location'}</h2>
            {selectedPlace?.code && (
              <span className="campus-map-pill">Code {selectedPlace.code}</span>
            )}
            {selectedPlace?.d && (
              <span className="campus-map-pill">{selectedPlace.d}</span>
            )}

            {selectedPlace.fl && Object.keys(selectedPlace.fl).length > 0 && (
              <>
                <div className="campus-map-fl" role="tablist" aria-label="Floor">
                  {Object.keys(selectedPlace.fl).map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={+f === selectedFloor ? 'on' : ''}
                      onClick={() => setSelectedFloor(+f)}
                      disabled={mode === 'readonly'}
                      aria-label={`Floor ${f}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="campus-map-k">
                  Floor {selectedFloor || 1} ·{' '}
                  {selectedPlace.code
                    ? `${selectedPlace.code}-${selectedFloor || 1}xx`
                    : `Floor ${selectedFloor || 1}`}
                </div>
                <ul className="campus-map-ul">
                  {((selectedFloor ? selectedPlace.fl[selectedFloor] : Object.values(selectedPlace.fl)[0]) || []).map((office, idx) => (
                    <li key={idx} className="campus-map-li">
                      {office}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Role-Aware: MUST NOT render or exist in DOM if readonly */}
            {mode !== 'readonly' && (
              <button
                type="button"
                className="campus-map-rep"
                onClick={handleReport}
              >
                {mode === 'picker' ? 'Select Location' : 'Report an issue here'}
              </button>
            )}
          </>
        )}
      </div>

      {/* Floating toast notification */}
      {toastMessage && (
        <div className="campus-map-toast" id="toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default CampusMap;
