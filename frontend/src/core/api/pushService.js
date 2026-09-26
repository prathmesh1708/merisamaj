import { axiosPrivate } from './axiosPrivate';

const BASE = '/member/notifications';

export const pushTokenService = {
  registerToken: (fcmToken, deviceType = 'web') =>
    axiosPrivate.post(`${BASE}/push-token`, { fcmToken, deviceType }),

  unregisterToken: (fcmToken) =>
    axiosPrivate.delete(`${BASE}/push-token`, { data: { fcmToken } })
};

export default pushTokenService;
