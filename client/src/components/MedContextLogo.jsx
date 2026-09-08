export function MedContextLogo({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 96 96"
      role="img"
      aria-label="MedContext logo"
    >
      <defs>
        <linearGradient id="logoFill" x1="18" y1="8" x2="78" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3ec9d6" />
          <stop offset="1" stopColor="#1493a3" />
        </linearGradient>
      </defs>
      <path
        fill="url(#logoFill)"
        d="M18 34c0-12 9.5-22 24-26 4.2-1.1 8.8-1.1 13 0 14.5 4 24 14 24 26v18c0 16.5-12.2 30.8-29.4 35.6-1 .3-2.1.3-3.2 0C29.2 82.8 18 68.5 18 52V34z"
      />
      <path
        fill="#f4fcfd"
        d="M33 30.5c0-1.2.9-2.2 2.1-2.4 5.2-.9 10.4-.9 15.6 0 1.2.2 2.1 1.2 2.1 2.4V52c0 7.2-4.8 13.6-11.8 15.5-.6.2-1.3.2-1.9 0C38 65.6 33 59.2 33 52V30.5z"
      />
      <path
        fill="#1aa6b7"
        d="M43.2 36.2h9.6c.8 0 1.4.6 1.4 1.4v3.1h3.2c.8 0 1.4.6 1.4 1.4v5.6c0 .8-.6 1.4-1.4 1.4h-3.2v3.1c0 .8-.6 1.4-1.4 1.4h-9.6c-.8 0-1.4-.6-1.4-1.4v-3.1h-3.2c-.8 0-1.4-.6-1.4-1.4v-5.6c0-.8.6-1.4 1.4-1.4h3.2v-3.1c0-.8.6-1.4 1.4-1.4z"
      />
      <path
        fill="#1aa6b7"
        d="M28 68.5c8.8 6.2 19.4 8.6 20 8.8h.2c.6-.2 11.2-2.6 20-8.8-6.5 3.4-13.4 5.1-20.1 5.1S34.5 71.9 28 68.5z"
      />
    </svg>
  );
}
