import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendNotification: vi.fn(),
  setVapidDetails: vi.fn(),
  pushFindMany: vi.fn(),
  pushDelete: vi.fn(),
  userFindUnique: vi.fn()
}));

vi.mock("web-push", () => ({
  default: {
    sendNotification: mocks.sendNotification,
    setVapidDetails: mocks.setVapidDetails
  }
}));

vi.mock("@/src/lib/db", () => ({
  db: {
    pushSubscription: {
      findMany: mocks.pushFindMany,
      delete: mocks.pushDelete
    },
    user: {
      findUnique: mocks.userFindUnique
    }
  }
}));

import {
  sendPushNotification,
  sendPushToUser,
  sendPushToUserByEmail
} from "@/src/lib/push";

describe("Push notifications", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.pushDelete.mockResolvedValue(undefined);
  });

  it("sends a push notification with the expected payload", async () => {
    mocks.sendNotification.mockResolvedValue(undefined);

    const result = await sendPushNotification(
      {
        endpoint: "https://push.example.test/subscription-1",
        keys: {
          p256dh: "p256dh-key",
          auth: "auth-key"
        }
      },
      {
        title: "Titulo",
        body: "Mensaje",
        url: "/?tab=notificaciones",
        tag: "flacso-push-test"
      }
    );

    expect(result).toEqual({ success: true });
    expect(mocks.sendNotification).toHaveBeenCalledWith(
      {
        endpoint: "https://push.example.test/subscription-1",
        keys: {
          p256dh: "p256dh-key",
          auth: "auth-key"
        }
      },
      JSON.stringify({
        title: "Titulo",
        body: "Mensaje",
        url: "/?tab=notificaciones",
        tag: "flacso-push-test"
      })
    );
  });

  it("marks expired subscriptions when the push provider returns 410", async () => {
    mocks.sendNotification.mockRejectedValue(
      Object.assign(new Error("Gone"), { statusCode: 410 })
    );

    const result = await sendPushNotification(
      {
        endpoint: "https://push.example.test/subscription-expired",
        keys: {
          p256dh: "expired-p256dh",
          auth: "expired-auth"
        }
      },
      {
        title: "Titulo",
        body: "Mensaje"
      }
    );

    expect(result).toEqual({ success: false, expired: true });
  });

  it("counts successful deliveries and removes expired subscriptions", async () => {
    mocks.pushFindMany.mockResolvedValue([
      {
        id: "sub-ok",
        endpoint: "https://push.example.test/ok",
        p256dh: "ok-p256dh",
        auth: "ok-auth"
      },
      {
        id: "sub-expired",
        endpoint: "https://push.example.test/expired",
        p256dh: "expired-p256dh",
        auth: "expired-auth"
      },
      {
        id: "sub-failed",
        endpoint: "https://push.example.test/failed",
        p256dh: "failed-p256dh",
        auth: "failed-auth"
      }
    ]);

    mocks.sendNotification.mockImplementation(async (subscription: { endpoint: string }) => {
      if (subscription.endpoint.endsWith("/expired")) {
        throw Object.assign(new Error("Gone"), { statusCode: 404 });
      }
      if (subscription.endpoint.endsWith("/failed")) {
        throw new Error("Temporary push failure");
      }
      return undefined;
    });

    const result = await sendPushToUser("user-1", {
      title: "Titulo",
      body: "Mensaje"
    });

    expect(mocks.pushFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1" }
    });
    expect(result).toEqual({ count: 1 });
    expect(mocks.sendNotification).toHaveBeenCalledTimes(3);
    expect(mocks.pushDelete).toHaveBeenCalledWith({
      where: { id: "sub-expired" }
    });
  });

  it("looks up the user by lowercase email before sending push notifications", async () => {
    mocks.userFindUnique.mockResolvedValue({ id: "user-42" });
    mocks.pushFindMany.mockResolvedValue([
      {
        id: "sub-ok",
        endpoint: "https://push.example.test/ok",
        p256dh: "ok-p256dh",
        auth: "ok-auth"
      }
    ]);
    mocks.sendNotification.mockResolvedValue(undefined);

    const result = await sendPushToUserByEmail("WEB@FLACSO.EDU.UY", {
      title: "Titulo",
      body: "Mensaje"
    });

    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { email: "web@flacso.edu.uy" },
      select: { id: true }
    });
    expect(result).toEqual({ count: 1 });
  });
});
