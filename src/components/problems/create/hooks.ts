import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api.ts";

interface SaveProblemMutationProps {
  problemId: string;
  answer: string;
  saveAsTemplate: boolean;
}

export const useSaveUserProblemMutation = () => {
  return useMutation({
    mutationFn: async ({
      problemId,
      answer,
      saveAsTemplate,
    }: SaveProblemMutationProps) => {
      // if saveAsTemplate is true, save to both problem and template tables
      // save to user problem table first
      const response = await api.problems["save-user-problem"].$post({
        json: {
          problemId,
          answer,
          saveAsTemplate,
        },
      });

      if (!response.ok) {
        const errorMsg = await response.text();
        throw new Error(`Failed to save user problem: ${errorMsg}`);
      }
    },
  });
};
