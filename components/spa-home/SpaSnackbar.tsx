import { Alert, Snackbar } from "@mui/material";
import { resolveSnackbarSeverity } from "@/src/lib/spa-home/client-utils";

type SpaSnackbarProps = {
  message: string;
  onClose: () => void;
};

export function SpaSnackbar({ message, onClose }: SpaSnackbarProps) {
  return (
    <Snackbar
      open={Boolean(message)}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      onClose={(_, reason) => {
        if (reason === "clickaway") return;
        onClose();
      }}
      sx={{
        mt: { xs: 7, sm: 8 },
        width: { xs: "calc(100% - 16px)", sm: "auto" },
        maxWidth: { xs: "calc(100% - 16px)", sm: 860 }
      }}
    >
      <Alert
        severity={resolveSnackbarSeverity(message)}
        variant="filled"
        onClose={onClose}
        sx={{
          width: "100%",
          alignItems: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          borderRadius: 2
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
