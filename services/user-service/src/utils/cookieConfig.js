export const getCookieOptions = (isLogout = false) => {
  return {
    httpOnly: true,
    secure: true, 
    sameSite: 'none',
    expires: isLogout ? new Date(0) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  };
};