import { Group, Text } from "@mantine/core";
import { IconUpload, IconX, IconFile } from "@tabler/icons-react";
import { Dropzone, DropzoneProps, FileWithPath } from "@mantine/dropzone";

interface DropCSVProps extends Partial<DropzoneProps> {
  onDrop: (files: FileWithPath[]) => void;
  accept: string[];
  maxFiles: number;
}

export function DropCSV(props: DropCSVProps) {
  return (
    <Dropzone
      onReject={(files) => console.warn("rejected files", files)}
      {...props}
    >
      <Group justify="center" gap="xl" style={{ pointerEvents: "none" }}>
        <Dropzone.Accept>
          <IconUpload
            size={52}
            color="var(--mantine-color-blue-6)"
            stroke={1.5}
          />
        </Dropzone.Accept>
        <Dropzone.Reject>
          <IconX size={52} color="var(--mantine-color-red-6)" stroke={1.5} />
        </Dropzone.Reject>
        <Dropzone.Idle>
          <IconFile
            size={52}
            color="var(--mantine-color-dimmed)"
            stroke={1.5}
          />
        </Dropzone.Idle>

        <div>
          <Text size="xl" inline>
            Drag and drop CSV files here, or click to select files
          </Text>
          <Text size="sm" c="dimmed" inline mt={7}>
            Attach as many files as you like.
          </Text>
        </div>
      </Group>
    </Dropzone>
  );
}
