import { Panel } from "react-resizable-panels";
import { SimpleEditor } from "@/components/tiptap/simple/simple-editor.tsx";

interface ProblemDescriptionProps {
  description: string;
  readonly?: boolean;
}

export function ProblemDescription({
  description,
  readonly = true,
}: ProblemDescriptionProps) {
  return (
    <Panel defaultSize={40} minSize={25}>
      <SimpleEditor initialContent={description} readonly={readonly} />
    </Panel>
  );
}
