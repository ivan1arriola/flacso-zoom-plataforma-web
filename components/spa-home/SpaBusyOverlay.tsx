import {
  Backdrop,
  Box,
  CircularProgress,
  Fade,
  LinearProgress,
  Stack,
  Typography
} from "@mui/material";

type SpaBusyOverlayProps = {
  open: boolean;
  label: string;
};

export function SpaBusyOverlay({ open, label }: SpaBusyOverlayProps) {
  return (
    <>
      <Fade in={open}>
        <LinearProgress
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: (theme) => theme.zIndex.modal + 20,
            height: 3,
            backgroundColor: "transparent",
            "& .MuiLinearProgress-bar": {
              background: "linear-gradient(90deg, #1f4b8f, #f9b503)"
            }
          }}
        />
      </Fade>

      <Backdrop
        open={open}
        sx={{
          zIndex: (theme) => theme.zIndex.modal + 10,
          color: "#fff",
          backdropFilter: "blur(6px)",
          backgroundColor: "rgba(31, 75, 143, 0.15)",
          display: "flex",
          flexDirection: "column",
          gap: 3
        }}
      >
        <Box sx={{ position: "relative", display: "inline-flex" }}>
          <CircularProgress
            size={64}
            thickness={2}
            sx={{ color: "primary.main", opacity: 0.3 }}
          />
          <CircularProgress
            size={64}
            thickness={4}
            sx={{
              color: "primary.main",
              position: "absolute",
              left: 0,
              animationDuration: "800ms",
              [`& .MuiCircularProgress-circle`]: {
                strokeLinecap: "round"
              }
            }}
          />
        </Box>
        <Stack spacing={1} alignItems="center">
          <Typography
            variant="h6"
            sx={{
              color: "primary.main",
              fontWeight: 800,
              textShadow: "0 2px 4px rgba(0,0,0,0.05)"
            }}
          >
            {label}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em"
            }}
          >
            Por favor, espera un momento
          </Typography>
        </Stack>
      </Backdrop>
    </>
  );
}
