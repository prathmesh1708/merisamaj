import { axiosPrivate } from './axiosPrivate';

const BASE = '/member/notifications';

export const pushTokenService = {
  registerToken: (fcmToken, deviceType = 'web') =>
    axiosPrivate.post(`${BASE}/push-token`, { fcmToken, deviceType }),

  // headers lets logout pass the auth token explicitly, since storage is cleared right after
  unregisterToken: (fcmToken, headers = {}) =>
    axiosPrivate.delete(`${BASE}/push-token`, { data: { fcmToken }, headers })
};

export default pushTokenService;
