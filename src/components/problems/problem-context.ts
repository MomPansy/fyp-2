import { createContext, useContext } from "react";

interface ProblemContextProps {
    problemId: string;
}

export const ProblemContext = createContext<ProblemContextProps | undefined>(
    undefined,
);

export function useProblemContext() {
    const context = useContext(ProblemContext);
    if (!context) {
        throw new Error(
            "useProblemContext must be used within a ProblemContext.Provider",
        );
    }
    return context;
}
