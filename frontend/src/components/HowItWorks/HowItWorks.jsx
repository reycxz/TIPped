import styles from './HowItWorks.module.css';
import {
  MAP_LABELS,
  MAP_SHAPES,
  OFFICES,
  PRIVACY_ITEMS,
  STEPS,
} from '../../constants/howItWorksData';
import { useMapDemo } from './hooks/useMapDemo';
import { useReveal } from './hooks/useReveal';
import { useRouteDemo } from './hooks/useRouteDemo';
import { useStepScene } from './hooks/useStepScene';

const mapShapeStyles = {
  mg: styles.mapGround,
  mr: styles.mapRoad,
  mb: styles.mapBuilding,
  o: styles.mapOpenArea,
};

const routeIconPaths = [
  'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z',
  'M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z',
  'M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z',
];

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function MapPinBadge() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export default function HowItWorks() {
  const stepScene = useStepScene();
  const routeDemo = useRouteDemo();
  const mapDemo = useMapDemo();
  const revealOne = useReveal();
  const revealTwo = useReveal();
  const revealThree = useReveal();
  const revealFour = useReveal();

  return (
    <section id="how-it-works" className={styles.root}>
      <div className={styles.inner}>
        <article ref={revealOne.ref} className={`${styles.section} ${revealOne.isVisible ? styles.in : ''}`}>
          <p className={styles.kicker}>Three taps</p>
          <h2>That's the whole thing.</h2>
          <div className={styles.stageCard}>
            <svg viewBox="0 0 300 220" role="img" aria-label="Three tap flow illustration">
              <defs>
                <linearGradient id="hiw-g2" x1=".1" y1=".05" x2=".9" y2=".95">
                  <stop offset="0" stopColor="#FDE68A" />
                  <stop offset="1" stopColor="#D97706" />
                </linearGradient>
              </defs>
              <g className={`${styles.scene} ${stepScene.activeIndex === 0 ? styles.sceneOn : ''}`} aria-hidden="true">
                <g key={`hiw-bracket-${stepScene.iconSeed}`} className={`${styles.bk} ${styles.tick}`}>
                  <g className={styles.fb} fill="none" stroke="#F59E0B" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M92 76V56a8 8 0 0 1 8-8h20" fill="none" stroke="#F59E0B" />
                    <path d="M180 48h20a8 8 0 0 1 8 8v20" fill="none" stroke="#F59E0B" />
                    <path d="M92 150v20a8 8 0 0 0 8 8h20" fill="none" stroke="#F59E0B" />
                    <path d="M180 178h20a8 8 0 0 0 8-8v-20" fill="none" stroke="#F59E0B" />
                  </g>
                </g>
                <g transform="translate(108 71) scale(3.5)">
                  <g className={`${styles.ip} ${stepScene.iconSeed ? styles.pop : ''}`} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path
                      key={`${stepScene.currentIcon.path}-${stepScene.iconSeed}`}
                      d={stepScene.currentIcon.path}
                      fill="none"
                      stroke={stepScene.currentIcon.color}
                    />
                  </g>
                </g>
              </g>
              <g className={`${styles.scene} ${stepScene.activeIndex === 1 ? styles.sceneOn : ''}`} aria-hidden="true">
                <rect x="76" y="80" width="148" height="96" rx="20" fill="none" stroke="var(--hiw-ink, #F1F5F9)" strokeWidth="8" />
                <path d="M118 80l8-18h48l8 18" fill="none" stroke="var(--hiw-ink, #F1F5F9)" strokeWidth="8" strokeLinejoin="round" />
                <circle cx="150" cy="128" r="28" fill="none" stroke="#F59E0B" strokeWidth="8" />
                <circle className={styles.lens} cx="150" cy="128" r="12" fill="#F59E0B" />
                <circle cx="204" cy="100" r="5" fill="#FDE68A" />
                <rect className={styles.flash} x="-20" y="-20" width="340" height="260" fill="#FFFFFF" opacity="0" />
              </g>
              <g className={`${styles.scene} ${stepScene.activeIndex === 2 ? styles.sceneOn : ''}`} aria-hidden="true">
                <ellipse className={styles.rp} cx="150" cy="180" rx="10" ry="4" fill="none" stroke="#F59E0B" strokeWidth="3" />
                <ellipse className={`${styles.rp} ${styles.b}`} cx="150" cy="180" rx="10" ry="4" fill="none" stroke="#F59E0B" strokeWidth="3" />
                <g className={styles.pd}>
                  <path d="M150 40c-30 0-52 22-52 50 0 34 34 62 52 80 18-18 52-46 52-80 0-28-22-50-52-50z" fill="url(#hiw-g2)" />
                  <circle cx="150" cy="84" r="10" fill="#0F172A" />
                  <path d="M135 128v-22a15 15 0 0 1 30 0v22z" fill="#0F172A" />
                </g>
              </g>
            </svg>
          </div>
          <div className={styles.tabs} role="tablist" aria-label="Three tap steps">
            {STEPS.map((step, index) => (
              <button
                key={`${step.label}-${index === stepScene.activeIndex ? stepScene.progressKey : 'idle'}`}
                type="button"
                role="tab"
                aria-label={step.label}
                aria-selected={index === stepScene.activeIndex}
                className={`${styles.tab} ${index === stepScene.activeIndex ? styles.active : ''}`}
                onClick={() => {
                  stepScene.restartProgress();
                  stepScene.setActiveIndex(index);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {index === 0 && (
                    <>
                      <path d={routeIconPaths[0]} />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                  {index === 1 && (
                    <>
                      <path d={routeIconPaths[1]} />
                      <circle cx="12" cy="13" r="3.5" />
                    </>
                  )}
                  {index === 2 && (
                    <>
                      <path d={routeIconPaths[2]} />
                      <circle cx="12" cy="10" r="2.5" />
                    </>
                  )}
                </svg>
                <span>{step.label}</span>
                <span
                  className={styles.progressSignal}
                  aria-hidden="true"
                  onAnimationEnd={(event) => {
                    if (event.target === event.currentTarget && index === stepScene.activeIndex) {
                      stepScene.setActiveIndex((index + 1) % STEPS.length);
                    }
                  }}
                />
              </button>
            ))}
          </div>
        </article>

        <article ref={revealTwo.ref} className={`${styles.section} ${revealTwo.isVisible ? styles.in : ''}`}>
          <p className={styles.kicker}>Smart routing</p>
          <h2>Straight to the right office.</h2>
          <div className={styles.routingWrap}>
            <svg viewBox="0 0 560 380" role="img" aria-label="Smart routing office map">
              <defs>
                <linearGradient id="hiw-route-pin" x1="0.1" y1="0.05" x2="0.9" y2="0.95">
                  <stop offset="0" stopColor="#FDE68A" />
                  <stop offset="1" stopColor="#D97706" />
                </linearGradient>
              </defs>
              {OFFICES.map((office, index) => {
                const y = 34 + index * 62;
                return (
                  <path
                    key={office.name}
                    ref={(node) => {
                      routeDemo.pathRefs.current[index] = node;
                    }}
                    d={`M134 ${190 + (y - 190) * 0.09} C 210 ${190 + (y - 190) * 0.09}, 236 ${y}, 318 ${y}`}
                    fill="none"
                    stroke={index === routeDemo.selectedIndex ? '#F59E0B' : 'var(--ln)'}
                    className={`${styles.routeLine} ${index === routeDemo.selectedIndex ? styles.routeLineActive : ''}`}
                    style={routeDemo.lineAnimation?.index === index ? {
                      strokeDasharray: routeDemo.lineAnimation.length,
                      strokeDashoffset: routeDemo.lineAnimation.length * (1 - routeDemo.lineAnimation.progress),
                    } : undefined}
                  />
                );
              })}
              <g className={styles.pinGlyph} transform="translate(10 125) scale(0.325)">
                <g
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="22"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path className={styles.routeBracketPath} d="M66 140V76a10 10 0 0 1 10-10h64" fill="none" stroke="#F59E0B" />
                  <path className={styles.routeBracketPath} d="M260 66h64a10 10 0 0 1 10 10v64" fill="none" stroke="#F59E0B" />
                  <path className={styles.routeBracketPath} d="M66 260v64a10 10 0 0 0 10 10h64" fill="none" stroke="#F59E0B" />
                  <path className={styles.routeBracketPath} d="M260 334h64a10 10 0 0 0 10-10v-64" fill="none" stroke="#F59E0B" />
                </g>
                <path
                  className={styles.routePin}
                  d="M200 92C154 92 118 128 118 174c0 52 56 100 82 126 26-26 82-74 82-126 0-46-36-82-82-82z"
                  fill="url(#hiw-route-pin)"
                  stroke="none"
                />
                <g className={styles.routeFigure} transform="translate(0 -4)" fill="#0F172A" stroke="none">
                  <circle cx="200" cy="154" r="15" fill="#0F172A" stroke="none" />
                  <path d="M180 238V204a20 20 0 0 1 40 0v34a8 8 0 0 1-8 8h-24a8 8 0 0 1-8-8z" fill="#0F172A" stroke="none" />
                </g>
              </g>
              {OFFICES.map((office, index) => {
                const y = 34 + index * 62;
                const isActive = index === routeDemo.selectedIndex;
                return (
                  <g key={office.name}>
                    <g
                      role="button"
                      tabIndex={0}
                      aria-label={office.name}
                      className={`${styles.routeNode} ${isActive ? styles.routeNodeActive : ''}`}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          routeDemo.setSelectedIndex(index);
                        }
                      }}
                      onClick={() => routeDemo.setSelectedIndex(index)}
                    >
                      <circle cx="340" cy={y} r="22" fill={office.color} stroke="none" className={isActive ? styles.officeNodeActive : ''} />
                      <text x="340" y={y + 6} className={styles.officeCount}>{office.categories.length}</text>
                      <text x="376" y={y + 6} className={`${styles.officeLabel} ${isActive ? styles.officeLabelActive : ''}`}>{office.name}</text>
                    </g>
                  </g>
                );
              })}
              {routeDemo.dot && <circle cx={routeDemo.dot.x} cy={routeDemo.dot.y} r="7" fill="#F59E0B" stroke="none" />}
            </svg>
          </div>
        </article>

        <article ref={revealThree.ref} className={`${styles.section} ${revealThree.isVisible ? styles.in : ''}`}>
          <p className={styles.kicker}>Pick on the map</p>
          <h2>Skip the typing.</h2>
          <div className={styles.demoCard} ref={mapDemo.demoRef}>
            <div className={`${styles.demoFormPanel} ${mapDemo.mapVisible ? styles.hiddenForm : ''}`}>
              <div className={styles.formFieldRow}>
                <span className={styles.formLabel}>Landmark</span>
                <div className={styles.formInputWrap}>
                  <span className={styles.formValue}>{mapDemo.landmark}</span>
                  <button type="button" aria-label="Select landmark" className={`${styles.pinButton} ${mapDemo.mapVisible ? styles.pinButtonActive : ''}`} ref={mapDemo.pinRef}>
                    <PinIcon />
                  </button>
                </div>
              </div>
              <div className={styles.formFieldRow}>
                <span className={styles.formLabel}>Category</span>
                <div className={styles.emptyBox} />
              </div>
            </div>
            <div className={`${styles.mapPanel} ${mapDemo.mapVisible ? styles.mapPanelVisible : ''}`}>
              <svg viewBox={`${mapDemo.viewBox.x} ${mapDemo.viewBox.y} ${mapDemo.viewBox.w} ${mapDemo.viewBox.h}`} role="img" aria-label="Campus map preview">
                {MAP_SHAPES.filter((shape) => !shape.id).map((shape, index) => {
                  const shapeClasses = shape.className
                    .split(/\s+/)
                    .map((name) => mapShapeStyles[name])
                    .filter(Boolean);
                  if (shape.strokeLinejoin === 'round') {
                    shapeClasses.push(styles.mapRoadArlegui);
                  }
                  const commonProps = {
                    className: shapeClasses.join(' '),
                    points: shape.points,
                    strokeWidth: shape.strokeWidth,
                  };

                  if (shape.type === 'polygon') {
                    return <polygon key={`${shape.type}-${index}`} {...commonProps} />;
                  }

                  return <polyline key={`${shape.type}-${index}`} {...commonProps} />;
                })}
                <polygon
                  ref={mapDemo.founderRef}
                  points={MAP_SHAPES.find((shape) => shape.id === 'bF')?.points}
                  className={`${styles.mapBuilding} ${mapDemo.selectedBuilding === "Founder's Building" ? styles.mapBuildingSelected : ''}`}
                />
                <polygon
                  ref={mapDemo.arleguiRef}
                  points={MAP_SHAPES.find((shape) => shape.id === 'bA')?.points}
                  className={`${styles.mapBuilding} ${mapDemo.selectedBuilding === 'Arlegui Campus' ? styles.mapBuildingSelected : ''}`}
                />
                {MAP_LABELS.map((label) => (
                  <text key={label.text} className={styles.mapText} x={label.x} y={label.y}>
                    {label.text}
                  </text>
                ))}
              </svg>
              <div className={`${styles.chip} ${mapDemo.chipText ? styles.chipOn : ''}`}>
                <span className={styles.chipIcon} aria-hidden="true"><MapPinBadge /></span>
                <span>{mapDemo.chipText}</span>
              </div>
            </div>
            <span
              className={`${styles.cursor} ${mapDemo.cursorVisible ? styles.cursorOn : ''}`}
              style={{ left: `${mapDemo.cursorPosition.x}px`, top: `${mapDemo.cursorPosition.y}px` }}
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 2l7.5 19 2.6-7.9L21 10.5z" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </span>
            <span
              className={`${styles.ripple} ${mapDemo.rippleVisible ? styles.rippleGo : ''}`}
              style={{ left: `${mapDemo.cursorPosition.x}px`, top: `${mapDemo.cursorPosition.y}px` }}
              aria-hidden="true"
            />
          </div>
          <p className={styles.caption} aria-live="polite">{mapDemo.caption}</p>
        </article>

        <article ref={revealFour.ref} className={`${styles.section} ${revealFour.isVisible ? styles.in : ''}`}>
          <p className={styles.kicker}>Privacy</p>
          <h2>Private by design.</h2>
          <div className={styles.privacyGrid}>
            {PRIVACY_ITEMS.map((item, index) => (
              <div key={item.title} className={styles.privacyItem}>
                <span className={styles.privacyIcon}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {index === 0 && (
                      <path d="M17.9 17.9A10.1 10.1 0 0 1 12 19c-6.5 0-10-7-10-7a17.7 17.7 0 0 1 4.1-4.9M9.9 5.2A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17.8 17.8 0 0 1-2.2 3.2M1 1l22 22" />
                    )}
                    {index === 1 && (
                      <>
                        <rect x="4" y="4" width="16" height="16" rx="4" />
                        <path d="M8 12l3 3 5-6" />
                      </>
                    )}
                    {index === 2 && (
                      <>
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                      </>
                    )}
                  </svg>
                </span>
                <strong>{item.title}</strong>
                <p>{item.line}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
