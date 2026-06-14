"use client";

import { Box, Card, CardContent, Stack, Typography, alpha, useTheme } from "@mui/material";
import type { DashboardSummary } from "@/src/services/dashboardApi";
import type { MetricCardItem } from "./types";
import {
  SEMANTIC_METRIC_COLORS,
  metricValue,
  resolveMetricSemanticColor
} from "./dashboardUtils";

type MetricCardsProps = {
  metrics: MetricCardItem[];
  summary: DashboardSummary;
  columns?: { xs?: string; sm?: string; md?: string; lg?: string };
  elevated?: boolean;
};

export function MetricCards({ metrics, summary, columns, elevated = false }: MetricCardsProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: columns ?? { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
        gap: 2
      }}
    >
      {metrics.map((metric) => {
        const value = metricValue(summary, metric.key);
        const formattedValue = metric.formatValue ? metric.formatValue(value) : String(value);
        const resolvedSemanticColor = resolveMetricSemanticColor(metric, value);
        const metricColor = SEMANTIC_METRIC_COLORS[resolvedSemanticColor];

        return (
          <Card
            key={metric.key}
            variant="outlined"
            sx={{
              borderRadius: elevated ? 4 : 3,
              borderColor: alpha(metricColor, 0.22),
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              ...(elevated
                ? {
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: `0 12px 24px ${alpha(metricColor, 0.12)}`
                    }
                  }
                : {})
            }}
          >
            <CardContent sx={{ p: elevated ? 3 : 1.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
                    {metric.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                    {metric.description}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: elevated ? 48 : 38,
                    height: elevated ? 48 : 38,
                    borderRadius: elevated ? 3 : 2,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: alpha(metricColor, theme.palette.mode === "dark" ? 0.18 : 0.1),
                    color: metricColor,
                    flexShrink: 0
                  }}
                >
                  {metric.icon}
                </Box>
              </Stack>
              <Typography
                variant={elevated ? "h3" : "h4"}
                sx={{ fontWeight: 900, color: metricColor, letterSpacing: "-0.04em" }}
              >
                {formattedValue}
              </Typography>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
