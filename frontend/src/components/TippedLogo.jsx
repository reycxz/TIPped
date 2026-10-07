export default function TippedLogo() {
    return (
        <svg className="tipped-logo" viewBox="200 78 500 150" aria-hidden="true" focusable="false">
            <g transform="translate(210 85)" strokeLinecap="round" strokeLinejoin="round">
                <path className="tipped-logo-frame tipped-logo-corner corner-tl" d="M36 7H7v29" fill="none" stroke="#F59E0B" strokeWidth="7" />
                <path className="tipped-logo-frame tipped-logo-corner corner-tr" d="M94 7h29v29" fill="none" stroke="#F59E0B" strokeWidth="7" />
                <path className="tipped-logo-frame tipped-logo-corner corner-bl" d="M7 94v29h29" fill="none" stroke="#F59E0B" strokeWidth="7" />
                <path className="tipped-logo-frame tipped-logo-corner corner-br" d="M123 94v29H94" fill="none" stroke="#F59E0B" strokeWidth="7" />

                <g className="tipped-logo-pin">
                    <path d="M65 110C55 98 33 76 33 56a32 32 0 1 1 64 0c0 20-22 42-32 54Z" fill="#F59E0B" />
                    <rect x="44" y="40" width="42" height="36" rx="2" fill="#C4C7CC" stroke="#0F172A" strokeWidth="1.5" />
                    <path d="M44 40h42v4H44z" fill="#F59E0B" />
                    <path d="M44 44h42v4H44zM44 68h42v8H44z" fill="#0F172A" />
                    <text x="65" y="63" textAnchor="middle" fill="#0F172A" fontFamily="Inter, Segoe UI, sans-serif" fontSize="14" fontWeight="900" letterSpacing="-.5">T.I.P.</text>
                    <path d="M53 72h24" fill="none" stroke="#F59E0B" strokeWidth="1.3" />
                </g>

                <g transform="translate(10 39) scale(1.2)">
                    <g className="tipped-logo-detail tipped-logo-hvac" fill="none" stroke="#F8FAFC" strokeWidth="1.25">
                        <rect x=".8" y="1" width="12.4" height="6" rx="1.3" />
                        <path d="M3 4h8M3.5 9c-.8.6.8 1.2 0 2.3M7 9c-.8.6.8 1.2 0 2.3M10.5 9c-.8.6.8 1.2 0 2.3" />
                        <path d="M3.5 5.6h7" stroke="#F59E0B" />
                    </g>
                </g>

                <g transform="translate(104 39) scale(1.2)">
                    <g className="tipped-logo-detail tipped-logo-bolt">
                        <path d="M8.6 .7 3.2 7h3.1l-1 5.7L10.8 6H7.6Z" fill="#F8FAFC" />
                        <path d="M8.6 .7 3.2 7h3.1l-1 5.7L10.8 6H7.6Z" fill="none" stroke="#0F172A" strokeWidth=".55" />
                    </g>
                </g>

                <g transform="translate(10 75) scale(1.2)">
                    <g className="tipped-logo-detail tipped-logo-chemical" fill="none" stroke="#F8FAFC" strokeWidth="1.25">
                        <path d="M4 1h6M5.5 1v3L2.2 10a1.2 1.2 0 0 0 1 1.8h7.6a1.2 1.2 0 0 0 1-1.8L9 4V1M3.8 8h7" />
                        <path d="M4.5 9.6h5.8" stroke="#F59E0B" />
                    </g>
                </g>

                <g transform="translate(104 75) scale(1.2)">
                    <g className="tipped-logo-detail tipped-logo-flame">
                        <path d="M8 1C8 4 5 4.7 5 7c0 1 .7 1.7.7 1.7S4 7.8 3 6.5C2 8 2 10 3.5 11.4c.8.8 1.8 1.1 3 1.1 3.5 0 5.8-2.2 5.8-5.2C12.3 4.8 10.8 2.8 8 1Z" fill="none" stroke="#F8FAFC" strokeWidth="1.25" />
                        <path d="M7.1 7.2c-1.3 1.5-.8 3 0 3.6 1.1-.4 1.8-1.2 1.8-2.4 0-.8-.4-1.4-1-2-.1.4-.4.6-.8.8Z" fill="#F59E0B" />
                    </g>
                </g>
            </g>

            <text className="tipped-logo-wordmark" x="395" y="176" fontFamily="'Bahnschrift SemiBold', Bahnschrift, 'Segoe UI', sans-serif" fontSize="92" fontWeight="400" letterSpacing="-4">
                <tspan fill="#F59E0B">TIP</tspan><tspan fill="#CBD5E1">ped</tspan>
            </text>
        </svg>
    );
}
