import { Box, Stack, Typography } from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import SchoolIcon from "@mui/icons-material/School";
import type { ZoomUpcomingMeeting } from "@/src/services/zoomApi";

type MeetingAssociationProps = {
  meeting: ZoomUpcomingMeeting;
};

export function MeetingAssociation({ meeting }: MeetingAssociationProps) {
  if (!meeting.association.linked) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, color: "warning.main" }}>
        <HistoryIcon sx={{ fontSize: 16 }} />
        <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase" }}>
          Sin asociación
        </Typography>
      </Box>
    );
  }

  const programaNombre = meeting.association.solicitudProgramaNombre?.trim();

  return (
    <Stack spacing={0.5}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, color: "success.main" }}>
        <SchoolIcon sx={{ fontSize: 16 }} />
        <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase" }}>
          Asociada
        </Typography>
      </Box>
      {programaNombre ? (
        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary", lineHeight: 1.2 }}>
          {programaNombre}
        </Typography>
      ) : (
        <Typography variant="caption" color="text.secondary">
          Solicitud: {meeting.association.solicitudId}
        </Typography>
      )}
    </Stack>
  );
}
