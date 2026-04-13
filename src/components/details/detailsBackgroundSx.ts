export const detailsBackgroundSx = {
  position: "relative",
  isolation: "isolate",
  "&::before": {
    content: '""',
    position: "absolute",
    inset: 0,
    right: { xs: -8, sm: -12, md: -16 },
    backgroundImage: 'url("/background.png")',
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right bottom",
    backgroundSize: {
      xs: "100% auto",
      sm: "100% auto",
      md: "25vw auto",
    },
    opacity: { xs: 0.14, sm: 0.16, lg: 0.2 },
    pointerEvents: "none",
    zIndex: -1,
  },
} as const;
