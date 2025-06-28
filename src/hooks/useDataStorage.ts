import { useMutation } from "@tanstack/react-query";
import { showErrorNotification } from "components/notifications";
import { useAccessToken, useUser } from "./auth";
import { supabase } from "../lib/supabase";

interface signedUploadResponse {
  signedUrl: string;
  token: string;
  path: string;
}

export const useDataStorage = () => {
  const { data: accessTokenData } = useAccessToken();
  const userId = useUser();

  const supabaseUrl = import.meta.env.DEV
    ? "http://127.0.0.1:54321"
    : import.meta.env.VITE_SUPABASE_URL as string;

  // Call edge function to get signed upload URL and create bucket
  const initializeUpload = async (
    tableName: string,
    assessmentName: string,
  ) => {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/init-upload`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessTokenData.raw}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          tableName,
          assessmentName,
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to initialize upload");
    }

    return await response.json() as signedUploadResponse;
  };

  const uploadFileToStorage = async ({
    csvString,
    tableName,
    assessmentName = "data.csv",
  }: {
    csvString: string;
    tableName: string;
    assessmentName?: string;
  }) => {
    // Get signed upload URL from edge function
    const { signedUrl, token, path } = await initializeUpload(
      tableName,
      assessmentName,
    );

    // Convert string to File for proper upload
    const csvFile = new File([csvString], assessmentName, { type: "text/csv" });

    try {
      const { data, error } = await supabase.storage
        .from(userId)
        .uploadToSignedUrl(path, token, csvFile);

      if (error) {
        console.error("❌ Upload failed:", error);
        throw new Error(`Upload failed: ${error.message}`);
      }
    } catch (error) {
      console.error("💥 Upload error:", {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }

    return { success: true, filePath: path, token };
  };

  // Mutation for file upload (now uses edge function)
  const uploadMutation = useMutation({
    mutationFn: uploadFileToStorage,
    onError: (error: Error) => {
      showErrorNotification({
        title: "Failed to upload file",
        message: error.message,
      });
    },
  });

  // Combined mutation that handles both bucket creation and upload
  const initUploadMutation = useMutation({
    mutationFn: async (
      { tableName, assessmentName }: {
        tableName: string;
        assessmentName: string;
      },
    ) => {
      return await initializeUpload(tableName, assessmentName);
    },
    onError: (error: Error) => {
      showErrorNotification({
        title: "Failed to initialize upload",
        message: error.message,
      });
    },
  });

  return {
    // Bucket operations (legacy compatibility)
    // Upload operations (now uses edge function)
    uploadFile: uploadMutation.mutateAsync,
    isUploadLoading: uploadMutation.isPending,
    uploadError: uploadMutation.error,

    // New edge function operations
    initializeUpload: initUploadMutation.mutateAsync,
    isInitLoading: initUploadMutation.isPending,
    initError: initUploadMutation.error,

    // Overall loading state
    isLoading: uploadMutation.isPending ||
      initUploadMutation.isPending,
  };
};
