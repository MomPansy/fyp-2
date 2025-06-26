import {
  Paper,
  Stack,
  Title,
  PillsInput,
  PillsInputField,
  Grid,
  Flex,
  SimpleGrid,
  Select,
  ActionIcon,
  Button,
  Text,
} from "@mantine/core";
import { IconArrowRight, IconTrash } from "@tabler/icons-react";
import { TableManager } from "./table-manager.tsx";

export function AssessmentDatabaseSetup() {
  return (
    <>
      <Paper p={20} withBorder>
        <Stack>
          <Title> Database Setup </Title>
          <TableManager />
          <Title order={3}> Foreign keys </Title>
          <PillsInput label="Tables">
            <PillsInputField placeholder="Tables" />
          </PillsInput>
          <PillsInput label="Select a table to reference to" />
          <Text size="sm">
            Select columns from TABLE_NAME to reference to TABLE_NAME
          </Text>
          <Paper withBorder px={20} py={20}>
            <Grid pb={10}>
              <Grid.Col span={3}>
                <Text size="sm">Table 1</Text>
              </Grid.Col>
              <Grid.Col span={3} />
              <Grid.Col span={3}>
                <Flex justify="flex-end">
                  <Text size="sm">Table 2</Text>
                </Flex>
              </Grid.Col>
              <Grid.Col span={3} />
            </Grid>

            <SimpleGrid cols={4} pb={20}>
              <Select placeholder="---" />
              <Flex justify="center">
                <IconArrowRight size={24} />
              </Flex>
              <Select placeholder="---" />
              <Flex justify="center">
                <ActionIcon>
                  <IconTrash size={24} />
                </ActionIcon>
              </Flex>
            </SimpleGrid>
            <Button>Add another column</Button>
          </Paper>
        </Stack>
      </Paper>
    </>
  );
}
