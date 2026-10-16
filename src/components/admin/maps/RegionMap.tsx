import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  GEO_MAP_COLORS,
  GEO_MAP_BG,
  GEO_MAP_NEUTRAL,
  GEO_MAP_BORDER,
  type GeoMapProps,
  type GeoPathsFile,
} from './geoMap';

interface RegionMapProps extends GeoMapProps {
  src: string;
  ariaLabel: string;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.35;

export function RegionMap({
  src,
  ariaLabel,
  jurisdictions = {},
  savingCodes,
  selectedCode = null,
  hoveredCode = null,
  focusTrigger = null,
  onJurisdictionClick,
  onJurisdictionHover,
  className = '',
}: RegionMapProps) {
  const [geo, setGeo] = useState<GeoPathsFile | null>(null);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const vbRef = useRef({ x: 0, y: 0, w: 1000, h: 500 });
  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragOrigin = useRef({ clientX: 0, clientY: 0, panX: 0, panY: 0 });
  const pathRefs = useRef<Map<string, SVGPathElement>>(new Map());
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setGeo(null);
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data: GeoPathsFile) => {
        if (!cancelled) {
          const [x, y, w, h] = data.viewBox.split(' ').map(Number);
          vbRef.current = { x, y, w, h };
          const initPan = { x, y };
          zoomRef.current = 1;
          panRef.current = initPan;
          setGeo(data);
          setZoom(1);
          setPan(initPan);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, [src]);

  // Cancel any in-flight animation on unmount.
  useEffect(() => {
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, []);

  const clamp = useCallback((x: number, y: number, z: number) => {
    const { x: vx, y: vy, w: vw, h: vh } = vbRef.current;
    const ew = vw / z;
    const eh = vh / z;
    return {
      x: Math.min(Math.max(x, vx), Math.max(vx, vx + vw - ew)),
      y: Math.min(Math.max(y, vy), Math.max(vy, vy + vh - eh)),
    };
  }, []);

  // Smooth eased animation between current pan/zoom and a target.
  const animateTo = useCallback((targetZoom: number, targetPan: { x: number; y: number }) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const startZoom = zoomRef.current;
    const startPan = { ...panRef.current };
    const duration = 380;
    const startTime = performance.now();
    const easeOut = (t: number) => 1 - (1 - t) ** 3;
    const step = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const e = easeOut(t);
      const z = startZoom + (targetZoom - startZoom) * e;
      const p = {
        x: startPan.x + (targetPan.x - startPan.x) * e,
        y: startPan.y + (targetPan.y - startPan.y) * e,
      };
      zoomRef.current = z;
      panRef.current = p;
      setZoom(z);
      setPan(p);
      if (t < 1) animFrameRef.current = requestAnimationFrame(step);
    };
    animFrameRef.current = requestAnimationFrame(step);
  }, []);

  // Animate to a region when focusTrigger changes.
  useEffect(() => {
    if (!focusTrigger || !geo) return;
    const pathEl = pathRefs.current.get(focusTrigger.code);
    if (!pathEl) return;
    const bbox = pathEl.getBBox();
    if (!bbox.width || !bbox.height) return;

    const { w: vbW, h: vbH } = vbRef.current;
    // Pad 35% on each side so the region doesn't fill edge-to-edge.
    const tw = bbox.width * 1.7;
    const th = bbox.height * 1.7;
    // Zoom between 1.5× and 5× — enough to always feel like movement but not
    // absurd for tiny island nations.
    const targetZoom = Math.min(Math.max(Math.min(vbW / tw, vbH / th), 1.5), 5);
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    const newEW = vbW / targetZoom;
    const newEH = vbH / targetZoom;
    const targetPan = clamp(cx - newEW / 2, cy - newEH / 2, targetZoom);
    animateTo(targetZoom, targetPan);
  }, [focusTrigger, geo, clamp, animateTo]);

  // Wheel zoom — passive:false so preventDefault stops page scroll.
  useEffect(() => {
    const el = svgRef.current;
    if (!el || !geo) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      const newZoom = Math.min(Math.max(zoomRef.current * factor, MIN_ZOOM), MAX_ZOOM);
      const rect = el.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;
      const { w: vw, h: vh } = vbRef.current;
      const curEW = vw / zoomRef.current;
      const curEH = vh / zoomRef.current;
      const vbMX = panRef.current.x + mx * curEW;
      const vbMY = panRef.current.y + my * curEH;
      const newEW = vw / newZoom;
      const newEH = vh / newZoom;
      const newPan = clamp(vbMX - mx * newEW, vbMY - my * newEH, newZoom);
      zoomRef.current = newZoom;
      panRef.current = newPan;
      setZoom(newZoom);
      setPan(newPan);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [geo, clamp]);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    isDragging.current = true;
    hasDragged.current = false;
    setDragging(true);
    dragOrigin.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: panRef.current.x,
      panY: panRef.current.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragOrigin.current.clientX;
    const dy = e.clientY - dragOrigin.current.clientY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged.current = true;
    const rect = svgRef.current!.getBoundingClientRect();
    const { w: vw, h: vh } = vbRef.current;
    const scaleX = (vw / zoomRef.current) / rect.width;
    const scaleY = (vh / zoomRef.current) / rect.height;
    const newPan = clamp(
      dragOrigin.current.panX - dx * scaleX,
      dragOrigin.current.panY - dy * scaleY,
      zoomRef.current,
    );
    panRef.current = newPan;
    setPan(newPan);
  };

  const stopDrag = () => {
    isDragging.current = false;
    setDragging(false);
  };

  const zoomTo = (newZoom: number) => {
    const clamped = Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM);
    const { w: vw, h: vh } = vbRef.current;
    const centerX = panRef.current.x + (vw / zoomRef.current) / 2;
    const centerY = panRef.current.y + (vh / zoomRef.current) / 2;
    const newEW = vw / clamped;
    const newEH = vh / clamped;
    const newPan = clamp(centerX - newEW / 2, centerY - newEH / 2, clamped);
    zoomRef.current = clamped;
    panRef.current = newPan;
    setZoom(clamped);
    setPan(newPan);
  };

  const resetView = () => {
    const { x, y } = vbRef.current;
    const initPan = { x, y };
    zoomRef.current = 1;
    panRef.current = initPan;
    setZoom(1);
    setPan(initPan);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Map failed to load.
      </div>
    );
  }
  if (!geo) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading map…
      </div>
    );
  }

  const { w: vw, h: vh } = vbRef.current;
  const effectiveW = vw / zoom;
  const effectiveH = vh / zoom;
  const currentViewBox = `${pan.x} ${pan.y} ${effectiveW} ${effectiveH}`;

  const fillFor = (code: string, jur: (typeof jurisdictions)[string] | undefined) => {
    if (!jur) return GEO_MAP_NEUTRAL;
    const hovered = hoveredCode === code;
    if (jur.overridden) return hovered ? GEO_MAP_COLORS.overriddenHover : GEO_MAP_COLORS.overridden;
    if (jur.enabled) return hovered ? GEO_MAP_COLORS.enabledHover : GEO_MAP_COLORS.enabled;
    return hovered ? GEO_MAP_COLORS.disabledHover : GEO_MAP_COLORS.disabled;
  };

  const isZoomed = zoom > 1.01;

  return (
    <div className={`relative w-full ${className}`}>
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => zoomTo(zoom * ZOOM_STEP)}
          disabled={zoom >= MAX_ZOOM}
          className="w-7 h-7 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white rounded text-base font-bold leading-none flex items-center justify-center"
          title="Zoom in"
        >+</button>
        <button
          type="button"
          onClick={() => zoomTo(zoom / ZOOM_STEP)}
          disabled={zoom <= MIN_ZOOM}
          className="w-7 h-7 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white rounded text-base font-bold leading-none flex items-center justify-center"
          title="Zoom out"
        >−</button>
        {isZoomed && (
          <button
            type="button"
            onClick={resetView}
            className="w-7 h-7 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs leading-none flex items-center justify-center"
            title="Reset view"
          >↺</button>
        )}
      </div>

      {isZoomed && (
        <div className="absolute bottom-2 left-2 z-10 text-xs text-gray-400 bg-gray-900/70 px-1.5 py-0.5 rounded pointer-events-none">
          {Math.round(zoom * 100)}%
        </div>
      )}

      <svg
        ref={svgRef}
        viewBox={currentViewBox}
        role="group"
        aria-label={ariaLabel}
        className={`w-full h-auto block rounded-md select-none ${
          dragging ? 'cursor-grabbing' : isZoomed ? 'cursor-grab' : ''
        }`}
        style={{ backgroundColor: GEO_MAP_BG }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
      >
        {geo.regions.map((region) => {
          const jur = jurisdictions[region.code];
          const interactive = Boolean(jur) && Boolean(onJurisdictionClick);
          const saving = savingCodes?.has(region.code) ?? false;

          const statusText = jur
            ? jur.overridden
              ? 'blocked by US restriction'
              : jur.enabled
                ? 'enabled'
                : 'disabled'
            : 'not managed';

          const handleClick = () => {
            if (!interactive || saving || hasDragged.current) return;
            onJurisdictionClick?.(region.code);
          };

          return (
            <path
              key={region.code}
              ref={(el) => {
                if (el) pathRefs.current.set(region.code, el);
                else pathRefs.current.delete(region.code);
              }}
              d={region.d}
              fill={fillFor(region.code, jur)}
              stroke={GEO_MAP_BORDER}
              strokeWidth={0.5}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={interactive ? `${region.name}: ${statusText}` : undefined}
              aria-pressed={interactive ? Boolean(jur?.enabled) : undefined}
              aria-busy={saving || undefined}
              className={`transition-opacity ${
                interactive && !isZoomed ? 'cursor-pointer' : ''
              } ${saving ? 'opacity-50 animate-pulse' : ''} focus:outline-none`}
              onClick={handleClick}
              onKeyDown={(e) => {
                if (!interactive) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClick();
                }
              }}
              onMouseEnter={() => onJurisdictionHover?.(region.code)}
              onMouseLeave={() => onJurisdictionHover?.(null)}
              onFocus={() => onJurisdictionHover?.(region.code)}
              onBlur={() => onJurisdictionHover?.(null)}
            >
              <title>{`${region.name} (${region.code}) — ${statusText}`}</title>
            </path>
          );
        })}
      </svg>
    </div>
  );
}

export default RegionMap;
