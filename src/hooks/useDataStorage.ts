import { useMutation } from "@tanstack/react-query";
import { showErrorNotification } from "components/notifications";
import { useAccessToken, useUser } from "./auth";

export const useDataStorage = () => {
  // Call edge function to get signed upload URL and create bucket
  const initializeUpload = async (
    tableName: string,
    assessmentName: string,
  ) => {
    const { data } = await useAccessToken();
    const userId = await useUser();

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/init-upload`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${data.raw}`,
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

    return await response.json();
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

    // Convert string to Blob for proper upload
    const csvBlob = new Blob([csvString], { type: "text/csv" });
    const formData = new FormData();
    formData.append("file", csvBlob);

    // Upload using the signed URL
    const uploadResponse = await fetch(signedUrl, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload file to storage");
    }

    return { success: true, filePath: path, token };
  };

  // Legacy method kept for backward compatibility (now uses edge function internally)
  const getOrCreateBucket = async () => {
    // This is now handled by the edge function, but we'll keep this method
    // for compatibility. It will be called but the actual bucket creation
    // happens in the uploadFileToStorage method via the edge function.
    const userId = await useUser();

    return { success: true, bucket: { name: userId } };
  };

  // Mutation for bucket creation
  const bucketMutation = useMutation({
    mutationFn: getOrCreateBucket,
    onError: (error: Error) => {
      showErrorNotification({
        title: "Failed to create bucket",
        message: error.message,
      });
    },
  });

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
    getOrCreateBucket: bucketMutation.mutateAsync,
    isBucketLoading: bucketMutation.isPending,
    bucketError: bucketMutation.error,

    // Upload operations (now uses edge function)
    uploadFile: uploadMutation.mutateAsync,
    isUploadLoading: uploadMutation.isPending,
    uploadError: uploadMutation.error,

    // New edge function operations
    initializeUpload: initUploadMutation.mutateAsync,
    isInitLoading: initUploadMutation.isPending,
    initError: initUploadMutation.error,

    // Overall loading state
    isLoading: bucketMutation.isPending || uploadMutation.isPending ||
      initUploadMutation.isPending,
  };
};
