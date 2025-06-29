import {
  Stack,
  Title,
  Paper,
  TextInput,
  Select,
  Stepper,
} from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { AssessmentDatabaseSetup } from "components/assessments/assessment-database";
import { ProblemDescription } from "components/assessments/problem-description";
import { MarkdownEditor } from "components/markdown-editor.tsx";
import { useState } from "react";

export const Route = createFileRoute("/_admin/admin/assessments/create")({
  component: RouteComponent,
});

function RouteComponent() {
  const [active, setActive] = useState<number>(0);
  const nextStep = () => {
    setActive((current) => current + 1);
  };
  const prevStep = () => {
    setActive((current) => current > 0 ? current - 1 : current);
  };

  return (
    <Stepper active={active} onStepClick={setActive} p={20} size="sm">
      <Stepper.Step label={"Problem Details"} description={"Enter the problem details"}>
        <ProblemDescription />
      </Stepper.Step>
      <Stepper.Step label={"Database Setup"} description={"Set up the assessment database"}>
        <AssessmentDatabaseSetup />
      </Stepper.Step>
    </Stepper>
  );
}
