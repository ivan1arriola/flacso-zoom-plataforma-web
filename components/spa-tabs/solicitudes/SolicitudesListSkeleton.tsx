"use client";

import { Box, Paper, Skeleton, Stack } from "@mui/material";
import { alpha } from "@mui/material/styles";

export function SolicitudesListSkeleton() {
  return (
<Stack spacing={2.5}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Paper
                      key={i}
                      variant="outlined"
                      sx={{
                        borderRadius: 3,
                        p: 2.5,
                        borderLeft: "6px solid",
                        borderLeftColor: "divider",
                        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.5)
                      }}
                    >
                      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" sx={{ mb: 2.5 }}>
                        <Box sx={{ flex: 1 }}>
                          <Skeleton variant="text" width="45%" height={32} sx={{ mb: 1 }} animation="wave" />
                          <Stack direction="row" spacing={1}>
                            <Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: 1.5 }} animation="wave" />
                            <Skeleton variant="rounded" width={100} height={24} sx={{ borderRadius: 1.5 }} animation="wave" />
                            <Skeleton variant="rounded" width={90} height={24} sx={{ borderRadius: 1.5 }} animation="wave" />
                          </Stack>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Skeleton variant="rounded" width={100} height={32} sx={{ borderRadius: 2 }} animation="wave" />
                          <Skeleton variant="rounded" width={100} height={32} sx={{ borderRadius: 2 }} animation="wave" />
                        </Stack>
                      </Stack>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          border: "1px solid",
                          borderColor: "divider",
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                          gap: 2.5
                        }}
                      >
                        {[1, 2, 3].map((j) => (
                          <Box key={j}>
                            <Skeleton variant="text" width="30%" animation="wave" />
                            <Skeleton variant="text" width="60%" animation="wave" />
                            <Skeleton variant="text" width="40%" animation="wave" sx={{ mt: 1 }} />
                          </Box>
                        ))}
                      </Box>
                    </Paper>
                  ))}
                </Stack>
  );
}
