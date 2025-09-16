import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase.ts";

interface SaveProblemMutationProps {
  problemId: string;
  answer: string;
  saveAsTemplate: boolean;
}

export const useSaveProblemMutation = () => {
  return useMutation({
    mutationFn: async ({
      problemId,
      answer,
      saveAsTemplate,
    }: SaveProblemMutationProps) => {
      // if saveAsTemplate is true, save to both problem and template tables
      // save to user problem table first
      const { data, error: userProblemsError } = await supabase
        .from("user_problems")
        .update({
          answer: answer,
        })
        .eq("id", problemId)
        .select("*, user_problem_tables(*)")
        .single();

      if (userProblemsError) {
        throw new Error(userProblemsError.message);
      }

      // Destructure the data to separate userProblem and userProblemTables
      const { user_problem_tables, ...userProblem } = data;
      const userProblemTables = user_problem_tables;

      if (saveAsTemplate) {
        // Upsert into user_problems (templates table)
        const { error: templateProblemError } = await supabase
          .from("user_problems")
          .upsert(userProblem, {
            onConflict: "id",
          });

        if (templateProblemError) {
          throw new Error(templateProblemError.message);
        }

        // Upsert into user_problem_tables
        // need to also save csv data
        if (userProblemTables.length > 0) {
          const { error: templateProblemTableError } = await supabase
            .from("user_problem_tables")
            .upsert(userProblemTables, {
              onConflict: "id",
            });

          if (templateProblemTableError) {
            throw new Error(templateProblemTableError.message);
          }
        }
      }

      return {
        userProblem,
        userProblemTables,
      };
    },
  });
};
