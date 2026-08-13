
export const sendSuccess = (res, data, statusCode = 200, message = null) => {
  const payload = {
    success: true,
    data,
  };
  if (message) {
    payload.message = message;
  }
  return res.status(statusCode).json(payload);
};
