"use client";

import { Box, Skeleton } from "@mui/material";

export function DashboardSkeleton() {
  return (
    <Box sx={{ p: 0 }}>
      <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 4, mb: 3 }} />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 2,
          mb: 4
        }}
      >
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} variant="rectangular" height={120} sx={{ borderRadius: 3 }} />
        ))}
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 3 }}>
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 4 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 4 }} />
      </Box>
    </Box>
  );
}
