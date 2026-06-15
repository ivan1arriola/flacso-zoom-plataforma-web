import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import type { ZoomUpcomingMeeting } from "@/src/services/zoomApi";
import { formatZoomDateTime } from "@/components/spa-tabs/spa-tabs-utils";
import type { RegisterUpcomingMeetingForm } from "./types";

type RegisterUpcomingMeetingDialogProps = {
  meeting: ZoomUpcomingMeeting | null;
  form: RegisterUpcomingMeetingForm;
  setForm: Dispatch<SetStateAction<RegisterUpcomingMeetingForm>>;
  programaOptions: string[];
  responsableOptions: Array<{ value: string; label: string }>;
  isSubmitting: boolean;
  canSubmit: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function RegisterUpcomingMeetingDialog({
  meeting,
  form,
  setForm,
  programaOptions,
  responsableOptions,
  isSubmitting,
  canSubmit,
  onClose,
  onSubmit
}: RegisterUpcomingMeetingDialogProps) {
  return (
    <Dialog open={Boolean(meeting)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Registrar reunion en sistema</DialogTitle>
      <Box component="form" onSubmit={onSubmit}>
        <DialogContent dividers>
          <Stack spacing={1.25}>
            <Typography variant="body2" color="text.secondary">
              Se registrará la reunion existente de Zoom sin crear una nueva.
            </Typography>
            <TextField
              label="Reunion seleccionada"
              value={
                meeting
                  ? `${formatZoomDateTime(meeting.startTime)} | ${meeting.topic} | ID ${meeting.meetingId ?? "-"}`
                  : ""
              }
              InputProps={{ readOnly: true }}
            />
            <TextField
              label="Cuenta anfitriona"
              value={meeting?.accountEmail ?? "-"}
              InputProps={{ readOnly: true }}
            />
            {programaOptions.length > 0 ? (
              <TextField
                select
                required
                label="Programa"
                value={form.programaNombre}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    programaNombre: event.target.value
                  }))
                }
              >
                {programaOptions.map((programa) => (
                  <MenuItem key={programa} value={programa}>
                    {programa}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                required
                label="Programa"
                value={form.programaNombre}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    programaNombre: event.target.value
                  }))
                }
              />
            )}
            {responsableOptions.length > 0 ? (
              <TextField
                select
                required
                label="Responsable"
                value={form.responsableNombre}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    responsableNombre: event.target.value
                  }))
                }
              >
                {responsableOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                required
                label="Responsable"
                value={form.responsableNombre}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    responsableNombre: event.target.value
                  }))
                }
              />
            )}
            <TextField
              select
              label="Modalidad"
              value={form.modalidadReunion}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  modalidadReunion: event.target.value as "VIRTUAL" | "HIBRIDA"
                }))
              }
            >
              <MenuItem value="VIRTUAL">Virtual</MenuItem>
              <MenuItem value="HIBRIDA">Hibrida</MenuItem>
            </TextField>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.requiereAsistencia}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      requiereAsistencia: event.target.checked
                    }))
                  }
                />
              }
              label="Requiere asistencia de monitoreo (quedará visible para asistentes Zoom)."
            />
            <TextField
              label="Descripcion (opcional)"
              multiline
              minRows={2}
              value={form.descripcion}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  descripcion: event.target.value
                }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? "Guardando..." : "Registrar"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
