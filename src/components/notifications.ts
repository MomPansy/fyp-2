import {
  NotificationData,
  NotificationsStore,
  notifications,
} from "@mantine/notifications";

import {
  DEFAULT_ERROR_NOTIFICATION,
  DEFAULT_SUCCESS_NOTIFICATION,
} from "lib/const.ts";

export function showSuccessNotification(
  notificationData: NotificationData = {
    message: DEFAULT_SUCCESS_NOTIFICATION,
  },
  store?: NotificationsStore,
): void {
  notifications.show(
    {
      ...notificationData,
      message: notificationData.message ?? DEFAULT_SUCCESS_NOTIFICATION,
      title: notificationData.title ?? "Success",
      color: notificationData.color ?? "teal",
    },
    store,
  );
}

export function showErrorNotification(
  notificationData: NotificationData = {
    message: DEFAULT_ERROR_NOTIFICATION,
  },
  store?: NotificationsStore,
): void {
  notifications.show(
    {
      ...notificationData,
      message: notificationData.message ?? DEFAULT_ERROR_NOTIFICATION,
      title: notificationData.title ?? "Error",
      color: notificationData.color ?? "red",
    },
    store,
  );
}

export function showWarningNotification(
  notificationData: NotificationData = {
    message: "Warning",
  },
  store?: NotificationsStore,
): void {
  notifications.show(
    {
      ...notificationData,
      message: notificationData.message ?? "Warning",
      title: notificationData.title ?? "Warning",
      color: notificationData.color ?? "yellow",
    },
    store,
  );
}
