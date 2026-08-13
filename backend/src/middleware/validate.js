
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const validated = schema.parse(dataToValidate);
      req[source] = validated;
      next();
    } catch (error) {
      next(error);
    }
  };
};
