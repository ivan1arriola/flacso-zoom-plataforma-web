"use client";

import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { DashboardRoleConfig } from "./types";

type DashboardHeaderProps = {
  config: DashboardRoleConfig;
  showActions?: boolean;
  onGoToCreateMeeting?: () => void;
  onGoToAssignAssistants?: () => void;
};

export function DashboardHeader({
  config,
  showActions = false,
  onGoToCreateMeeting,
  onGoToAssignAssistants
}: DashboardHeaderProps) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, background: config.background }}>
      <CardContent>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
        >
          <Box>
            <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 0.5 }}>
              <Box sx={{ display: "grid", placeItems: "center", color: "text.secondary" }}>{config.headerIcon}</Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {config.title}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {config.subtitle}
            </Typography>
          </Box>
          <Chip
            size="medium"
            color={config.status.color}
            label={config.status.label}
            icon={config.status.color === "success" ? <CheckCircleIcon /> : <WarningAmberIcon />}
            sx={{ fontWeight: 700, px: 0.8 }}
          />
        </Stack>
        <Alert severity={config.status.color} sx={{ mt: 1.5 }}>
          {config.status.message}
        </Alert>
        {showActions ? (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.2 }}>
            <Button variant="contained" onClick={onGoToCreateMeeting} disabled={!onGoToCreateMeeting}>
              Crear reuniones
            </Button>
            <Button variant="outlined" onClick={onGoToAssignAssistants} disabled={!onGoToAssignAssistants}>
              Asignar asistentes
            </Button>
          </Stack>
        ) : null}
      </CardContent>
    </Card>
  );
}
