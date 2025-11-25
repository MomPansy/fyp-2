import { useState, useEffect } from "react";
import { Box, Text, Group, Badge } from "@mantine/core";
import { IconClock } from "@tabler/icons-react";

interface AssessmentTimerProps {
  startTime: string | null;
  durationString: string;
  endDate?: string;
  serverTimeOffset: number; // milliseconds difference between server and client
}

export function AssessmentTimer({
  startTime,
  durationString,
  endDate,
  serverTimeOffset,
}: AssessmentTimerProps) {
  const [timeInfo, setTimeInfo] = useState<{
    elapsed: string;
    remaining: string;
    isOvertime: boolean;
  }>(() =>
    calculateTimeInfo(startTime, durationString, endDate, serverTimeOffset),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeInfo(
        calculateTimeInfo(startTime, durationString, endDate, serverTimeOffset),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, durationString, endDate, serverTimeOffset]);

  return (
    <Box>
      <Group gap="xl">
        <Box>
          <Text size="xs" c="dimmed" mb={4}>
            Elapsed
          </Text>
          <Group gap="xs">
            <IconClock size={16} />
            <Text size="sm" fw={500}>
              {timeInfo.elapsed}
            </Text>
          </Group>
        </Box>
        <Box>
          <Text size="xs" c="dimmed" mb={4}>
            Remaining
          </Text>
          <Badge
            color={timeInfo.isOvertime ? "red" : "blue"}
            variant="light"
            size="lg"
          >
            {timeInfo.remaining}
          </Badge>
        </Box>
      </Group>
    </Box>
  );
}

function calculateTimeInfo(
  startTime: string | null,
  durationString: string,
  endDate?: string,
  serverTimeOffset = 0,
): { elapsed: string; remaining: string; isOvertime: boolean } {
  // Get current time adjusted for server offset
  // This prevents students from manipulating their system clock to get more time
  // serverTimeOffset = serverTime - clientTime (calculated when data is fetched)
  // correctedNow = clientTime + serverTimeOffset = actual server time
  const now = new Date(Date.now() + serverTimeOffset);

  if (!startTime) {
    return {
      elapsed: "00:00:00",
      remaining: durationString,
      isOvertime: false,
    };
  }

  const start = new Date(startTime);
  const elapsedMs = now.getTime() - start.getTime();

  // Parse duration string (e.g., "2 hours", "90 minutes", "1 hour 30 minutes")
  const durationMs = parseDuration(durationString);

  // If endDate is provided, use it; otherwise calculate from start + duration
  const end = endDate
    ? new Date(endDate)
    : new Date(start.getTime() + durationMs);
  const remainingMs = end.getTime() - now.getTime();

  const isOvertime = remainingMs < 0;

  return {
    elapsed: formatDuration(Math.max(0, elapsedMs)),
    remaining: isOvertime
      ? `-${formatDuration(Math.abs(remainingMs))}`
      : formatDuration(remainingMs),
    isOvertime,
  };
}

function parseDuration(durationString: string): number {
  // Parse strings like "2 hours", "90 minutes", "1 hour 30 minutes"
  const hourRegex = /(\d+)\s*hours?/i;
  const minuteRegex = /(\d+)\s*minutes?/i;

  const hourMatch = hourRegex.exec(durationString);
  const minuteMatch = minuteRegex.exec(durationString);

  const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
  const minutes = minuteMatch ? parseInt(minuteMatch[1], 10) : 0;

  return (hours * 60 + minutes) * 60 * 1000;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
